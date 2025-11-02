-- =============================================================================
-- WARP SHOPPING LIST - UNIFIED DATABASE SCHEMA WITH LIST SHARING
-- =============================================================================
-- This schema supports multi-user collaborative shopping lists with:
-- - List sharing via invite links
-- - List-scoped aisles (shared by all members)
-- - List-scoped purchase history (shared by all members)
-- - User-specific active list tracking
-- =============================================================================

-- =============================================================================
-- 1. CORE TABLES
-- =============================================================================
-- NOTE: Tables must be created in dependency order:
-- 1. shopping_lists (no dependencies)
-- 2. list_members (depends on shopping_lists)
-- 3. list_invites (depends on shopping_lists)
-- 4. list_aisles (depends on shopping_lists)
-- 5. user_preferences (no dependencies)
-- 6. shopping_items (depends on shopping_lists and list_aisles)

-- Shopping Lists table (redesigned for multi-user)
CREATE TABLE IF NOT EXISTS public.shopping_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'My Shopping List',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.shopping_lists IS 'Shopping lists that can be shared among multiple users';
COMMENT ON COLUMN public.shopping_lists.created_by IS 'Original creator of the list (nullable if creator account deleted)';

-- List Members junction table (manages list membership and active state)
CREATE TABLE IF NOT EXISTS public.list_members (
    list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (list_id, user_id)
);

COMMENT ON TABLE public.list_members IS 'Junction table managing which users have access to which lists';
COMMENT ON COLUMN public.list_members.is_active IS 'Whether this list is currently active for this user (only one per user)';

-- List Invites table (manages shareable invite links)
CREATE TABLE IF NOT EXISTS public.list_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE public.list_invites IS 'Invite tokens for sharing lists via shareable links';
COMMENT ON COLUMN public.list_invites.token IS 'Unique URL-safe token for joining the list';
COMMENT ON COLUMN public.list_invites.expires_at IS 'Expiration timestamp (typically 7 days from creation)';
COMMENT ON COLUMN public.list_invites.revoked_at IS 'If set, this invite has been revoked and cannot be used';

-- List Aisles table (replaces user_aisles - now list-scoped)
CREATE TABLE IF NOT EXISTS public.list_aisles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#6b7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(list_id, name)
);

COMMENT ON TABLE public.list_aisles IS 'Shopping aisles scoped to lists (shared by all list members)';
COMMENT ON COLUMN public.list_aisles.list_id IS 'The list this aisle belongs to';

-- User Preferences table (unchanged)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es')),
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

COMMENT ON TABLE public.user_preferences IS 'User preferences with RLS - users can only access their own preferences';
COMMENT ON COLUMN public.user_preferences.language IS 'User preferred language (en, es, etc.)';
COMMENT ON COLUMN public.user_preferences.theme IS 'User preferred theme (light, dark, system)';

-- Shopping Items table (redesigned - no user_id, linked via list membership)
CREATE TABLE IF NOT EXISTS public.shopping_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shopping_list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    aisle_id UUID REFERENCES public.list_aisles(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    completed BOOLEAN NOT NULL DEFAULT false,
    purchase_count INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_purchased_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE public.shopping_items IS 'Shopping items - access controlled via list membership';
COMMENT ON COLUMN public.shopping_items.active IS 'Soft delete flag: true = item is active in list, false = item has been cleared but history is preserved';
COMMENT ON COLUMN public.shopping_items.aisle_id IS 'Foreign key to list_aisles table. NULL allowed if aisle was deleted.';
COMMENT ON COLUMN public.shopping_items.comment IS 'Optional comment or note for the shopping item';
COMMENT ON COLUMN public.shopping_items.purchase_count IS 'Number of times this item has been marked as completed (list-wide)';
COMMENT ON COLUMN public.shopping_items.last_purchased_at IS 'Timestamp of the most recent time this item was marked as completed';

-- =============================================================================
-- SCHEMA STRUCTURE COMPLETE - INDEXES, RLS, AND FUNCTIONS IN NEXT SECTIONS
-- =============================================================================
