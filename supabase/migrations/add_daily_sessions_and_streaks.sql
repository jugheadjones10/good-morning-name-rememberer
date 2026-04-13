-- Migration: Add daily session support and streaks
-- Adds streak tracking, session size, and email frequency to profiles

-- Streak tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_session_date DATE;

-- User-configurable session size
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cards_per_session INTEGER NOT NULL DEFAULT 20;

-- Email frequency replaces email_enabled + quiz_day for daily support
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_frequency TEXT NOT NULL DEFAULT 'daily'
  CHECK (email_frequency IN ('daily', 'weekly', 'off'));
