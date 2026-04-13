-- Supabase Schema for Children Name Flashcard App
-- Simple email-only authentication (no passwords)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (simple email-based users, no password)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,  -- User's display name for leaderboard
  quiz_day TEXT DEFAULT 'saturday' CHECK (quiz_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  group_type TEXT NOT NULL DEFAULT 'kindergarten' CHECK (group_type IN ('kindergarten', 'primary')),
  email_enabled BOOLEAN DEFAULT TRUE,  -- Legacy; superseded by email_frequency
  email_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (email_frequency IN ('daily', 'weekly', 'off')),
  is_admin BOOLEAN DEFAULT FALSE,
  hide_surname BOOLEAN DEFAULT TRUE,  -- Per-user setting: hide first character (surname) in quiz
  cards_per_session INTEGER NOT NULL DEFAULT 20,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_session_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children table with flexible name validation
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  group_type TEXT NOT NULL DEFAULT 'kindergarten' CHECK (group_type IN ('kindergarten', 'primary')),
  department TEXT CHECK (department IN ('1부', '2부')),
  grade INTEGER CHECK (grade BETWEEN 3 AND 6),
  class_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Allow Hangul/English names with spaces, apostrophes, periods, and hyphens
  -- Length 2-20 chars
  CONSTRAINT valid_child_name CHECK (name ~ '^[A-Za-z\uAC00-\uD7AF][A-Za-z\uAC00-\uD7AF .''-]{1,19}$')
);

-- Quiz attempts for tracking progress
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spaced repetition progress tracking
-- Tracks review intervals per user per child
CREATE TABLE IF NOT EXISTS user_child_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  interval_days INTEGER NOT NULL DEFAULT 1,  -- Current interval in days (SM-2 based)
  ease_factor REAL NOT NULL DEFAULT 2.5,  -- SM-2 ease factor (min 1.3)
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- When this child is due for review
  last_reviewed_at TIMESTAMPTZ,  -- Last time user reviewed this child
  consecutive_correct INTEGER NOT NULL DEFAULT 0,  -- Streak of correct answers
  mastered BOOLEAN NOT NULL DEFAULT FALSE,  -- If true, child is fully memorized (interval >= 180d)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, child_id)  -- One progress record per user per child
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_child_id ON quiz_attempts(child_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_attempted_at ON quiz_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_quiz_day ON profiles(quiz_day);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_child_progress_user_id ON user_child_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_child_progress_next_review ON user_child_progress(next_review_date);

-- Row Level Security (RLS)
-- For this simple app with trusted users, we use permissive policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read and create, update own profile
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create profile"
  ON profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update profiles"
  ON profiles FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can delete own profile"
  ON profiles FOR DELETE
  TO anon, authenticated
  USING (true);

-- Children: Anyone can read, admins can modify
CREATE POLICY "Anyone can view children"
  ON children FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert children"
  ON children FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update children"
  ON children FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can delete children"
  ON children FOR DELETE
  TO anon, authenticated
  USING (true);

-- Quiz attempts: Anyone can read and create
CREATE POLICY "Anyone can view quiz attempts"
  ON quiz_attempts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert quiz attempts"
  ON quiz_attempts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- User child progress: Full access for spaced repetition tracking
ALTER TABLE user_child_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view progress"
  ON user_child_progress FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert progress"
  ON user_child_progress FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update progress"
  ON user_child_progress FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can delete progress"
  ON user_child_progress FOR DELETE
  TO anon, authenticated
  USING (true);

-- Feedback table for bug reports and suggestions
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT,  -- Store email separately in case user is deleted
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_is_read ON feedback(is_read);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback
CREATE POLICY "Anyone can insert feedback"
  ON feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view all feedback (enforced in app layer)
CREATE POLICY "Anyone can view feedback"
  ON feedback FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can update feedback (mark as read)
CREATE POLICY "Anyone can update feedback"
  ON feedback FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Only admins can delete feedback
CREATE POLICY "Anyone can delete feedback"
  ON feedback FOR DELETE
  TO anon, authenticated
  USING (true);
