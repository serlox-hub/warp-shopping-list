-- =============================================================================
-- SIMPLIFY SUPERMARKETS: One supermarket per item (instead of many-to-many)
-- =============================================================================
-- This migration:
-- - Adds supermarket_id column to shopping_items
-- - Migrates existing item_supermarkets data (picks first assignment)
-- - Drops the item_supermarkets table and related objects
-- =============================================================================

-- =============================================================================
-- 1. ADD supermarket_id COLUMN TO shopping_items
-- =============================================================================

ALTER TABLE public.shopping_items
ADD COLUMN IF NOT EXISTS supermarket_id UUID REFERENCES public.list_supermarkets(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.shopping_items.supermarket_id IS 'Optional supermarket assignment for this item';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_shopping_items_supermarket_id ON public.shopping_items(supermarket_id);

-- =============================================================================
-- 2. MIGRATE EXISTING DATA FROM item_supermarkets
-- =============================================================================
-- For items with multiple supermarket assignments, we pick the first one (by created_at)

UPDATE public.shopping_items si
SET supermarket_id = (
    SELECT supermarket_id
    FROM public.item_supermarkets ism
    WHERE ism.item_id = si.id
    ORDER BY ism.created_at ASC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM public.item_supermarkets WHERE item_id = si.id
);

-- =============================================================================
-- 3. DROP item_supermarkets TABLE AND RELATED OBJECTS
-- =============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS handle_item_supermarket_completed_trigger ON public.item_supermarkets;
DROP TRIGGER IF EXISTS increment_purchase_count_from_supermarket_trigger ON public.item_supermarkets;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_item_supermarket_completed();
DROP FUNCTION IF EXISTS public.increment_purchase_count_from_supermarket();

-- Drop the table (this also drops indexes and RLS policies)
DROP TABLE IF EXISTS public.item_supermarkets;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- The model is now simplified:
-- - shopping_items.supermarket_id references list_supermarkets.id
-- - shopping_items.completed is the single source of truth for completion state
-- =============================================================================
