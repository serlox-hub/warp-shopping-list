-- Create user_aisles table for storing custom user aisles
-- This table will store personalized aisles for each user

-- Create the user_aisles table
CREATE TABLE IF NOT EXISTS user_aisles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique aisle names per user
    UNIQUE(user_id, name)
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_aisles_user_id ON user_aisles(user_id);

-- Create index on user_id and display_order for ordered retrieval
CREATE INDEX IF NOT EXISTS idx_user_aisles_user_order ON user_aisles(user_id, display_order);

-- Enable Row Level Security (RLS)
ALTER TABLE user_aisles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only access their own aisles
CREATE POLICY "Users can manage their own aisles" ON user_aisles
    FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_aisles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at update
CREATE TRIGGER trigger_update_user_aisles_updated_at
    BEFORE UPDATE ON user_aisles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_aisles_updated_at();

-- Function to create default aisles for new users
CREATE OR REPLACE FUNCTION create_default_user_aisles(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_aisles (user_id, name, display_order)
    VALUES 
        (p_user_id, 'Produce', 1),
        (p_user_id, 'Dairy', 2),
        (p_user_id, 'Meat & Seafood', 3),
        (p_user_id, 'Bakery', 4),
        (p_user_id, 'Pantry', 5),
        (p_user_id, 'Frozen', 6),
        (p_user_id, 'Personal Care', 7),
        (p_user_id, 'Household', 8),
        (p_user_id, 'Other', 9)
    ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Add comment to the table
COMMENT ON TABLE user_aisles IS 'Store custom aisle configurations for each user';