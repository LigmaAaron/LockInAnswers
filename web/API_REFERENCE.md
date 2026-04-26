# Quick Reference: Data-Access API

## Challenge Operations

### lib/challenges.ts

```typescript
// Create new draft
const draft = await saveDraft(userId, {
  title: string
  description: string
  questions: QuizQuestion[]
  mode: ChallengeMode
  settings: ChallengeSettings
  estimatedMinutes: number
  trackMistakesForRedemption: boolean
})

// Update existing draft
const updated = await updateDraft(challengeId, userId, {
  title?: string
  description?: string
  questions?: QuizQuestion[]
  mode?: ChallengeMode
  settings?: ChallengeSettings
  estimatedMinutes?: number
  trackMistakesForRedemption?: boolean
})

// Publish a draft
const published = await publishChallenge(challengeId, userId)

// Load all challenges (published + user's drafts)
const all = await fetchAllChallenges(userId)  // userId optional

// Load single challenge with questions
const challenge = await fetchChallengeDetail(challengeId, userId)

// Get user's drafts
const drafts = await getCreatorDrafts(userId)

// Get user's published challenges
const published = await getCreatorPublished(userId)

// Delete draft
const success = await deleteDraft(challengeId, userId)
```

---

## Session Operations

### lib/sessions.ts

```typescript
// Save/update active session (upsert)
const session = await saveSession(
  userId: string,
  challengeId: string,
  currentQuestionIndex: number,
  answersSoFar: SessionAnswer[],
  currentScore: number,
  currentStreak: number
)

// Load active session for a challenge
const session = await loadSession(userId, challengeId)  // null if not found

// Clear session (on completion or restart)
await clearSession(userId, challengeId)

// Get all active sessions for user
const sessions = await getUserSessions(userId)
```

---

## Attempt Operations

### lib/attempts.ts

```typescript
// Save completed challenge run
const attemptId = await saveAttempt(
  userId: string,
  challengeId: string,
  userName: string,
  challengeTitle: string,
  score: number,
  correct: number,
  total: number,
  averageConfidence: number,
  confidenceAccuracy: number,
  answers: SessionAnswer[],
  answerDetails: Array<{
    questionId: string
    selectedIndex: number
    correctIndex: number
    confidence: number
    isCorrect: boolean
    pointsEarned: number
  }>
)

// Get user's attempt history (optional: filtered by challengeId)
const attempts = await getAttemptHistory(
  userId: string,
  challengeId?: string,
  limit?: number  // default 10
)

// Get single attempt with full details
const attempt = await getAttemptDetail(attemptId, userId)  // null if not found
```

---

## Redemption Operations

### lib/redemption.ts

```typescript
// Load redemption queue with full question data
const queue = await loadRedemptionQueue(userId)
// Sorted by: type (priority) > timesMissed > lastMissedAt
// Each item includes: { questionId, challengeId, questionData, type, ... }

// Upsert items after challenge completion
const addedOrUpdated = await upsertRedemptionItems(
  userId: string,
  challengeId: string,
  answers: SessionAnswer[],
  questionDataMap: Map<string, QuizQuestion>
)
// Handles:
// - Determining type from answer (wrong_high_conf, wrong, low_conf_correct)
// - Incrementing timesMissed for incorrect answers
// - Capping low_conf_correct at 3 per session
// - Upsert prevents duplicates
// - Trims queue to MAX_REDEMPTION_ITEMS (75)

// Remove completed items
await removeRedemptionItems(userId, itemsToRemove)
// Or single item:
await removeSingleRedemptionItem(userId, item)

// Get queue size
const count = await getRedemptionItemCount(userId)
```

---

## Migration Helper Utilities

### utils/session.ts

```typescript
// Load session with backend support (try backend, fallback localStorage)
const session = await getCurrentSessionWithFallback(userId)

// Save session to both localStorage and backend
await setCurrentSessionWithBackend(userId, session, currentScore, currentStreak)

// Clear session from both
await clearCurrentSessionWithBackend(userId, challengeId)
```

### utils/redemption.ts

```typescript
// Load queue with backend support
const queue = await getRedemptionQueueWithBackend(userId)

// Upsert items with backend support (dual write)
const added = await upsertMistakesToRedemptionWithBackend(userId, challenge, answers)

// Remove items with backend support (dual delete)
await removeRedemptionItemsWithBackend(userId, itemsToRemove)
```

---

## Error Handling

All functions throw `Error` with descriptive message:

