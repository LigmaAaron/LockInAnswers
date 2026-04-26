# Coordinated Migration Implementation Summary

## What's Been Built

This coordinated migration establishes a **single unified backend data model** for three interconnected systems:

### 1. **Supabase Database Schema** ✅
   - **`challenges`** - Challenge metadata, status (draft/published), creator ownership
   - **`challenge_questions`** - Individual questions with answers, ordered
   - **`challenge_sessions`** - Active/in-progress challenge state per user
   - **`challenge_attempts`** - Completed challenge runs (historical)
   - **`attempt_answers`** - Per-question results from completed runs
   - **`redemption_items`** - Missed-question queue with priority/type tracking

   **Key Design**:
   - All entities share common IDs (challenge_id, question_id)
   - RLS policies enforce creator/user ownership
   - Unique constraints prevent duplicates (sessions, redemption items)
   - Indexes optimized for common queries (by creator, by user, sorted by date)

### 2. **Shared Data-Access Layer** ✅
   - **`lib/challenges.ts`** (8 functions)
     - `saveDraft()` - Create new draft with questions
     - `updateDraft()` - Modify existing draft
     - `publishChallenge()` - Publish draft (status → published)
     - `fetchAllChallenges()` - Load published + user's drafts
     - `fetchChallengeDetail()` - Load single with questions
     - `getCreatorDrafts()` / `getCreatorPublished()` - Scoped queries
     - `deleteDraft()` - Remove draft
   
   - **`lib/sessions.ts`** (4 functions)
     - `saveSession()` - Upsert active session
     - `loadSession()` - Fetch session for user+challenge
     - `clearSession()` - Remove on completion/restart
     - `getUserSessions()` - List all active sessions
   
   - **`lib/attempts.ts`** (3 functions)
     - `saveAttempt()` - Insert completed run + per-question answers
     - `getAttemptHistory()` - Load user's completed attempts
     - `getAttemptDetail()` - Fetch single attempt with full question data
   
   - **`lib/redemption.ts`** (6 functions)
     - `loadRedemptionQueue()` - Fetch user's redemption queue with questions
     - `upsertRedemptionItems()` - Add/update items from attempt
     - `removeRedemptionItems()` / `removeSingleRedemptionItem()` - Remove on success
     - `getRedemptionItemCount()` - Queue size
     - Plus: priority sorting, type resolution logic

### 3. **Updated Helper Utilities** ✅
   - **`utils/session.ts`** - New backend-aware functions
     - `getCurrentSessionWithFallback()` - Try backend, fallback localStorage
     - `setCurrentSessionWithBackend()` - Write to both
     - `clearCurrentSessionWithBackend()` - Clear from both
   
   - **`utils/redemption.ts`** - New backend-aware functions
     - `getRedemptionQueueWithBackend()` - Try backend, fallback localStorage
     - `upsertMistakesToRedemptionWithBackend()` - Dual write
     - `removeRedemptionItemsWithBackend()` - Remove from both

### 4. **Enhanced TypeScript Types** ✅
   - `ChallengeDB`, `ChallengeDetailDB` - Database schema types
   - `ChallengeQuestion` - Question DB type
   - `ChallengeSessionDB`, `ChallengeAttemptDB`, `AttemptAnswerDB`
   - `RedemptionItemDB` - Redemption DB type
   - Transformation helpers: `questionToDb()`, `questionFromDb()`

### 5. **Comprehensive Documentation** ✅
   - **`MIGRATION_GUIDE.md`** - Full technical reference
     - Architecture overview
     - Database schema details
     - Data flow diagrams
     - Type conversions
     - Implementation checkpoints
     - Testing checklist
     - Error handling & resilience strategy

---

## Key Design Principles Implemented

### ✅ Shared Canonical Identifiers
- All systems use the same `challenge_id`, `question_id` keys
- No duplication or divergence possible
- Sessions reference real challenge records
- Redemption items reference real question records

### ✅ One Unified Data Model
- Related data stored in relational tables, not denormalized blobs
- Questions stored separately with order, not embedded in challenges (except in cache)
- Per-question results in separate table for scalability
- Redemption items minimal: (user, question, challenge, type, metadata)

