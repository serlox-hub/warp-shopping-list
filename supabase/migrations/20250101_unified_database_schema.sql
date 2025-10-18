-- =============================================================================
-- UNIFIED DATABASE SCHEMA FOR SHOPPING LIST APPLICATION
-- =============================================================================
-- Created: 2025-01-15
-- Description: Complete database schema with all tables, functions, and policies
-- Features: Shopping lists, items, user preferences, custom aisles, RLS security
-- =============================================================================

-- =============================================================================
-- 1. CORE TABLES
-- =============================================================================

-- Shopping Lists table
CREATE TABLE IF NOT EXISTS public.shopping_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL DEFAULT 'My Shopping List',
    is_active BOOLEAN NOT NULL DEFAULT false,
    list_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Shopping Items table
CREATE TABLE IF NOT EXISTS public.shopping_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shopping_list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    aisle TEXT NOT NULL DEFAULT 'Other',
    quantity INTEGER NOT NULL DEFAULT 1,
    completed BOOLEAN NOT NULL DEFAULT false,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es')),
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- User Aisles table
CREATE TABLE IF NOT EXISTS public.user_aisles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#6b7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, name)
);

-- Shopping Item Usage table
CREATE TABLE IF NOT EXISTS public.shopping_item_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_name TEXT NOT NULL,
    purchase_count INTEGER NOT NULL DEFAULT 0,
    last_aisle TEXT,
    last_quantity INTEGER,
    last_purchased_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, item_name)
);

-- =============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- =============================================================================

-- Shopping Lists indexes
CREATE INDEX IF NOT EXISTS shopping_lists_user_id_idx ON public.shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS shopping_lists_user_order_idx ON public.shopping_lists(user_id, list_order);

-- Shopping Items indexes
CREATE INDEX IF NOT EXISTS shopping_items_shopping_list_id_idx ON public.shopping_items(shopping_list_id);
CREATE INDEX IF NOT EXISTS shopping_items_user_id_idx ON public.shopping_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_comment ON public.shopping_items USING gin(to_tsvector('english', comment)) WHERE comment IS NOT NULL;

-- User Preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- User Aisles indexes
CREATE INDEX IF NOT EXISTS idx_user_aisles_user_id ON public.user_aisles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_aisles_user_order ON public.user_aisles(user_id, display_order);

-- Shopping Item Usage indexes
CREATE INDEX IF NOT EXISTS shopping_item_usage_user_id_idx ON public.shopping_item_usage(user_id);
CREATE INDEX IF NOT EXISTS shopping_item_usage_user_count_idx ON public.shopping_item_usage(user_id, purchase_count DESC);

-- =============================================================================
-- 3. UNIQUE CONSTRAINTS
-- =============================================================================

-- Ensure only one active list per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_list_per_user 
ON public.shopping_lists (user_id) 
WHERE is_active = true;

