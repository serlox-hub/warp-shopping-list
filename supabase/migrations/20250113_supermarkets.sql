-- =============================================================================
-- SUPERMARKETS FEATURE - LIST-SCOPED SUPERMARKETS WITH ITEM ASSIGNMENTS
-- =============================================================================
-- This migration adds:
-- - list_supermarkets: Supermarkets scoped to each list (shared by all members)
-- - item_supermarkets: Many-to-many with independent completion tracking
-- =============================================================================

-- =============================================================================
-- 1. NEW TABLES
-- =============================================================================

-- List Supermarkets table (similar to list_aisles - list-scoped)
CREATE TABLE IF NOT EXISTS public.list_supermarkets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#6b7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(list_id, name)
);

COMMENT ON TABLE public.list_supermarkets IS 'Supermarkets scoped to lists (shared by all list members)';
COMMENT ON COLUMN public.list_supermarkets.list_id IS 'The list this supermarket belongs to';
COMMENT ON COLUMN public.list_supermarkets.color IS 'Hex color for visual identification';

-- Item Supermarkets junction table (many-to-many with completion state)
CREATE TABLE IF NOT EXISTS public.item_supermarkets (
    item_id UUID REFERENCES public.shopping_items(id) ON DELETE CASCADE NOT NULL,
    supermarket_id UUID REFERENCES public.list_supermarkets(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (item_id, supermarket_id)
);

COMMENT ON TABLE public.item_supermarkets IS 'Junction table linking items to supermarkets with independent completion tracking';
COMMENT ON COLUMN public.item_supermarkets.completed IS 'Whether this item is completed at this specific supermarket';
COMMENT ON COLUMN public.item_supermarkets.completed_at IS 'When this item was marked as completed at this supermarket';

-- =============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- =============================================================================

-- List Supermarkets indexes
CREATE INDEX IF NOT EXISTS idx_list_supermarkets_list_id ON public.list_supermarkets(list_id);
CREATE INDEX IF NOT EXISTS idx_list_supermarkets_list_order ON public.list_supermarkets(list_id, display_order);

-- Item Supermarkets indexes
CREATE INDEX IF NOT EXISTS idx_item_supermarkets_item ON public.item_supermarkets(item_id);
CREATE INDEX IF NOT EXISTS idx_item_supermarkets_supermarket ON public.item_supermarkets(supermarket_id);
CREATE INDEX IF NOT EXISTS idx_item_supermarkets_completed ON public.item_supermarkets(supermarket_id, completed)
    WHERE completed = false;

-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE public.list_supermarkets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_supermarkets ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES - LIST SUPERMARKETS
-- =============================================================================
-- List members can manage supermarkets for their lists (same pattern as aisles)

CREATE POLICY "List members can view supermarkets"
    ON public.list_supermarkets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = list_supermarkets.list_id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can create supermarkets"
    ON public.list_supermarkets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = list_supermarkets.list_id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can update supermarkets"
    ON public.list_supermarkets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = list_supermarkets.list_id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can delete supermarkets"
    ON public.list_supermarkets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = list_supermarkets.list_id
            AND list_members.user_id = auth.uid()
        )
    );

-- Service policies for cascade deletes
CREATE POLICY "Service can delete supermarkets"
    ON public.list_supermarkets FOR DELETE
    USING (auth.uid() IS NULL);

CREATE POLICY "Service can view supermarkets"
    ON public.list_supermarkets FOR SELECT
    USING (auth.uid() IS NULL);

CREATE POLICY "Service can insert supermarkets"
    ON public.list_supermarkets FOR INSERT
    WITH CHECK (auth.uid() IS NULL);

-- =============================================================================
-- RLS POLICIES - ITEM SUPERMARKETS
-- =============================================================================
-- Access controlled via item's list membership

CREATE POLICY "List members can view item supermarkets"
    ON public.item_supermarkets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shopping_items si
            JOIN public.list_members lm ON lm.list_id = si.shopping_list_id
            WHERE si.id = item_supermarkets.item_id
            AND lm.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can create item supermarkets"
    ON public.item_supermarkets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shopping_items si
            JOIN public.list_members lm ON lm.list_id = si.shopping_list_id
            WHERE si.id = item_supermarkets.item_id
            AND lm.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can update item supermarkets"
    ON public.item_supermarkets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.shopping_items si
            JOIN public.list_members lm ON lm.list_id = si.shopping_list_id
            WHERE si.id = item_supermarkets.item_id
            AND lm.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can delete item supermarkets"
    ON public.item_supermarkets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.shopping_items si
            JOIN public.list_members lm ON lm.list_id = si.shopping_list_id
            WHERE si.id = item_supermarkets.item_id
            AND lm.user_id = auth.uid()
        )
    );

-- Service policies for cascade deletes
CREATE POLICY "Service can delete item supermarkets"
    ON public.item_supermarkets FOR DELETE
    USING (auth.uid() IS NULL);

CREATE POLICY "Service can view item supermarkets"
    ON public.item_supermarkets FOR SELECT
    USING (auth.uid() IS NULL);

CREATE POLICY "Service can insert item supermarkets"
    ON public.item_supermarkets FOR INSERT
    WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "Service can update item supermarkets"
    ON public.item_supermarkets FOR UPDATE
    USING (auth.uid() IS NULL);

-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

-- Trigger for updated_at on list_supermarkets
CREATE TRIGGER handle_updated_at_list_supermarkets
    BEFORE UPDATE ON public.list_supermarkets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to update completed_at when item_supermarkets.completed changes
CREATE OR REPLACE FUNCTION public.handle_item_supermarket_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed = true AND OLD.completed = false THEN
        NEW.completed_at = timezone('utc'::text, now());
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_item_supermarket_completed IS 'Updates completed_at timestamp when item supermarket completion status changes';

CREATE TRIGGER handle_item_supermarket_completed_trigger
    BEFORE UPDATE ON public.item_supermarkets
    FOR EACH ROW
    WHEN (OLD.completed IS DISTINCT FROM NEW.completed)
    EXECUTE FUNCTION public.handle_item_supermarket_completed();

-- Trigger to increment purchase_count on shopping_items when completed in a supermarket
CREATE OR REPLACE FUNCTION public.increment_purchase_count_from_supermarket()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment if item is being marked as completed (not already completed)
    IF NEW.completed = true AND OLD.completed = false THEN
        UPDATE public.shopping_items
        SET purchase_count = purchase_count + 1,
            last_purchased_at = timezone('utc'::text, now())
        WHERE id = NEW.item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.increment_purchase_count_from_supermarket IS 'Increments purchase_count on shopping_items when item is marked as completed in a supermarket';

CREATE TRIGGER increment_purchase_count_from_supermarket_trigger
    AFTER UPDATE ON public.item_supermarkets
    FOR EACH ROW
    WHEN (OLD.completed = false AND NEW.completed = true)
    EXECUTE FUNCTION public.increment_purchase_count_from_supermarket();

-- =============================================================================
-- 5. GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_supermarkets TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_supermarkets TO authenticated, service_role;
GRANT SELECT ON public.list_supermarkets TO anon;
GRANT SELECT ON public.item_supermarkets TO anon;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
