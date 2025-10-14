-- Add comment column to shopping_items table
-- This migration adds an optional comment field to existing shopping items

-- Add the comment column
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS comment TEXT DEFAULT '';

-- Update the column to allow null values (optional field)
ALTER TABLE shopping_items
ALTER COLUMN comment DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN shopping_items.comment IS 'Optional comment or note for the shopping item';

-- Create an index on comment for better search performance (optional)
CREATE INDEX IF NOT EXISTS idx_shopping_items_comment 
ON shopping_items(comment) 
WHERE comment IS NOT NULL AND comment != '';