### ✅ Coordinated Persistence
- Challenge content → Challenges + ChallengeQuestions tables
- Session state → ChallengeSessions table (upsert prevents duplicates)
- Completed runs → ChallengeAttempts + AttemptAnswers tables
- Redemption queue → RedemptionItems table (upsert prevents duplicates)

### ✅ Non-Blocking Migration
- Dual-write pattern during transition
- All Supabase failures are non-blocking (logged but continue)
- LocalStorage remains immediately available
- Zero UX regression

### ✅ Shared Type Layer
- All DB operations use same `Channel` query interface
- No scattered SQL strings across pages
- Single source of truth for transformations
- Easy to test and maintain

---

## Preserved Product Behaviors

✅ **Challenges**
- Drafts still work independently
- Published vs. draft separation maintained
- Creator ownership enforced
- Starter challenges still seed on first load (from AppDataContext)

✅ **Sessions**
- Refresh/leave preserves progress
- Resume works as before
- Score/streak state maintained
- Session cleared on completion

✅ **Redemption**
- Queue sorting: type priority > times_missed > last_missed_at
- Low confidence correct capped at 3 per session
- Max queue size capped at 75
- Upsert deduplication (one item per challenge:question)
- Item removal on success

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      React Components                        │
│  (CreateQuizPage, LibraryPage, PlayQuizPage, etc.)          │
└───────────┬───────────────────────────────────────────┬─────┘
            │                                           │
    ┌───────▼────────┐                         ┌───────▼──────┐
    │  utils/        │                         │  utils/      │
    │  session.ts    │                         │  redemption  │
    │  (dual-write)  │                         │  .ts (dual)  │
    └───────┬────────┘                         └───────┬──────┘
            │                                           │
    ┌───────▼────────────────────────────────────────────┴──────┐
    │  Shared Data-Access Layer (lib/)                          │
    │  ┌──────────────┐ ┌──────────┐ ┌─────────┐ ┌───────────┐ │
    │  │ challenges.ts│ │sessions  │ │attempts │ │redemption│ │
    │  │              │ │.ts       │ │.ts      │ │.ts       │ │
    │  │ 8 functions  │ │4 funcs   │ │3 funcs  │ │6 funcs   │ │
    │  └──────────────┘ └──────────┘ └─────────┘ └───────────┘ │
    │  ─────────────────────────────────────────────────────── │
    │  • All read/write Supabase via lib/supabase.ts           │
    │  • Handle type conversions                                │
    │  • Enforce consistency across domains                     │
    └───────┬──────────────────────────────────────────────────┘
            │
    ┌───────▼──────────────────────────────────────┐
    │         Supabase Backend                      │
    │  ┌──────────┬──────────┬──────────────────┐  │
    │  │Challenges│ Sessions │ Attempts         │  │
    │  │+Questions│(upsert) │ +Answers         │  │
    │  │          │          │ +Redemption Items│  │
    │  └──────────┴──────────┴──────────────────┘  │
    │  ─────────────────────────────────────────── │
    │  • RLS enforces ownership                    │
    │  • UNIQUE constraints prevent duplicates     │
    │  • Indexes for performance                   │
    └───────────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  LocalStorage (Fallback during migration)
│  • lia-challenges                       │
│  • lia-current-session                  │
│  • lia-redemption-queue                 │
│  • (Other non-migrated keys)            │
└─────────────────────────────────────────┘
```

---

## What Happens When User...

### Creates a Challenge
```
CreateQuizPage
  → saveDraft(userId, {title, description, questions, ...})
    → INSERT challenges + challenge_questions
    → Return new Challenge with backend ID
  → Store in AppDataContext
  → Navigate to Library
```

### Publishes a Challenge
```
CreateQuizPage (user clicks Publish)
  → publishChallenge(challengeId, userId)
    → UPDATE challenges SET status='published'
    → Return published Challenge
  → Update AppDataContext
