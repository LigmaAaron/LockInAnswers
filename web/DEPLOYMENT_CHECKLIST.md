# Migration Deployment & Validation Checklist

## Pre-Deployment

- [ ] All files created without compilation errors
- [ ] Reviewed MIGRATION_GUIDE.md for architecture understanding
- [ ] Reviewed IMPLEMENTATION_SUMMARY.md for integration approach
- [ ] Supabase project is ready (project created, credentials set)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars set
- [ ] `VITE_APP_URL` env var set to production origin (for auth redirect fallback), e.g. `https://mcqhublw.vercel.app`

---

## Phase 1: Database Setup

### Apply Migrations
- [ ] Open Supabase console → SQL Editor
- [ ] Copy contents of `web/supabase/migrations/20260420_create_challenge_tables.sql`
- [ ] Paste into SQL editor and run
- [ ] Verify all tables created:
  - [ ] `challenges`
  - [ ] `challenge_questions`
  - [ ] `challenge_sessions`
  - [ ] `challenge_attempts`
  - [ ] `attempt_answers`
  - [ ] `redemption_items`

### Verify Schema
- [ ] Click each table, verify columns match comments in migration
- [ ] Check indexes exist:
  - [ ] `challenges_creator_id_status`
  - [ ] `challenges_status`
  - [ ] `challenges_created_at`
  - [ ] `challenge_questions_challenge_id`
  - [ ] `challenge_sessions_user_id`
  - [ ] `challenge_sessions_updated_at`
  - [ ] `challenge_attempts_user_id`
  - [ ] `challenge_attempts_challenge_id`
  - [ ] `challenge_attempts_completed_at`
  - [ ] `attempt_answers_attempt_id`
  - [ ] `attempt_answers_question_id`
  - [ ] `redemption_items_user_id`
  - [ ] `redemption_items_user_id_type`
  - [ ] `redemption_items_user_id_updated_at`

### Verify RLS Policies
- [ ] Click each table → Authentication → RLS
- [ ] Verify policies exist for:
  - [ ] `challenges` (3 policies: select published, select draft for creator, insert, update)
  - [ ] `challenge_questions` (1 policy: select with challenge)
  - [ ] `challenge_sessions` (4 policies: select, insert, update, delete for user)
  - [ ] `challenge_attempts` (2 policies: select, insert for user)
  - [ ] `attempt_answers` (1 policy: select via attempt)
  - [ ] `redemption_items` (4 policies: select, insert, update, delete for user)

---

## Phase 2: Code Compilation Check

### Verify No TypeScript Errors
```bash
cd web
npm run build
# or
npx tsc --noEmit
```

- [ ] Zero compilation errors
- [ ] All imports resolve correctly
- [ ] Type checking passes

### Verify New Files Exist
```bash
ls -la src/lib/challenges.ts
ls -la src/lib/sessions.ts
ls -la src/lib/attempts.ts
ls -la src/lib/redemption.ts
```

- [ ] All 4 files exist
- [ ] All have substantial content (>50 lines each)

### Verify Modified Files
- [ ] `src/utils/session.ts` - Check for new `*WithBackend` functions
- [ ] `src/utils/redemption.ts` - Check for new `*WithBackend` functions
- [ ] `src/types/models.ts` - Check for new `*DB` types and transformation helpers

---

## Phase 3: Unit Testing (Data-Access Layer)

### Create Test File (if using Jest)
Create `src/lib/__tests__/challenges.test.ts`:

```typescript
import { saveDraft, fetchAllChallenges } from '../challenges'

describe('lib/challenges', () => {
  // Skip if no test environment set up yet
  test.skip('saveDraft creates challenge', async () => {
    const draft = await saveDraft('test-user', {
      title: 'Test',
      description: 'Test',
      questions: [],
      mode: 'study',
      settings: { timer: false, leaderboard: false, timerSeconds: 5 },
      estimatedMinutes: 5,
      trackMistakesForRedemption: false,
    })
    expect(draft.id).toBeDefined()
  })
})
```

- [ ] Tests compile (if using Jest)
- [ ] Tests skip gracefully if no backend (no failures)

### Manual Integration Test

**Test: Save Draft**
```bash
# In browser console on any page
import('src/lib/challenges.js').then(m => {
  m.saveDraft('test-user-id', {
    title: 'Test Challenge',
    description: 'A test',
    questions: [{
      id: 'q1',
      prompt: 'What?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
    }],
    mode: 'study',
    settings: { timer: false, leaderboard: false, timerSeconds: 5 },
    estimatedMinutes: 5,
    trackMistakesForRedemption: true,
  }).then(result => console.log('Saved:', result)).catch(err => console.error('Error:', err))
})
```

- [ ] Request succeeds
- [ ] New row appears in `challenges` table
- [ ] Questions appear in `challenge_questions` table

**Test: Load Challenge**
```bash
import('src/lib/challenges.js').then(m => {
  m.fetchAllChallenges('test-user-id')
    .then(all => console.log('Loaded:', all.length, 'challenges'))
    .catch(err => console.error('Error:', err))
})
```

- [ ] Request succeeds
- [ ] Challenges loaded with questions populated
- [ ] Published and draft challenges included

**Test: Session Save**
```bash
import('src/lib/sessions.js').then(m => {
  m.saveSession('test-user-id', 'challenge-id-here', 0, [], 0, 0)
    .then(session => console.log('Saved session'))
    .catch(err => console.error('Error:', err))
})
```

- [ ] Request succeeds
- [ ] New row in `challenge_sessions` table
- [ ] Upsert works on second call

**Test: Redemption Load** (need existing items)
```bash
import('src/lib/redemption.js').then(m => {
  m.loadRedemptionQueue('test-user-id')
    .then(queue => console.log('Loaded:', queue.length, 'items'))
    .catch(err => console.error('Error:', err))
})
```