```typescript
try {
  const draft = await saveDraft(userId, draftData)
} catch (error) {
  console.error('Failed to save draft:', error.message)
  // Handle error
}

// With migration helpers (dual-write):
await setCurrentSessionWithBackend(userId, session, score, streak)
// ✓ If localStorage succeeds but backend fails: continues (logged but not thrown)
// ✓ If backend fails entirely: falls back to localStorage
// ✓ No UX impact—user doesn't see the error
```

---

## TypeScript Integration

```typescript
import type {
  Challenge,
  ChallengeSession,
  CurrentSession,
  ChallengeRun,
  RedemptionQueueItem,
  SessionAnswer,
  QuizQuestion,
} from '../types/models'

import {
  saveDraft,
  publishChallenge,
  fetchAllChallenges,
} from '../lib/challenges'

// All functions are fully typed
// IDE autocomplete works for all parameters and return values
```

---

## Common Patterns

### Pattern 1: Create and Publish Challenge

```typescript
const draft = await saveDraft(userId, {
  title: 'My Challenge',
  description: 'A great challenge',
  questions: [...],
  mode: 'study',
  settings: { timer: false, leaderboard: false, timerSeconds: 5 },
  estimatedMinutes: 10,
  trackMistakesForRedemption: true,
})

// Later...
const published = await publishChallenge(draft.id, userId)
console.log('Published challenge:', published.id)
```

### Pattern 2: Play Challenge and Save Progress

```typescript
// On each answer
await setCurrentSessionWithBackend(
  userId,
  {
    challengeId,
    currentQuestionIndex: nextIndex,
    answersSoFar: [...previousAnswers, newAnswer],
    timestamp: new Date().toISOString(),
  },
  currentScore,
  currentStreak,
)

// On completion
const attemptId = await saveAttempt(
  userId, challengeId, userName, challengeTitle,
  finalScore, correctCount, totalQuestions,
  avgConfidence, confAccuracy,
  answers, answerDetails,
)

await upsertMistakesToRedemptionWithBackend(userId, challenge, answers)

await clearCurrentSessionWithBackend(userId, challengeId)
```

### Pattern 3: Play Redemption Questions

```typescript
// Load queue
const queue = await getRedemptionQueueWithBackend(userId)

// Create virtual "redemption" challenge
const redemptionChallenge: Challenge = {
  id: 'redemption',
  title: 'Redemption',
  mode: 'study',
  questions: queue.map(item => item.questionData),
  // ...
}

// Play like normal, but track which are redemption items

// On success for redemption item
await removeRedemptionItemsWithBackend(userId, [item])
```

---

## Constants

```typescript
// In lib/redemption.ts
export const LOW_CONFIDENCE_LIMIT_PER_SESSION = 3  // Low conf correct cap
export const MAX_REDEMPTION_ITEMS = 75            // Queue size cap

// Item type priorities (higher = more urgent)
wrong_high_conf: 3
wrong: 2
low_conf_correct: 1
```

---

## Testing Checklist

- [ ] Can create draft with questions
- [ ] Can update draft questions
- [ ] Can publish draft → becomes available
- [ ] Can load draft list (not published)
- [ ] Can load published list (not drafts)
- [ ] Can save session mid-challenge
- [ ] Can load session after page refresh
- [ ] Can save attempt with answers
- [ ] Can load attempt history
- [ ] Can upsert redemption items
- [ ] Can load redemption queue sorted
- [ ] Can remove redemption item on success
- [ ] All operations fail gracefully (logged, not thrown, UI continues)

---

## Performance Expectations

| Operation | Time | Notes |
|-----------|------|-------|
| saveDraft | ~150ms | Includes question inserts |
| updateDraft | ~150ms | Reinserts all questions |
| publishChallenge | ~50ms | Just status update |
| fetchAllChallenges | ~200ms | Published + user's drafts |
| fetchChallengeDetail | ~100ms | Single challenge + questions |
| saveSession | ~50ms | Upsert |
| loadSession | ~30ms | Single row |
| saveAttempt | ~100ms | Attempt + all answers |
| loadRedemptionQueue | ~150ms | Full queue with questions |
| upsertRedemptionItems | ~100ms | Multiple upserts + trim |

---

For more details, see:
- `MIGRATION_GUIDE.md` - Full technical reference
- `IMPLEMENTATION_SUMMARY.md` - Architecture and next steps
- `FILES_CREATED_MODIFIED.md` - File inventory
