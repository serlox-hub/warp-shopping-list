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
-- 2. INDEXES FOR PERFORMANCE
-- =============================================================================

-- List Members indexes (critical for membership queries)
CREATE INDEX IF NOT EXISTS idx_list_members_user_id ON public.list_members(user_id);
CREATE INDEX IF NOT EXISTS idx_list_members_list_id ON public.list_members(list_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_list_members_active_per_user
    ON public.list_members(user_id)
    WHERE is_active = true;

COMMENT ON INDEX idx_list_members_active_per_user IS 'Ensures each user has only one active list';

-- List Invites indexes (for token validation)
CREATE INDEX IF NOT EXISTS idx_list_invites_token ON public.list_invites(token);
CREATE INDEX IF NOT EXISTS idx_list_invites_list_id ON public.list_invites(list_id);
CREATE INDEX IF NOT EXISTS idx_list_invites_active ON public.list_invites(list_id, expires_at, revoked_at)
    WHERE revoked_at IS NULL;

-- List Aisles indexes (for aisle queries by list)
CREATE INDEX IF NOT EXISTS idx_list_aisles_list_id ON public.list_aisles(list_id);
CREATE INDEX IF NOT EXISTS idx_list_aisles_list_order ON public.list_aisles(list_id, display_order);

-- Shopping Items indexes (optimized for list-based queries)
CREATE INDEX IF NOT EXISTS idx_shopping_items_list_id ON public.shopping_items(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_aisle_id ON public.shopping_items(aisle_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_active ON public.shopping_items(shopping_list_id, active)
    WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_shopping_items_purchase_history ON public.shopping_items(shopping_list_id, purchase_count DESC, last_purchased_at DESC)
    WHERE active = true AND purchase_count > 0;
CREATE INDEX IF NOT EXISTS idx_shopping_items_comment ON public.shopping_items
    USING gin(to_tsvector('english', comment))
    WHERE comment IS NOT NULL;

-- User Preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_aisles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES - SHOPPING LISTS
-- =============================================================================
-- Users can only access lists they are members of

CREATE POLICY "Users can view lists they are members of"
    ON public.shopping_lists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = shopping_lists.id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create new lists"
    ON public.shopping_lists FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "List members can update list details"
    ON public.shopping_lists FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = shopping_lists.id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can delete lists (via leave_list function)"
    ON public.shopping_lists FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = shopping_lists.id
            AND list_members.user_id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - LIST MEMBERS
-- =============================================================================
-- Users can manage their own membership and view other members of their lists

CREATE POLICY "Users can view members of lists they belong to"
    ON public.list_members FOR SELECT
    USING (
        -- Can see their own membership
        user_id = auth.uid()
        OR
        -- Can see other members of lists they're in
        EXISTS (
            SELECT 1 FROM public.list_members lm
            WHERE lm.list_id = list_members.list_id
            AND lm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join lists (via invite function)"
    ON public.list_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own membership (set active list)"
    ON public.list_members FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can leave lists (delete own membership)"
    ON public.list_members FOR DELETE
    USING (user_id = auth.uid());

-- =============================================================================
-- RLS POLICIES - LIST INVITES
-- =============================================================================
-- List members can create/revoke invites; all authenticated users can read for validation

CREATE POLICY "Anyone authenticated can view invites (for validation)"
    ON public.list_invites FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "List members can create invites"
    ON public.list_invites FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = list_invites.list_id
            AND list_members.user_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "List members can revoke invites"
    ON public.list_invites FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = list_invites.list_id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can delete invites"
    ON public.list_invites FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = list_invites.list_id
            AND list_members.user_id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - LIST AISLES
-- =============================================================================
-- List members can manage aisles for their lists

CREATE POLICY "List members can view aisles"
    ON public.list_aisles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = list_aisles.list_id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can create aisles"
    ON public.list_aisles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = list_aisles.list_id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can update aisles"
    ON public.list_aisles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = list_aisles.list_id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can delete aisles"
    ON public.list_aisles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = list_aisles.list_id
            AND list_members.user_id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - SHOPPING ITEMS
-- =============================================================================
-- List members can manage items in their lists

CREATE POLICY "List members can view items"
    ON public.shopping_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = shopping_items.shopping_list_id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can create items"
    ON public.shopping_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = shopping_items.shopping_list_id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can update items"
    ON public.shopping_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = shopping_items.shopping_list_id
            AND list_members.user_id = auth.uid()
        )
    );

CREATE POLICY "List members can delete items"
    ON public.shopping_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.list_members
            WHERE list_members.list_id = shopping_items.shopping_list_id
            AND list_members.user_id = auth.uid()
        )
    );

-- =============================================================================
-- RLS POLICIES - USER PREFERENCES
-- =============================================================================
-- Users can only manage their own preferences (unchanged from original)

CREATE POLICY "Users can manage their own preferences"
    ON public.user_preferences FOR ALL
    USING (auth.uid() = user_id);

-- =============================================================================
-- 4. DATABASE FUNCTIONS
-- =============================================================================

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_updated_at IS 'Automatically updates updated_at timestamp on row updates';

-- Function to generate secure random token for invites
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    result TEXT := '';
    i INTEGER;
BEGIN
    -- Generate 32 character URL-safe token
    FOR i IN 1..32 LOOP
        result := result || substr(chars, 1 + (random() * (length(chars) - 1))::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION public.generate_invite_token IS 'Generates a 32-character URL-safe random token';

-- Function to create default aisles for a new list
CREATE OR REPLACE FUNCTION public.create_default_list_aisles(p_list_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.list_aisles (list_id, name, display_order, color)
    VALUES
        (p_list_id, 'Produce', 1, '#22c55e'),
        (p_list_id, 'Dairy', 2, '#f97316'),
        (p_list_id, 'Meat & Seafood', 3, '#ef4444'),
        (p_list_id, 'Bakery', 4, '#f59e0b'),
        (p_list_id, 'Pantry', 5, '#6366f1'),
        (p_list_id, 'Frozen', 6, '#0ea5e9'),
        (p_list_id, 'Personal Care', 7, '#ec4899'),
        (p_list_id, 'Household', 8, '#14b8a6'),
        (p_list_id, 'Other', 9, '#6b7280')
    ON CONFLICT (list_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.create_default_list_aisles IS 'Creates default shopping aisles for a new list';

-- Function to generate a shareable invite link for a list
CREATE OR REPLACE FUNCTION public.generate_list_invite(
    p_list_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    invite_id UUID,
    token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_token TEXT;
    v_invite_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Verify user is a member of the list
    IF NOT EXISTS (
        SELECT 1 FROM public.list_members
        WHERE list_id = p_list_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this list';
    END IF;

    -- Generate unique token
    LOOP
        v_token := public.generate_invite_token();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.list_invites WHERE token = v_token);
    END LOOP;

    -- Set expiration to 7 days from now
    v_expires_at := timezone('utc'::text, now()) + INTERVAL '7 days';

    -- Insert invite
    INSERT INTO public.list_invites (list_id, token, created_by, expires_at)
    VALUES (p_list_id, v_token, p_user_id, v_expires_at)
    RETURNING id, token, expires_at INTO v_invite_id, v_token, v_expires_at;

    RETURN QUERY SELECT v_invite_id, v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_list_invite IS 'Generates a shareable invite token for a list (7-day expiration)';

-- Function to revoke all active invites for a list
CREATE OR REPLACE FUNCTION public.revoke_list_invites(p_list_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_revoked_count INTEGER;
BEGIN
    -- Revoke all non-revoked invites for this list
    UPDATE public.list_invites
    SET revoked_at = timezone('utc'::text, now())
    WHERE list_id = p_list_id
      AND revoked_at IS NULL
      AND expires_at > timezone('utc'::text, now());

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;
    RETURN v_revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.revoke_list_invites IS 'Revokes all active invites for a list, returns count of revoked invites';

-- Function to join a list via invite token
CREATE OR REPLACE FUNCTION public.join_list_via_invite(
    p_token TEXT,
    p_user_id UUID
)
RETURNS TABLE (
    list_id UUID,
    list_name TEXT,
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_invite RECORD;
    v_list RECORD;
    v_joined_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Find and validate invite
    SELECT li.list_id, li.expires_at, li.revoked_at
    INTO v_invite
    FROM public.list_invites li
    WHERE li.token = p_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid invite token';
    END IF;

    IF v_invite.revoked_at IS NOT NULL THEN
        RAISE EXCEPTION 'This invite has been revoked';
    END IF;

    IF v_invite.expires_at < timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'This invite has expired';
    END IF;

    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM public.list_members
        WHERE list_members.list_id = v_invite.list_id
        AND list_members.user_id = p_user_id
    ) THEN
        -- Already a member, just return the list info
        SELECT sl.id, sl.name INTO v_list
        FROM public.shopping_lists sl
        WHERE sl.id = v_invite.list_id;

        RETURN QUERY SELECT v_list.id, v_list.name, timezone('utc'::text, now());
        RETURN;
    END IF;

    -- Add user to list
    v_joined_at := timezone('utc'::text, now());
    INSERT INTO public.list_members (list_id, user_id, is_active, joined_at)
    VALUES (v_invite.list_id, p_user_id, false, v_joined_at);

    -- Get list details
    SELECT sl.id, sl.name INTO v_list
    FROM public.shopping_lists sl
    WHERE sl.id = v_invite.list_id;

    RETURN QUERY SELECT v_list.id, v_list.name, v_joined_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.join_list_via_invite IS 'Joins a user to a list using an invite token, validates token expiration and revocation';

-- Function to leave a list (removes membership, deletes list if last member)
CREATE OR REPLACE FUNCTION public.leave_list(
    p_list_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    was_last_member BOOLEAN,
    list_deleted BOOLEAN
) AS $$
DECLARE
    v_member_count INTEGER;
    v_was_last BOOLEAN;
BEGIN
    -- Verify user is a member
    IF NOT EXISTS (
        SELECT 1 FROM public.list_members
        WHERE list_id = p_list_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this list';
    END IF;

    -- Count members before deletion
    SELECT COUNT(*) INTO v_member_count
    FROM public.list_members
    WHERE list_id = p_list_id;

    v_was_last := (v_member_count = 1);

    -- Remove user from list
    DELETE FROM public.list_members
    WHERE list_id = p_list_id AND user_id = p_user_id;

    -- If last member, delete the list (CASCADE will handle items and aisles)
    IF v_was_last THEN
        DELETE FROM public.shopping_lists WHERE id = p_list_id;
    END IF;

    RETURN QUERY SELECT v_was_last, v_was_last;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.leave_list IS 'Removes user from list membership, auto-deletes list if they were the last member';

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

COMMENT ON FUNCTION public.increment_purchase_count IS 'Trigger function to increment purchase_count when item marked as completed';

-- Function to create default user preferences
CREATE OR REPLACE FUNCTION public.create_default_user_preferences(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id, language, theme)
    VALUES (p_user_id, 'en', 'system')
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.create_default_user_preferences IS 'Creates default preferences for a new user';

-- =============================================================================
-- DATABASE FUNCTIONS COMPLETE - TRIGGERS IN NEXT SECTION
-- =============================================================================
