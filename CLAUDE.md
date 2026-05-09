# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Commands

### Development
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Architecture Overview

### Data Model
- Challenges: Draft/published quizzes with questions
- Sessions: Active quiz progress
- Attempts: Completed quiz results
- Redemption: Missed question queue

### Key Files
- `lib/challenges.ts` - Challenge CRUD operations
- `lib/sessions.ts` - Session management
- `lib/attempts.ts` - Attempt tracking
- `lib/redemption.ts` - Redemption queue
- `utils/session.ts` - Dual-write session helpers
- `utils/redemption.ts` - Dual-write redemption helpers

### Supabase Tables
- `challenges` + `challenge_questions`
- `challenge_sessions`
- `challenge_attempts` + `attempt_answers`
- `redemption_items`

## Common Patterns

1. **Challenge Flow**
   - Create draft → Publish → Play → Save attempt → Update redemption

2. **Session Handling**
   - Save progress on each question
   - Clear on completion

3. **Redemption**
   - Load queue → Play → Remove successful items

## Performance Notes
- Challenge list: <200ms
- Session save: <100ms
- Redemption load: <200ms
- Attempt save: <150ms

## Important Constraints
- Max 75 redemption items
- Low confidence correct capped at 3/session
- Unique constraints prevent duplicates

## Migration Status
- Backend schema complete
- Data-access layer complete
- Page integration in progress

For full details see:
- `API_REFERENCE.md` - Complete API documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details