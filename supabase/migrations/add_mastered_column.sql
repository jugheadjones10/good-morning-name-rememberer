-- Migration: Add mastered column to user_child_progress
-- This allows users to mark children they've fully memorized
-- so they won't appear in future reviews

ALTER TABLE user_child_progress 
ADD COLUMN IF NOT EXISTS mastered BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment explaining the column
COMMENT ON COLUMN user_child_progress.mastered IS 'If true, child is fully memorized and won''t appear in reviews';
