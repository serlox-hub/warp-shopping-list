-- Add language column to existing user_preferences table
-- This migration adds language support to the existing user preferences

-- Check if the column doesn't exist and add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'language'
    ) THEN
        ALTER TABLE user_preferences 
        ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
        
        -- Add column comment
        COMMENT ON COLUMN user_preferences.language IS 'User preferred language (en, es, etc.)';
    END IF;
END $$;

-- Update the create_default_user_preferences function to include language
CREATE OR REPLACE FUNCTION create_default_user_preferences(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_preferences (user_id, language, theme)
    VALUES (p_user_id, 'en', 'system')
    ON CONFLICT (user_id) DO UPDATE SET
        language = COALESCE(user_preferences.language, 'en'),
        theme = COALESCE(user_preferences.theme, 'system');
END;
$$ LANGUAGE plpgsql;

-- Add constraint to ensure language is valid
ALTER TABLE user_preferences 
ADD CONSTRAINT check_valid_language 
CHECK (language IN ('en', 'es'));

-- Add constraint to ensure theme is valid (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_valid_theme' 
        AND table_name = 'user_preferences'
    ) THEN
        ALTER TABLE user_preferences 
        ADD CONSTRAINT check_valid_theme 
        CHECK (theme IN ('light', 'dark', 'system'));
    END IF;
END $$;