```

### Plays a Challenge
```
PlayQuizPage
  → fetch challenge + questions from AppDataContext
  → load session: setCurrentSessionWithBackend(userId, session, score, streak)
    → Save to localStorage (immediate)
    → Async save to Supabase (backend)
  → On next question: repeat save
  → On complete:
    → saveAttempt(userId, challengeId, answers, details)
      → INSERT challenge_attempts + attempt_answers
    → upsertMistakesToRedemptionWithBackend(userId, challenge, answers)
      → INSERT/UPDATE redemption_items
    → clearCurrentSessionWithBackend(userId, challengeId)
      → DELETE from challenge_sessions
```

### Redeems Missed Questions
```
RedemptionPage
  → getRedemptionQueueWithBackend(userId)
    → SELECT * FROM redemption_items WHERE user_id=?
    → With full question data
  → Play like normal challenge
  → On complete, if user succeeds:
    → removeRedemptionItemsWithBackend(userId, [item])
      → DELETE from redemption_items
```

---

## Next Steps: Page Integration

### 1. CreateQuizPage Integration
**File**: `src/pages/CreateQuizPage.tsx`

Current: Calls `addChallenge()` / `updateChallenge()` from AppDataContext
Needed: Migrate to use backend helpers

```diff
- const { addChallenge, updateChallenge } = useAppData()
+ const { addChallenge, updateChallenge } = useAppData()
+ import { saveDraft, updateDraft, publishChallenge } from '../lib/challenges'

  const handleSave = async () => {
    try {
+     const result = await saveDraft(currentUser.id, draftData)
      // Store in context for UI
      addChallenge(result)
    } catch (error) { ... }
  }
  
  const handlePublish = async () => {
    try {
+     const result = await publishChallenge(challengeId, currentUser.id)
      // Update context
      updateChallenge(result)
    } catch (error) { ... }
  }
```

### 2. PlayQuizPage Integration
**File**: `src/pages/PlayQuizPage.tsx`

Current: Calls `setCurrentSession()` / `clearCurrentSession()`
Needed: Switch to backend-aware versions

```diff
- import { getCurrentSession, setCurrentSession, clearCurrentSession } from '../utils/session'
+ import { 
+   getCurrentSession,
+   setCurrentSessionWithBackend,
+   clearCurrentSessionWithBackend 
+ } from '../utils/session'

  // On session update
- setCurrentSession({ challengeId, currentQuestionIndex, answersSoFar, timestamp })
+ await setCurrentSessionWithBackend(
+   currentUser.id,
+   { challengeId, currentQuestionIndex, answersSoFar, timestamp },
+   currentScore,
+   currentStreak
+ )

  // On completion
- clearCurrentSession()
+ await clearCurrentSessionWithBackend(currentUser.id, challengeId)
+ const attemptId = await saveAttempt(...)
+ await upsertMistakesToRedemptionWithBackend(...)
```

### 3. LibraryPage Integration
**File**: `src/pages/LibraryPage.tsx`

Current: Loads challenges from AppDataContext
Needed: Already works if AppDataContext fetches from backend

### 4. AppDataContext Integration
**File**: `src/context/AppDataContext.tsx`

Current: Loads/saves challenges via localStorage
Needed: Switch to backend helpers, keep context as cache layer

```diff
+ import { fetchAllChallenges } from '../lib/challenges'

  const loadChallenges = async () => {
-   const saved = storage.get(CHALLENGES_KEY, [])
-   setChallengeMap(createInitialChallengeMap(saved))
+   try {
+     const backendChallenges = await fetchAllChallenges(currentUser?.id)
+     // Convert to map
+     const map = {}
+     backendChallenges.forEach(c => map[c.id] = c)
+     setChallengeMap(map)
+   } catch (error) {
+     console.error('Failed to fetch challenges, using localStorage')
+     const saved = storage.get(CHALLENGES_KEY, [])
+     setChallengeMap(createInitialChallengeMap(saved))
+   }
  }

  // On mount
  useEffect(() => {
    if (currentUser) {
      loadChallenges()
    }
  }, [currentUser?.id])
