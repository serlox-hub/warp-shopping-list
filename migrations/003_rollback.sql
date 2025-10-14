-- Rollback for Migration 003
-- Run this ONLY if migration 003 failed partially and needs to be cleaned up

-- Drop the trigger and function
DROP TRIGGER IF EXISTS set_list_order_trigger ON public.shopping_lists;
DROP FUNCTION IF EXISTS public.set_new_list_order();

-- Drop the indexes
DROP INDEX IF EXISTS shopping_lists_user_order_idx;
DROP INDEX IF EXISTS unique_active_list_per_user;

-- Remove the new columns
ALTER TABLE public.shopping_lists DROP COLUMN IF EXISTS list_order;
ALTER TABLE public.shopping_lists DROP COLUMN IF EXISTS is_active;