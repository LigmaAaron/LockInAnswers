# Challenge & Redemption System Migration Guide

## Overview

This migration moves **three interconnected systems** from localStorage to Supabase in a coordinated phase:

1. **Challenges** (drafts + published) with questions
2. **Sessions** (active/in-progress challenge state)
3. **Redemption** (missed question queue)

They share common identifiers and must remain consistent throughout.

---

## Architecture

### Shared Data-Access Layer

All Supabase operations go through centralized helpers in `lib/`:

- **`lib/challenges.ts`** - Challenge CRUD (save draft, update, publish, fetch)
- **`lib/sessions.ts`** - Session state (save, load, clear)
- **`lib/attempts.ts`** - Completed runs (save attempt, get history)
- **`lib/redemption.ts`** - Redemption queue (load, upsert, remove)

### Fallback & Migration Strategy

During migration, we use **dual-write pattern**:

- **Write to both localStorage AND Supabase**
- **Read from Supabase first, fallback to localStorage**
- **Gradual phase-out of localStorage** as backend stabilizes

Helper functions in `utils/` support both:

- `session.ts` → `setCurrentSessionWithBackend()`, `getCurrentSessionWithFallback()`
- `redemption.ts` → `upsertMistakesToRedemptionWithBackend()`, `getRedemptionQueueWithBackend()`

---

## Database Schema

### Tables

#### `challenges`
- Stores challenge metadata (title, description, mode, settings, status)
- Status: `draft` | `published`
- Creator ownership via `creator_id`
- RLS: Published readable by all; drafts readable by creator only

#### `challenge_questions`
- Questions within a challenge
- Ordered by `question_order`
- Stores `options` (JSONB array) and `correct_index`
- RLS: Readable if parent challenge is readable

#### `challenge_sessions`
- Active in-progress challenge sessions
- One unique per (user_id, challenge_id)
- Stores current progress, answers, score, streak
- Upsert on any update to prevent duplicates

#### `challenge_attempts`
- Completed challenge runs (historical)
- Stores final score, accuracy, confidence metrics
- Used for leaderboards and stats

#### `attempt_answers`
- Per-question results from completed attempts
- Linked to both attempt and question
- Stores selected answer, confidence, correctness, points

#### `redemption_items`
- User's missed-question queue
- Unique per (user_id, question_id, challenge_id)
- Type: `wrong_high_conf` | `wrong` | `low_conf_correct`
- Tracks times_missed, last_missed_at, high_confidence_mistake flag

---

## Data Flow

### Challenge Creation & Publishing

```
CreateQuizPage
  ↓
  lib/challenges.saveDraft()  
  └─→ Insert into challenges table
      + Insert questions into challenge_questions
  ↓
  (User edits)
  ↓
  lib/challenges.updateDraft()
  └─→ Update challenges + delete/re-insert questions
  ↓
  (User publishes)
  ↓
  lib/challenges.publishChallenge()
  └─→ Update status to 'published'
```

### Session State (In-Progress)

```
PlayQuizPage
  ↓ (on answer, on next question, on refresh)
  ↓
  setCurrentSessionWithBackend(userId, session)
  ├─→ localStorage.setItem (immediate, for resilience)
  ├─→ lib/sessions.saveSession (async, Supabase)
  └─→ Continue even if backend fails
  
  (on complete)
  ↓
  clearCurrentSessionWithBackend(userId, challengeId)
  ├─→ localStorage.removeItem
  └─→ lib/sessions.clearSession (async)
```

### Completion → Attempts & Redemption

```
PlayQuizPage (on challenge completion)
  ↓
  lib/attempts.saveAttempt()
  └─→ Insert into challenge_attempts + attempt_answers
  ↓
  upsertMistakesToRedemptionWithBackend(userId, challenge, answers)
  ├─→ Update localStorage redemption queue
  └─→ lib/redemption.upsertRedemptionItems() (async)
      └─→ Upsert redemption_items (handles duplicates via UNIQUE constraint)
          └─→ Trim if exceeds MAX_REDEMPTION_ITEMS
```

### Redemption Queue Loading

```
DailyReviewPage / RedemptionPlayPage
  ↓
  getRedemptionQueueWithBackend(userId)
  ├─→ Try lib/redemption.loadRedemptionQueue()
  └─→ Fallback to localStorage on error
  ↓
  Render queue sorted by: type (priority) > timesMissed > lastMissedAt
```

### Redemption Item Removal (On Success)

```
PlayQuizPage (redemption mode, user succeeds)
  ↓
  removeRedemptionItemsWithBackend(userId, [item])
  ├─→ Remove from localStorage
  └─→ lib/redemption.removeSingleRedemptionItem() (async)
```

---

## Type Conversions

### Challenge (App ↔ DB)

**App Format** (`Challenge`):
```typescript
{
  id, title, description, questionCount, estimatedMinutes,
  createdBy, createdAt, updatedAt,
  status: 'draft' | 'published',
  mode: 'study' | 'competitive' | 'casual',
  questions: QuizQuestion[],
  settings: { timer, leaderboard, timerSeconds },
  trackMistakesForRedemption, isVerified
}
```

**DB Format** (`ChallengeDB`):
```typescript
{
  id, creator_id, title, description,
  status, mode, question_count, estimated_minutes,
  timer_enabled, timer_seconds, leaderboard_enabled,
  track_mistakes_for_redemption, is_verified,
  created_at, updated_at
}
```