```

---

## Migration Phases Remaining

### Phase 1: Create Page Integration
- [ ] CreateQuizPage → lib/challenges
- [ ] Test save draft, update draft, publish
- [ ] Verify questions saved correctly
- [ ] Test editing drafts
- [ ] Verify published can't be edited

### Phase 2: Library Page Integration
- [ ] AppDataContext.fetchAllChallenges() → lib/challenges
- [ ] Load published + user's drafts
- [ ] Display drafts section
- [ ] Test resume from session

### Phase 3: Play Page Integration
- [ ] PlayQuizPage → lib/sessions + lib/attempts + lib/redemption
- [ ] Session save/load on refresh
- [ ] Attempt save on completion
- [ ] Redemption upsert
- [ ] Test resume functionality

### Phase 4: Redemption Integration
- [ ] RedemptionPage → lib/redemption.loadRedemptionQueue()
- [ ] Load queue with questions
- [ ] Play redemption questions
- [ ] Remove on success
- [ ] Verify queue updated

### Phase 5: Cleanup
- [ ] Remove localStorage fallback code
- [ ] Remove dual-write helpers
- [ ] Update utilities to use backend-only
- [ ] Remove starter challenges migration if desired
- [ ] Performance testing

---

## Testing Strategy

### Unit Tests (lib/)
```typescript
// lib/challenges.test.ts
describe('saveDraft', () => {
  it('creates challenge with questions', async () => {
    const result = await saveDraft(userId, { title, questions })
    expect(result.id).toBeDefined()
    expect(result.questions).toHaveLength(3)
  })
})
```

### Integration Tests (pages)
```typescript
// CreateQuizPage.integration.test.tsx
describe('CreateQuizPage', () => {
  it('saves draft to Supabase', async () => {
    render(<CreateQuizPage />)
    fillForm({ title: 'Test', questions: [...] })
    clickSave()
    await waitFor(() => expect(supabase.from).toHaveBeenCalled())
  })
})
```

### E2E Tests (full flow)
```typescript
// cypress/e2e/challenge-flow.cy.ts
describe('Full Challenge Flow', () => {
  it('creates, publishes, plays, completes challenge', () => {
    cy.visit('/create')
    // Create...
    cy.visit('/library')
    // Play...
    cy.visit('/play/challenge-id')
    // Complete...
    cy.contains('Redemption items created')
  })
})
```

---

## Performance Notes

### Queries Optimized
- `fetchAllChallenges()` - Joins questions in one query
- `loadRedemptionQueue()` - Joins questions and sorts in DB
- `getAttemptDetail()` - Joins questions for full data
- Indexes on (creator_id, status), (user_id, type, updated_at)

### Caching Strategy
- AppDataContext caches challenge list (reload on mount)
- Per-page caching via useMemo()
- Consider SWR/React Query for automatic sync

### Expected Performance
- Challenge list: < 200ms (published + user drafts)
- Session save: < 100ms (async, non-blocking)
- Redemption load: < 200ms (with questions)
- Attempt save: < 150ms (with per-question answers)

---

## Rollback Plan

If issues arise:

1. **Disable Backend Reads**
   ```typescript
   // In lib/challenges.ts
   if (DISABLE_BACKEND) return localStorage.get(...)
   ```

2. **Disable Backend Writes**
   ```typescript
   // In utils/session.ts
   if (DISABLE_BACKEND) {
     storage.set(...)
     return // Skip backend
   }
   ```

3. **Force localStorage-only**
   Set feature flag, reload app, revert to old helpers

4. **Debug offline**
   - Check Supabase logs for RLS errors
   - Verify auth token forwarding
   - Check network tab for failed requests

5. **Re-enable gradually**
   - Start with read-only (load)
   - Then write (save)
   - Monitor for errors

---

## Summary Statistics

| Item | Count |
|------|-------|
| Supabase tables | 6 |
| TypeScript types | 12+ |
| Data-access functions | 21 |
| Helper utilities | 9 |
| Index definitions | 8 |
| RLS policies | 8 |
| Documentation pages | 2 |
| Zero breaking changes | ✓ |
| Zero UI changes | ✓ |
| Non-blocking migration | ✓ |

---

**Status**: ✅ **Ready for Page Integration**

All infrastructure is in place. Next phase is integrating these helpers into the React components, starting with CreateQuizPage, then PlayQuizPage, then AppDataContext.
