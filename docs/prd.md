# LIA - Locked In Answer

## Product Requirements Document (PRD)

- Status: Draft
- Product: Gamified quiz platform with confidence-based risk/reward mechanics
- Date: April 2026
- Target Release: MVP in 4-6 weeks (core loop first)

## 1. Executive Summary

LIA (Locked In Answer) is a web app that turns studying or trivia into an addictive confidence game. Users answer questions, then immediately "lock in" how sure they are (confidence 1-5). Higher confidence means bigger points if correct, but painful penalties if wrong.

- Core identity: It's not just a quiz app; it's a judgment game where you bet on your own knowledge.
- Vision: Create the most replayable learning experience by combining dopamine-rich gameplay with smart spaced repetition (via the Redemption system).

Tagline options:

- "Lock in your answer."
- "How sure are you?"
- "Answer. Commit. Get judged."

## 2. Problem Statement

Traditional quiz apps feel like boring flashcards or high-pressure tests. Users either:

- Quit because there's no stakes or excitement.
- Feel embarrassed by public stats/highlights when they fail hard.

LIA solves this by making every answer feel like a gamble with real consequences, while protecting ego through privacy controls and humorous framing.

## 3. Goals & Success Metrics (MVP)

- Core loop completion: >70% of users who start a challenge finish it
- Redemption engagement: >40% of users engage with their daily Redemption at least 3x/week
- Retention: Day 7 retention >35%
- Creation rate: At least 10% of active users create at least one challenge in first 30 days
- Session length: Average >8 minutes per session

## 4. Target Audience

Primary personas:

- Students (high school / college) who hate traditional studying but love games/competition
- Trivia enthusiasts who want more stakes than standard quiz apps
- Lifelong learners who enjoy self-improvement with risk/reward

Secondary:

- Teachers/creators who want to make shareable challenges for classes or friends

## 5. User Stories (Key Ones)

- As a user, I want to answer a question then immediately choose my confidence level (1-5) so I can risk more on things I'm sure about.
- As a user, I want a Daily Redemption challenge automatically built from my saved mistakes so I can fix weak spots without manual effort.
- As a creator, I want to build and publish a Challenge with customizable timer, penalties, and leaderboard settings.
- As a user, I want privacy controls so big fails (e.g. "67 wrong") don't publicly embarrass me.
- As a user, I want satisfying visual/audio feedback when I get answers right/wrong or when a high-confidence bet pays off.

## 6. Functional Requirements

### Core Mechanics

- Confidence System: After selecting an answer, user must choose confidence 1-5 before submitting. Scoring multiplies based on confidence + correctness.
- Penalty Modes: Soft (lose points), Hard (lose streak), Sudden Death (run ends).
- Question Flow: Multiple choice (default), optional typing. Missed questions can reappear with weighting.

### Pages & Features

#### Onboarding (separate, fast, 4-5 steps max)

- Username + optional PFP
- Privacy preset (Public / Friends / Private)
- Highlight visibility toggle ("Show my big wins & fails 😅")
- Game vibe preset: Chill / Competitive / Chaos
- Interests selection
- Ends with immediate 5-question starter challenge

#### Home / Dashboard

- Daily Redemption card (prominent)
- Continue last challenge
- Recommended challenges
- Top bar with prominent + Create button (with plus icon)

#### Play Challenge (core screen)

- Question display + progress
- Answer selection
- Confidence selector (1-5) after answer
- Immediate result with dopamine animations (correct: green glow + scale; wrong: red shake; high-confidence fail: stronger emphasis)
- Next question or end screen

#### Create Challenge

- Title + description
- Add/edit questions + correct answers
- Settings section: Timer, Leaderboard, Comments/trash-talk, Confidence system, Penalty style
- Presets (Chill / Ranked / Chaos) + advanced toggles
- Preview + Publish

#### Daily Redemption

- Auto-generated from saved missed questions (prioritize high-confidence wrongs)
- Improvement feedback ("You fixed 8/10 from yesterday")
- Streak/multiplier bonuses

#### Profile / Stats

- Accuracy, confidence accuracy, streaks, history
- Privacy toggles
- Option to hide or humorously rephrase embarrassing highlights

#### Leaderboard

- Global / Friends toggle
- Daily / weekly views

#### Challenge Detail (supporting)

- Preview before playing, creator info, start button, mini-leaderboard

### Settings That Actually Matter

- Timer (Off / Per-question / Speed scaling)
- Leaderboard (Off / Friends / Global)
- Comments (On/Off + reactions for light trash talk)
- Retry / reappearance of missed questions
- "Fairness control" for answer acceptance

## 7. User Experience & Design

- Overall Vibe: Energetic + competitive but clean. Dark mode preferred. Dopamine-driven feedback without clutter.

Strict Design Rules (to be defined in design-spec.md):

- Consistent component system (Button, Card, Toggle, TopBar, ConfidenceSelector, etc.)
- One modern Google Font across the app
- Icons: Lucide / Untitled UI style (icon + text on buttons where helpful)
- Animations: Snappy hovers, correct/wrong feedback (scale, glow, shake), fast transitions
- Top bar always includes prominent Create (+ icon) button

Key UX Principles:

- Mobile-first
- Fast flow from dashboard -> play -> results
- Never overwhelm with settings (use presets + optional advanced)
- Turn potential embarrassment into humor where possible

## 8. Non-Functional Requirements

- Fast loading (<2s for core pages)
- Responsive (works well on mobile + desktop)
- Dark mode by default
- Simple auth (email or social)

## 9. Constraints & Out of Scope (MVP)

Out of Scope for MVP:

- Live multiplayer matches
- Complex social features beyond basic comments/leaderboards
- Advanced analytics dashboard
- Mobile native app (web-first, PWA later)
- Monetization

Constraints:

- Keep creator flow simple (under ~20 seconds for basic challenge)
- Avoid toxic trash talk (guide with reactions + humorous framing)

## 10. Roadmap

- Phase 1 (MVP): Onboarding -> Play loop -> Create basic -> Daily Redemption -> Profile + basic Leaderboard
- Phase 2: Full settings, comments, better animations, Challenge Detail, polish
- Phase 3: Social sharing, more game modes, creator tools, PWA