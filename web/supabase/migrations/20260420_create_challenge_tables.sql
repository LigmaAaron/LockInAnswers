-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CHALLENGES TABLE
-- Stores challenge metadata and status
-- ============================================================================
CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  mode TEXT NOT NULL CHECK (mode IN ('study', 'competitive', 'casual')),
  
  -- Challenge settings
  timer_enabled BOOLEAN NOT NULL DEFAULT false,
  timer_seconds INT CHECK (timer_seconds IN (5, 10, 15)),
  leaderboard_enabled BOOLEAN NOT NULL DEFAULT false,
  comments_enabled BOOLEAN NOT NULL DEFAULT false,
  confidence_enabled BOOLEAN NOT NULL DEFAULT false,
  track_mistakes_for_redemption BOOLEAN NOT NULL DEFAULT false,
  estimated_minutes INT NOT NULL,
  question_count INT NOT NULL,
  
  -- Verification & metadata
  is_verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT positive_question_count CHECK (question_count > 0),
  CONSTRAINT positive_estimated_minutes CHECK (estimated_minutes > 0)
);

CREATE INDEX challenges_creator_id_status ON challenges(creator_id, status);
CREATE INDEX challenges_status ON challenges(status);
CREATE INDEX challenges_created_at ON challenges(created_at DESC);


-- ============================================================================
-- CHALLENGE_QUESTIONS TABLE
-- Stores individual questions within challenges
-- ============================================================================
CREATE TABLE challenge_questions (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  question_order INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'multi_select')),
  choices JSONB NOT NULL, -- Array of answer choices
  correct_answers JSONB NOT NULL, -- Array of correct choice indexes
  explanation TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_question_per_challenge UNIQUE(challenge_id, question_order)
);

CREATE INDEX challenge_questions_challenge_id ON challenge_questions(challenge_id);


-- ============================================================================
-- CHALLENGE_SESSIONS TABLE
-- Stores active/in-progress challenge sessions
-- ============================================================================
CREATE TABLE challenge_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  current_question_index INT NOT NULL DEFAULT 0,
  answers_so_far JSONB NOT NULL DEFAULT '[]', -- Array of SessionAnswer
  current_score INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_active_session UNIQUE(user_id, challenge_id),
  CONSTRAINT non_negative_question_index CHECK (current_question_index >= 0),
  CONSTRAINT non_negative_score CHECK (current_score >= 0),
  CONSTRAINT non_negative_streak CHECK (current_streak >= 0)
);

CREATE INDEX challenge_sessions_user_id ON challenge_sessions(user_id);
CREATE INDEX challenge_sessions_updated_at ON challenge_sessions(updated_at DESC);


-- ============================================================================
-- CHALLENGE_ATTEMPTS TABLE
-- Stores completed challenge runs
-- ============================================================================
CREATE TABLE challenge_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  score INT NOT NULL,
  correct INT NOT NULL,
  total INT NOT NULL,
  average_confidence DECIMAL(3, 2) NOT NULL,
  confidence_accuracy DECIMAL(3, 2) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT non_negative_score CHECK (score >= 0),
  CONSTRAINT valid_correct CHECK (correct >= 0 AND correct <= total),
  CONSTRAINT valid_total CHECK (total > 0),
  CONSTRAINT valid_average_confidence CHECK (average_confidence >= 1 AND average_confidence <= 5),
  CONSTRAINT valid_confidence_accuracy CHECK (confidence_accuracy >= 0 AND confidence_accuracy <= 1)
);

CREATE INDEX challenge_attempts_user_id ON challenge_attempts(user_id);
CREATE INDEX challenge_attempts_challenge_id ON challenge_attempts(challenge_id);
CREATE INDEX challenge_attempts_completed_at ON challenge_attempts(completed_at DESC);


-- ============================================================================
-- ATTEMPT_ANSWERS TABLE
-- Stores per-question result data for completed attempts
-- ============================================================================
CREATE TABLE attempt_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES challenge_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES challenge_questions(id) ON DELETE CASCADE,
  selected_index INT NOT NULL,
  correct_index INT NOT NULL,
  confidence INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_confidence CHECK (confidence >= 1 AND confidence <= 5),
  CONSTRAINT non_negative_points CHECK (points_earned >= 0)
);

CREATE INDEX attempt_answers_attempt_id ON attempt_answers(attempt_id);
CREATE INDEX attempt_answers_question_id ON attempt_answers(question_id);


-- ============================================================================
-- REDEMPTION_ITEMS TABLE
-- Stores the redemption queue for missed questions
-- ============================================================================
CREATE TABLE redemption_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL REFERENCES challenge_questions(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('wrong_high_conf', 'wrong', 'low_conf_correct')),
  times_missed INT NOT NULL DEFAULT 1,
  high_confidence_mistake BOOLEAN NOT NULL DEFAULT false,
  last_missed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_redemption_item UNIQUE(user_id, question_id, challenge_id),
  CONSTRAINT positive_times_missed CHECK (times_missed > 0)
);

CREATE INDEX redemption_items_user_id ON redemption_items(user_id);
CREATE INDEX redemption_items_user_id_type ON redemption_items(user_id, type);
CREATE INDEX redemption_items_user_id_updated_at ON redemption_items(user_id, updated_at DESC);


-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Challenges: Public read for published, creator can read/write own drafts
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published challenges readable by all" ON challenges
  FOR SELECT USING (status = 'published');

CREATE POLICY "Draft challenges readable by creator" ON challenges
  FOR SELECT USING (status = 'draft' AND creator_id = auth.uid()::text);

CREATE POLICY "Creator can insert challenges" ON challenges
  FOR INSERT WITH CHECK (creator_id = auth.uid()::text);

CREATE POLICY "Creator can update own challenges" ON challenges
  FOR UPDATE USING (creator_id = auth.uid()::text);


-- Challenge questions: Readable if challenge is readable
ALTER TABLE challenge_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions readable with challenge" ON challenge_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM challenges
      WHERE challenges.id = challenge_questions.challenge_id
        AND (challenges.status = 'published' OR challenges.creator_id = auth.uid()::text)
    )
  );


-- Sessions: User can read/write own sessions
ALTER TABLE challenge_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own sessions" ON challenge_sessions
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "User can insert own sessions" ON challenge_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "User can update own sessions" ON challenge_sessions
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "User can delete own sessions" ON challenge_sessions
  FOR DELETE USING (user_id = auth.uid()::text);


-- Attempts: User can read own attempts
ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own attempts" ON challenge_attempts
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "User can insert own attempts" ON challenge_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);


-- Attempt answers: Readable via attempt
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Readable via owned attempt" ON attempt_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM challenge_attempts
      WHERE challenge_attempts.id = attempt_answers.attempt_id
        AND challenge_attempts.user_id = auth.uid()::text
    )
  );


-- Redemption items: User can read/write own items
ALTER TABLE redemption_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own redemption items" ON redemption_items
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "User can insert own redemption items" ON redemption_items
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "User can update own redemption items" ON redemption_items
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "User can delete own redemption items" ON redemption_items
  FOR DELETE USING (user_id = auth.uid()::text);
