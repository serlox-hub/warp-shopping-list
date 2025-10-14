-- Migration 003 v2: Multiple shopping lists support (FIXED)
-- Created: 2025-01-14
-- Description: Add support for multiple shopping lists per user with active list tracking

-- Step 1: Add columns with default values
ALTER TABLE public.shopping_lists 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.shopping_lists 
ADD COLUMN IF NOT EXISTS list_order INTEGER NOT NULL DEFAULT 0;

-- Step 2: Update list_order for existing lists
UPDATE public.shopping_lists 
SET list_order = subquery.row_num - 1
FROM (
  SELECT 
    id, 
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
  FROM public.shopping_lists
) subquery
WHERE public.shopping_lists.id = subquery.id;

-- Step 3: Set only the most recent list per user as active
UPDATE public.shopping_lists 
SET is_active = true
WHERE id IN (
  SELECT DISTINCT ON (user_id) id 
  FROM public.shopping_lists 
  ORDER BY user_id, created_at DESC
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS shopping_lists_user_order_idx 
ON public.shopping_lists (user_id, list_order);

-- Step 5: Create unique constraint for active lists
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_list_per_user 
ON public.shopping_lists (user_id) 
WHERE is_active = true;

-- Step 6: Create function to automatically set list_order for new lists
CREATE OR REPLACE FUNCTION public.set_new_list_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Set the order as the next available number for this user
  NEW.list_order = COALESCE(
    (SELECT MAX(list_order) + 1 FROM public.shopping_lists WHERE user_id = NEW.user_id),
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to automatically set order for new lists
DROP TRIGGER IF EXISTS set_list_order_trigger ON public.shopping_lists;
CREATE TRIGGER set_list_order_trigger
  BEFORE INSERT ON public.shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_new_list_order();