-- =============================================================================
-- 4. UTILITY FUNCTIONS
-- =============================================================================

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set list order for new lists
CREATE OR REPLACE FUNCTION public.set_new_list_order()
RETURNS TRIGGER AS $$
BEGIN
    NEW.list_order = COALESCE(
        (SELECT MAX(list_order) + 1 FROM public.shopping_lists WHERE user_id = NEW.user_id),
        0
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create default user preferences
CREATE OR REPLACE FUNCTION public.create_default_user_preferences(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id, language, theme)
    VALUES (p_user_id, 'en', 'system')
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to create default user aisles
CREATE OR REPLACE FUNCTION public.create_default_user_aisles(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_aisles (user_id, name, display_order, color)
    VALUES 
        (p_user_id, 'Produce', 1, '#22c55e'),
        (p_user_id, 'Dairy', 2, '#f97316'),
        (p_user_id, 'Meat & Seafood', 3, '#ef4444'),
        (p_user_id, 'Bakery', 4, '#f59e0b'),
        (p_user_id, 'Pantry', 5, '#6366f1'),
        (p_user_id, 'Frozen', 6, '#0ea5e9'),
        (p_user_id, 'Personal Care', 7, '#ec4899'),
        (p_user_id, 'Household', 8, '#14b8a6'),
        (p_user_id, 'Other', 9, '#6b7280')
    ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to increment item usage counts
CREATE OR REPLACE FUNCTION public.increment_item_usage(
    p_user_id UUID,
    p_item_name TEXT,
    p_last_aisle TEXT DEFAULT NULL,
    p_last_quantity INTEGER DEFAULT NULL
)
RETURNS public.shopping_item_usage AS $$
DECLARE
    v_item_name TEXT := trim(both FROM p_item_name);
    v_usage public.shopping_item_usage;
BEGIN
    IF v_item_name IS NULL OR v_item_name = '' THEN
        RAISE EXCEPTION 'Item name cannot be empty';
    END IF;

    INSERT INTO public.shopping_item_usage (
        user_id,
        item_name,
        purchase_count,
        last_aisle,
        last_quantity,
        last_purchased_at
    )
    VALUES (
        p_user_id,
        v_item_name,
        1,
        p_last_aisle,
        p_last_quantity,
        timezone('utc'::text, now())
    )
    ON CONFLICT (user_id, item_name)
    DO UPDATE SET
        purchase_count = public.shopping_item_usage.purchase_count + 1,
        last_aisle = COALESCE(EXCLUDED.last_aisle, public.shopping_item_usage.last_aisle),
        last_quantity = COALESCE(EXCLUDED.last_quantity, public.shopping_item_usage.last_quantity),
        last_purchased_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    RETURNING * INTO v_usage;

    RETURN v_usage;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- Triggers for updated_at timestamps
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.shopping_lists
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.shopping_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_aisles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.shopping_item_usage
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for setting list order on new lists
CREATE TRIGGER set_list_order_trigger BEFORE INSERT ON public.shopping_lists
    FOR EACH ROW EXECUTE FUNCTION public.set_new_list_order();

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_aisles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_item_usage ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 7. RLS POLICIES - SHOPPING LISTS
-- =============================================================================

CREATE POLICY "Users can view their own shopping lists" ON public.shopping_lists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping lists" ON public.shopping_lists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping lists" ON public.shopping_lists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping lists" ON public.shopping_lists
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 8. RLS POLICIES - SHOPPING ITEMS
-- =============================================================================

CREATE POLICY "Users can view their own shopping items" ON public.shopping_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping items" ON public.shopping_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping items" ON public.shopping_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping items" ON public.shopping_items
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 9. RLS POLICIES - SHOPPING ITEM USAGE
-- =============================================================================

CREATE POLICY "Users can manage their own item usage" ON public.shopping_item_usage
    FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- 10. RLS POLICIES - USER PREFERENCES
-- =============================================================================

CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- 11. RLS POLICIES - USER AISLES
-- =============================================================================

CREATE POLICY "Users can manage their own aisles" ON public.user_aisles
    FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- 12. INITIAL DATA SETUP
-- =============================================================================

-- Update existing data to ensure consistency
DO $$
BEGIN
    -- Set list_order for existing lists without it
    UPDATE public.shopping_lists 
    SET list_order = subquery.row_num - 1
    FROM (
        SELECT 
            id, 
            ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
        FROM public.shopping_lists
        WHERE list_order = 0
    ) subquery
    WHERE public.shopping_lists.id = subquery.id
    AND public.shopping_lists.list_order = 0;

    -- Set the most recent list per user as active if none is active
    UPDATE public.shopping_lists 
    SET is_active = true
    WHERE id IN (
        SELECT DISTINCT ON (user_id) id 
        FROM public.shopping_lists 
        WHERE user_id NOT IN (
            SELECT user_id FROM public.shopping_lists WHERE is_active = true
        )
        ORDER BY user_id, created_at DESC
    );
END $$;

-- =============================================================================
-- 13. TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE public.shopping_lists IS 'Shopping lists with RLS - users can only access their own lists';
COMMENT ON TABLE public.shopping_items IS 'Shopping items with RLS - users can only access their own items';
COMMENT ON TABLE public.user_preferences IS 'User preferences with RLS - users can only access their own preferences';
COMMENT ON TABLE public.user_aisles IS 'User custom aisles with RLS - users can only access their own aisles';
COMMENT ON TABLE public.shopping_item_usage IS 'Aggregated counts tracking how often a user has added each item';

-- Column comments
COMMENT ON COLUMN public.shopping_items.comment IS 'Optional comment or note for the shopping item';
COMMENT ON COLUMN public.user_preferences.language IS 'User preferred language (en, es, etc.)';
COMMENT ON COLUMN public.user_preferences.theme IS 'User preferred theme (light, dark, system)';
COMMENT ON COLUMN public.shopping_lists.is_active IS 'Indicates the currently active list for the user';
COMMENT ON COLUMN public.shopping_lists.list_order IS 'Display order of lists for the user';
COMMENT ON COLUMN public.shopping_item_usage.purchase_count IS 'Number of times the user has added this item';
COMMENT ON COLUMN public.shopping_item_usage.last_purchased_at IS 'Timestamp of the most recent time the user added this item';
COMMENT ON COLUMN public.shopping_item_usage.last_aisle IS 'Most recent aisle selected when adding this item';
COMMENT ON COLUMN public.shopping_item_usage.last_quantity IS 'Most recent quantity selected when adding this item';

-- =============================================================================
-- 14. GRANTS
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant usage on all sequences in schema public to anon;

-- =============================================================================
-- SCHEMA COMPLETE
-- =============================================================================
