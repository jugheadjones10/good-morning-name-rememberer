-- Migration: Add primary school support
-- Adds group_type and metadata columns to children and profiles tables

-- Children table: add group classification and primary school metadata
ALTER TABLE children ADD COLUMN IF NOT EXISTS group_type TEXT NOT NULL DEFAULT 'kindergarten'
  CHECK (group_type IN ('kindergarten', 'primary'));
ALTER TABLE children ADD COLUMN IF NOT EXISTS department TEXT CHECK (department IN ('1부', '2부'));
ALTER TABLE children ADD COLUMN IF NOT EXISTS grade INTEGER CHECK (grade BETWEEN 3 AND 6);
ALTER TABLE children ADD COLUMN IF NOT EXISTS class_number INTEGER;

-- Profiles table: add group assignment and change default quiz_day
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS group_type TEXT NOT NULL DEFAULT 'kindergarten'
  CHECK (group_type IN ('kindergarten', 'primary'));
ALTER TABLE profiles ALTER COLUMN quiz_day SET DEFAULT 'saturday';
ALTER TABLE profiles ALTER COLUMN hide_surname SET DEFAULT true;

-- Children names may include Hangul, English, spaces, middle dot, apostrophe, and hyphen
ALTER TABLE children DROP CONSTRAINT IF EXISTS valid_korean_name;
ALTER TABLE children ADD CONSTRAINT valid_child_name
  CHECK (name ~ '^[A-Za-z\uAC00-\uD7AF][A-Za-z\uAC00-\uD7AF .''-]{1,19}$');

-- Index for filtering children by group
CREATE INDEX IF NOT EXISTS idx_children_group_type ON children(group_type);
CREATE INDEX IF NOT EXISTS idx_profiles_group_type ON profiles(group_type);