**Conversion**:
- `questionCount` ↔ `question_count`
- `estimatedMinutes` ↔ `estimated_minutes`
- `createdBy` ↔ `creator_id`
- `createdAt` / `updatedAt` ↔ DB timestamps
- Questions loaded separately from `challenge_questions` table

### Session

**App Format** (`CurrentSession`):
```typescript
{ challengeId, currentQuestionIndex, answersSoFar, timestamp }
```

**DB Format** (`ChallengeSessionDB`):
```typescript
{
  id, user_id, challenge_id, 
  current_question_index, answers_so_far,
  current_score, current_streak,
  created_at, updated_at
}
```

### Redemption Item

**App Format** (`RedemptionQueueItem`):
```typescript
{
  questionId, challengeId, questionData: QuizQuestion,
  timesMissed, lastMissedAt, type, reason, highConfidenceMistake
}
```

**DB Format** (`RedemptionItemDB`):
```typescript
{
  id, user_id, question_id, challenge_id,
  type, times_missed, high_confidence_mistake, last_missed_at,
  created_at, updated_at
}
```

---

## Implementation Checkpoints

### Checkpoint 1: Challenges ✓
- [ ] Verify Supabase migrations applied
- [ ] Test `lib/challenges.ts` functions:
  - `saveDraft()` → Insert new draft with questions
  - `updateDraft()` → Modify existing draft
  - `publishChallenge()` → Change status to published
  - `fetchAllChallenges()` → Load published + user's drafts
  - `fetchChallengeDetail()` → Load single challenge with questions
- [ ] CreateQuizPage uses backend
- [ ] LibraryPage displays backend challenges

### Checkpoint 2: Sessions
- [ ] Update `PlayQuizPage` to use `setCurrentSessionWithBackend()`
- [ ] Test resume: Clear localStorage, reload page, session loads from DB
- [ ] Test refresh: Mid-challenge refresh preserves progress
- [ ] Test completion: Session clears after challenge complete

### Checkpoint 3: Attempts
- [ ] On challenge completion, call `lib/attempts.saveAttempt()`
- [ ] Verify attempt and per-question answers saved

### Checkpoint 4: Redemption
- [ ] On attempt completion, call `upsertMistakesToRedemptionWithBackend()`
- [ ] Verify redemption items inserted with correct type/priority
- [ ] Test queue loading from backend
- [ ] Test item removal on redemption success

### Checkpoint 5: Cleanup
- [ ] Remove localStorage fallback code (once stable)
- [ ] Remove dual-write pattern
- [ ] Archive migration utilities

---

## Error Handling & Resilience

### Strategy

1. **Backend failures are non-blocking**
   - If Supabase call fails, operation continues with localStorage
   - Errors logged to console for monitoring

2. **Data consistency**
   - Upserts prevent duplicate redemption items
   - UNIQUE constraints enforce (user_id, challenge_id) for sessions
   - LocalStorage acts as immediate failsafe

3. **Retries**
   - No automatic retries yet; consider adding with exponential backoff

### Example

```typescript
export const saveSession = async (userId, challengeId, ...) => {
  // Always save locally first (fast, resilient)
  storage.set(CURRENT_SESSION_KEY, session)

  // Try backend (fire-and-forget during migration)
  if (userId) {
    try {
      await lib_sessions.saveSession(...)
    } catch (error) {
      console.warn('Backend save failed:', error)
      // Continue—localStorage has it
    }
  }
}
```

---

## Performance Considerations

1. **Batch Operations**
   - Questions loaded with challenge in single JOIN query
   - Attempt answers loaded with attempt query

2. **Caching**
   - Challenge list cached in React context (AppDataContext)
   - Per-page caching via useMemo where appropriate

3. **Indexes**
   - `challenges(creator_id, status)` for user drafts
   - `redemption_items(user_id, type, updated_at)` for queue sorting

4. **RLS Overhead**
   - RLS filters enforced per query
   - Acceptable for user-scoped data (sessions, attempts, redemption)
   - Published challenges bypass most RLS checks

---

## Testing Checklist

- [ ] Create draft, verify in Supabase
- [ ] Edit draft, verify questions updated
- [ ] Publish, verify status changed, not in draft list
- [ ] Load challenge detail, verify questions present
- [ ] Start challenge, refresh, verify session preserved
- [ ] Complete challenge, verify:
  - Session cleared
  - Attempt created with score/accuracy
  - Attempt answers created per question
  - Redemption items created with correct type
- [ ] Load redemption queue, verify sorted by type > timesMissed > lastMissedAt
- [ ] Complete redemption question (low_conf_correct), verify item removed
- [ ] Verify all operations work without internet (localStorage fallback)

---

## Migration Timeline

### Phase 1 (Now)
- Supabase schema created
- Data-access layer built
- Helpers support dual-write

### Phase 2
- Challenge system integrated into pages
- Test create/publish/load flows

### Phase 3
- Session system integrated
- Test resume/refresh

### Phase 4
- Attempts + Redemption integrated
- Test end-to-end challenge completion → redemption flow

### Phase 5
- Monitor for errors/inconsistencies
- Remove localStorage fallback once stable
- Remove dual-write code

---

## Rollback Plan

If issues arise:

1. Disable backend reads (return localStorage-only)
2. Disable backend writes (keep localStorage)
3. Restore localStorage-only behavior
4. Debug backend issue offline
5. Re-enable gradually

Fallback functions already exist for this purpose.

---

## References

- [Supabase Docs](https://supabase.com/docs)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Upsert Pattern](https://supabase.com/docs/reference/javascript/upsert)