- [ ] Request succeeds (even if empty)
- [ ] Returns array of items or empty

---

## Phase 4: Authentication & Permissions

### Test Anonymous Access
- [ ] Can fetch published challenges without auth
- [ ] Cannot fetch drafts without auth
- [ ] Cannot save session without auth
- [ ] Session/redemption/attempt inserts fail without auth

### Test Authenticated Access
- [ ] Can fetch published challenges with auth
- [ ] Can fetch own drafts with auth
- [ ] Cannot fetch other users' drafts with auth
- [ ] Can save/load own sessions with auth
- [ ] Cannot see other users' sessions
- [ ] Can save/load own redemption items
- [ ] Cannot see other users' redemption items

---

## Phase 5: Data Consistency Checks

### Test Upsert Behavior
- [ ] Save session twice same (user_id, challenge_id): creates 1 row, then updates it
- [ ] Add redemption item twice: creates 1 row, then updates times_missed
- [ ] Verify UNIQUE constraint violations don't break anything

### Test Cascading Deletes
- [ ] Delete challenge: questions cascade-delete
- [ ] Delete challenge: sessions cascade-delete
- [ ] Delete challenge: attempts cascade-delete
- [ ] Delete attempt: attempt_answers cascade-delete
- [ ] Delete challenge: redemption_items cascade-delete

### Test Data Integrity
- [ ] Challenge title/description preserved exactly
- [ ] Question order preserved through save/load
- [ ] Session answers preserved exactly (JSON structure)
- [ ] Attempt scores match what was saved
- [ ] Redemption items maintain correct type/priority

---

## Phase 6: Error Handling

### Network Failure Simulation
- [ ] Disable internet / block Supabase domain
- [ ] Verify fallback functions use localStorage
- [ ] Enable internet, verify data resync

### RLS Violation Simulation
- [ ] Try to update another user's challenge: expect error/no update
- [ ] Try to delete another user's session: expect error/no delete
- [ ] Verify error doesn't crash app

### Schema Violation Simulation
- [ ] Try to insert challenge with NULL creator_id: expect error
- [ ] Try to insert question with invalid correct_index: expect error
- [ ] Verify errors are caught and logged

---

## Phase 7: Performance Baseline

### Measure Initial Performance
- [ ] Time `fetchAllChallenges()`: Should be < 300ms
- [ ] Time `loadRedemptionQueue()`: Should be < 300ms
- [ ] Time `saveAttempt()`: Should be < 200ms
- [ ] Record baseline numbers

### Enable Slow Query Logging
In Supabase → Logs:
- [ ] Check for any queries > 100ms
- [ ] Review index usage in query plans

---

## Phase 8: Documentation Validation

- [ ] MIGRATION_GUIDE.md is readable and complete
- [ ] IMPLEMENTATION_SUMMARY.md matches actual implementation
- [ ] API_REFERENCE.md has all functions with examples
- [ ] FILES_CREATED_MODIFIED.md accurately lists all changes
- [ ] Example code in docs is copy-paste-ready

---

## Phase 9: Backup & Rollback

### Create Backup
```bash
# In Supabase console → Settings → Backups
# Create manual backup before proceeding
```

- [ ] Backup created
- [ ] Backup labeled with timestamp

### Document Rollback Steps
- [ ] If issues found, can delete all new tables and re-enable localStorage
- [ ] Migration helpers already support fallback
- [ ] No component changes yet, so no need to revert page code

---

## Ready for Page Integration ✅

Once all above checks pass:

1. Create ticket for Phase 1: CreateQuizPage Integration
   - Integrate `lib/challenges.ts` into CreateQuizPage
   - Test create → publish flow
   - Verify LibraryPage displays backend challenges

2. Create ticket for Phase 2: PlayQuizPage Integration
   - Integrate `lib/sessions.ts` + `lib/attempts.ts`
   - Test resume/refresh, completion flow

3. Create ticket for Phase 3: Redemption Integration
   - Integrate `lib/redemption.ts`
   - Test queue loading, item removal

---

## Post-Deployment Monitoring

### Week 1 Monitoring
- [ ] Watch error logs for Supabase issues
- [ ] Monitor RLS policy violations
- [ ] Check for N+1 query problems
- [ ] Verify data consistency across systems

### Metrics to Track
- Average challenge creation time
- Average session load time
- Redemption queue load times
- Error rates by operation type

### Action Items if Issues Found
- [ ] Log issue with timestamp and operation
- [ ] Revert to localStorage-only via feature flag
- [ ] Debug offline
- [ ] Fix and re-test before re-enabling

---

## Sign-Off Checklist

- [ ] Database schema deployed and verified
- [ ] Code compiles with zero errors
- [ ] All manual integration tests pass
- [ ] Authentication and RLS working correctly
- [ ] Data consistency verified
- [ ] Error handling tested
- [ ] Performance baseline recorded
- [ ] Documentation reviewed
- [ ] Backup created
- [ ] Team aware of current status

**Status**: Ready for page integration phase

---

## Quick Command Reference

```bash
# Apply migrations
# (Copy SQL into Supabase console SQL Editor and run)

# Check for compilation errors
npm run build

# Start dev server
npm run dev

# Open browser console
# (F12 → Console tab)

# Test data-access layer
# (Use examples in Phase 3 above)

# Check Supabase tables
# (Supabase console → Table Editor)

# View logs
# (Supabase console → Logs)
```

---

**Estimated Time to Complete**: 2-4 hours
- Database setup: 15 min
- Code verification: 15 min
- Manual testing: 1.5-2 hours
- Documentation review: 30 min
- Backup/sign-off: 30 min
