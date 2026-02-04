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
  quiz_day TEXT DEFAULT 'monday' CHECK (quiz_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  email_enabled BOOLEAN DEFAULT TRUE,  -- Whether to receive weekly quiz emails
  is_admin BOOLEAN DEFAULT FALSE,
  hide_surname BOOLEAN DEFAULT FALSE,  -- Admin setting: hide first character (surname) in quiz
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children table with Korean name validation
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Validate Korean name is 2-5 characters (가-힣 range)
  -- Covers: 2-char (김수), 3-char (김민수), 4-char (남궁민수), 5-char names
  CONSTRAINT valid_korean_name CHECK (name ~ '^[\uAC00-\uD7AF]{2,5}$')
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
  interval_weeks INTEGER NOT NULL DEFAULT 1,  -- Current interval in weeks (min: 1)
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- When this child is due for review
  last_reviewed_at TIMESTAMPTZ,  -- Last time user reviewed this child
  consecutive_correct INTEGER NOT NULL DEFAULT 0,  -- Streak of correct answers
  mastered BOOLEAN NOT NULL DEFAULT FALSE,  -- If true, child is fully memorized and won't appear in reviews
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
