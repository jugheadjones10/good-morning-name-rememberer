-- Migration: Switch from linear interval_weeks to SM-2 ease-factor-based interval_days
-- Idempotent: safe to run multiple times

-- Add ease factor for SM-2 algorithm
ALTER TABLE user_child_progress ADD COLUMN IF NOT EXISTS ease_factor REAL NOT NULL DEFAULT 2.5;

-- Rename column from interval_weeks to interval_days (skip if already renamed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_child_progress' AND column_name = 'interval_weeks'
  ) THEN
    -- Convert week values to day values before renaming
    UPDATE user_child_progress SET interval_weeks = interval_weeks * 7;
    ALTER TABLE user_child_progress RENAME COLUMN interval_weeks TO interval_days;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_child_progress' AND column_name = 'interval_days'
  ) THEN
    -- Partial migration safety:
    -- If data still looks like week-based values (all rows < 10), convert once.
    IF EXISTS (SELECT 1 FROM user_child_progress)
       AND NOT EXISTS (
         SELECT 1 FROM user_child_progress WHERE interval_days >= 10
       ) THEN
      UPDATE user_child_progress
      SET interval_days = interval_days * 7;
    END IF;
  END IF;
END $$;
