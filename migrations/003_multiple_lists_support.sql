-- Migration 003: Multiple shopping lists support
-- Created: 2025-01-14
-- Description: Add support for multiple shopping lists per user with active list tracking

-- Add is_active column to shopping_lists table
ALTER TABLE public.shopping_lists 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- Update existing lists - only set the most recent one per user as active
WITH ranked_lists AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM public.shopping_lists
  WHERE is_active = false
)
UPDATE public.shopping_lists 
SET is_active = true 
WHERE id IN (
  SELECT id FROM ranked_lists WHERE rn = 1
);

-- Add unique constraint to ensure only one active list per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_list_per_user 
ON public.shopping_lists (user_id) 
WHERE is_active = true;

-- Add list_order column for sorting lists
ALTER TABLE public.shopping_lists 
ADD COLUMN IF NOT EXISTS list_order INTEGER NOT NULL DEFAULT 0;

-- Update existing lists with order based on creation date
UPDATE public.shopping_lists 
SET list_order = (
  SELECT ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1
  FROM public.shopping_lists s2 
  WHERE s2.user_id = shopping_lists.user_id 
  AND s2.id = shopping_lists.id
);

-- Create index for better performance on list ordering
CREATE INDEX IF NOT EXISTS shopping_lists_user_order_idx 
ON public.shopping_lists (user_id, list_order);

-- Create function to automatically set list_order for new lists
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

-- Create trigger to automatically set order for new lists
DROP TRIGGER IF EXISTS set_list_order_trigger ON public.shopping_lists;
CREATE TRIGGER set_list_order_trigger
  BEFORE INSERT ON public.shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_new_list_order();