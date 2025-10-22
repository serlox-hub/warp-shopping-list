-- =============================================================================
-- 1. CORE TABLES
-- =============================================================================
-- NOTE: Tables must be created in dependency order:
-- 1. shopping_lists (no dependencies)
-- 2. user_preferences (no dependencies)
-- 3. user_aisles (no dependencies, but needed before shopping_items)
-- 4. shopping_items (depends on shopping_lists and user_aisles)

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

-- User Aisles table (must be created before shopping_items due to FK constraint)
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

-- Shopping Items table
CREATE TABLE IF NOT EXISTS public.shopping_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shopping_list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    aisle_id UUID REFERENCES public.user_aisles(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    completed BOOLEAN NOT NULL DEFAULT false,
    purchase_count INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_purchased_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON COLUMN public.shopping_items.active IS 'Soft delete flag: true = item is active in list, false = item has been cleared but history is preserved';

-- =============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- =============================================================================

-- Shopping Lists indexes
CREATE INDEX IF NOT EXISTS shopping_lists_user_id_idx ON public.shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS shopping_lists_user_order_idx ON public.shopping_lists(user_id, list_order);

-- Shopping Items indexes
CREATE INDEX IF NOT EXISTS shopping_items_shopping_list_id_idx ON public.shopping_items(shopping_list_id);
CREATE INDEX IF NOT EXISTS shopping_items_user_id_idx ON public.shopping_items(user_id);
CREATE INDEX IF NOT EXISTS shopping_items_aisle_id_idx ON public.shopping_items(aisle_id);
CREATE INDEX IF NOT EXISTS shopping_items_purchase_count_idx ON public.shopping_items(user_id, purchase_count DESC);
CREATE INDEX IF NOT EXISTS idx_shopping_items_comment ON public.shopping_items USING gin(to_tsvector('english', comment)) WHERE comment IS NOT NULL;

-- Shopping Items active field indexes (for soft delete functionality)
CREATE INDEX IF NOT EXISTS shopping_items_active_idx ON public.shopping_items(shopping_list_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS shopping_items_user_active_purchase_idx ON public.shopping_items(user_id, active, purchase_count DESC, last_purchased_at DESC) WHERE active = true AND purchase_count > 0;

-- User Preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- User Aisles indexes
CREATE INDEX IF NOT EXISTS idx_user_aisles_user_id ON public.user_aisles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_aisles_user_order ON public.user_aisles(user_id, display_order);

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

-- Function to increment purchase count when item is marked as completed
CREATE OR REPLACE FUNCTION public.increment_purchase_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment if item is being marked as completed (not already completed)
    IF NEW.completed = true AND OLD.completed = false THEN
        NEW.purchase_count = OLD.purchase_count + 1;
        NEW.last_purchased_at = timezone('utc'::text, now());
    END IF;
    RETURN NEW;
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

-- Trigger for setting list order on new lists
CREATE TRIGGER set_list_order_trigger BEFORE INSERT ON public.shopping_lists
    FOR EACH ROW EXECUTE FUNCTION public.set_new_list_order();

-- Trigger to increment purchase count when item is completed
CREATE TRIGGER increment_purchase_count_trigger BEFORE UPDATE ON public.shopping_items
    FOR EACH ROW EXECUTE FUNCTION public.increment_purchase_count();

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_aisles ENABLE ROW LEVEL SECURITY;

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
-- 9. RLS POLICIES - USER PREFERENCES
-- =============================================================================

CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- 10. RLS POLICIES - USER AISLES
-- =============================================================================

CREATE POLICY "Users can manage their own aisles" ON public.user_aisles
    FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- 11. INITIAL DATA SETUP
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
-- 12. TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE public.shopping_lists IS 'Shopping lists with RLS - users can only access their own lists';
COMMENT ON TABLE public.shopping_items IS 'Shopping items with RLS - users can only access their own items. Includes purchase tracking.';
COMMENT ON TABLE public.user_preferences IS 'User preferences with RLS - users can only access their own preferences';
COMMENT ON TABLE public.user_aisles IS 'User custom aisles with RLS - users can only access their own aisles';

-- Column comments for shopping_lists
COMMENT ON COLUMN public.shopping_lists.is_active IS 'Indicates the currently active list for the user';
COMMENT ON COLUMN public.shopping_lists.list_order IS 'Display order of lists for the user';

-- Column comments for shopping_items
COMMENT ON COLUMN public.shopping_items.aisle_id IS 'Foreign key to user_aisles table. NULL allowed if aisle was deleted.';
COMMENT ON COLUMN public.shopping_items.comment IS 'Optional comment or note for the shopping item';
COMMENT ON COLUMN public.shopping_items.purchase_count IS 'Number of times this item has been marked as completed';
COMMENT ON COLUMN public.shopping_items.last_purchased_at IS 'Timestamp of the most recent time this item was marked as completed';

-- Column comments for user_preferences
COMMENT ON COLUMN public.user_preferences.language IS 'User preferred language (en, es, etc.)';
COMMENT ON COLUMN public.user_preferences.theme IS 'User preferred theme (light, dark, system)';

-- =============================================================================
-- 13. GRANTS
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant usage on all sequences in schema public to anon;

-- =============================================================================
-- SCHEMA COMPLETE
-- =============================================================================
