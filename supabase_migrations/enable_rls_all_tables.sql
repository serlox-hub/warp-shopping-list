-- Enable Row Level Security (RLS) for all application tables
-- This migration ensures all tables have proper RLS enabled and configured
-- Created: 2025-01-15

-- Ensure RLS is enabled on all main application tables

-- Shopping Lists table
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

-- Shopping Items table  
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

-- User Preferences table
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- User Aisles table
ALTER TABLE public.user_aisles ENABLE ROW LEVEL SECURITY;

-- Verify and recreate policies if they don't exist for shopping_lists
DO $$ 
BEGIN
    -- Check and create shopping_lists policies if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shopping_lists' AND policyname = 'Users can view their own shopping lists'
    ) THEN
        CREATE POLICY "Users can view their own shopping lists" ON public.shopping_lists
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shopping_lists' AND policyname = 'Users can insert their own shopping lists'
    ) THEN
        CREATE POLICY "Users can insert their own shopping lists" ON public.shopping_lists
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shopping_lists' AND policyname = 'Users can update their own shopping lists'
    ) THEN
        CREATE POLICY "Users can update their own shopping lists" ON public.shopping_lists
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shopping_lists' AND policyname = 'Users can delete their own shopping lists'
    ) THEN
        CREATE POLICY "Users can delete their own shopping lists" ON public.shopping_lists
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Verify and recreate policies if they don't exist for shopping_items
DO $$ 
BEGIN
    -- Check and create shopping_items policies if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shopping_items' AND policyname = 'Users can view their own shopping items'
    ) THEN
        CREATE POLICY "Users can view their own shopping items" ON public.shopping_items
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shopping_items' AND policyname = 'Users can insert their own shopping items'
    ) THEN
        CREATE POLICY "Users can insert their own shopping items" ON public.shopping_items
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shopping_items' AND policyname = 'Users can update their own shopping items'
    ) THEN
        CREATE POLICY "Users can update their own shopping items" ON public.shopping_items
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shopping_items' AND policyname = 'Users can delete their own shopping items'
    ) THEN
        CREATE POLICY "Users can delete their own shopping items" ON public.shopping_items
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Verify and recreate policies if they don't exist for user_preferences
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_preferences' AND policyname = 'Users can manage their own preferences'
    ) THEN
        CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Verify and recreate policies if they don't exist for user_aisles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_aisles' AND policyname = 'Users can manage their own aisles'
    ) THEN
        CREATE POLICY "Users can manage their own aisles" ON public.user_aisles
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add comments to document the security model
COMMENT ON TABLE public.shopping_lists IS 'Shopping lists with RLS enabled - users can only access their own lists';
COMMENT ON TABLE public.shopping_items IS 'Shopping items with RLS enabled - users can only access their own items';
COMMENT ON TABLE public.user_preferences IS 'User preferences with RLS enabled - users can only access their own preferences';
COMMENT ON TABLE public.user_aisles IS 'User aisles with RLS enabled - users can only access their own aisles';

-- Log completion
SELECT 'RLS enabled and verified for all application tables' AS status;