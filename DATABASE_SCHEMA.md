# Database Schema Documentation

## Overview

This document describes the unified database schema for the Shopping List application. The schema has been consolidated into a single, clean migration file that includes all necessary tables, functions, indexes, and security policies.

## Database Structure

### Core Tables

#### 1. `shopping_lists`
Stores user shopping lists with multi-list support.

```sql
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Shopping List',
    is_active BOOLEAN NOT NULL DEFAULT false,
    list_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

**Key Features:**
- Each user can have multiple lists
- Only one list can be active at a time (enforced by unique constraint)
- Lists are ordered for display purposes
- Automatic timestamping with triggers

#### 2. `shopping_items`
Stores individual items within shopping lists.

```sql
CREATE TABLE shopping_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    aisle TEXT NOT NULL DEFAULT 'Other',
    quantity INTEGER NOT NULL DEFAULT 1,
    completed BOOLEAN NOT NULL DEFAULT false,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

**Key Features:**
- Items belong to specific lists and users
- Support for aisles, quantities, and completion status
- Optional comments for additional notes
- Full-text search index on comments

#### 3. `user_preferences`
Stores user-specific preferences and settings.

```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es')),
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(user_id)
);
```

**Key Features:**
- One preferences record per user
- Multi-language support (English/Spanish)
- Theme preferences (light/dark/system)
- Validated with CHECK constraints

#### 4. `user_aisles`
Stores custom aisle configurations per user.

```sql
CREATE TABLE user_aisles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(user_id, name)
);
```

**Key Features:**
- Customizable aisle names per user
- Ordered display with `display_order`
- Default aisles created automatically for new users

## Security (Row Level Security)

All tables have RLS enabled with policies that ensure users can only access their own data:

- **Shopping Lists**: Users can only view/modify their own lists
- **Shopping Items**: Users can only view/modify items in their own lists
- **User Preferences**: Users can only manage their own preferences
- **User Aisles**: Users can only manage their own custom aisles

## Performance Optimizations

### Indexes Created

- `shopping_lists_user_id_idx`: Fast user list lookups
- `shopping_lists_user_order_idx`: Ordered list display
- `shopping_items_shopping_list_id_idx`: Fast item-by-list queries
- `shopping_items_user_id_idx`: Fast user item queries
- `idx_shopping_items_comment`: Full-text search on comments
- `idx_user_preferences_user_id`: Fast user preference lookups
- `idx_user_aisles_user_id`: Fast user aisle queries
- `idx_user_aisles_user_order`: Ordered aisle display

### Constraints

- `unique_active_list_per_user`: Ensures only one active list per user
- Unique constraints on user preferences and user aisle names
- Check constraints for valid language and theme values

## Utility Functions

### Core Functions

#### `handle_updated_at()`
Trigger function that automatically updates the `updated_at` timestamp on row modifications.

#### `set_new_list_order()`
Trigger function that automatically assigns the next available list order to new shopping lists.

#### `create_default_user_preferences(p_user_id UUID)`
Creates default preferences (English language, system theme) for a new user.

#### `create_default_user_aisles(p_user_id UUID)`
Creates default aisles for a new user:
1. Produce
2. Dairy
3. Meat & Seafood
4. Bakery
5. Pantry
6. Frozen
7. Personal Care
8. Household
9. Other

## Migration Information

- **File**: `20250101_unified_database_schema.sql`
- **Applied**: Successfully applied to remote database
- **Previous Migrations**: All previous migration files have been consolidated and removed
- **Status**: Clean, unified schema ready for production use

## Data Integrity Features

1. **Cascading Deletes**: When a user is deleted, all their data is automatically removed
2. **Referential Integrity**: All foreign keys are properly enforced
3. **Automatic Timestamping**: All tables have creation and update timestamps
4. **Data Validation**: Check constraints ensure data quality
5. **Unique Constraints**: Prevent duplicate data where appropriate

## Usage Notes

- The schema is designed to be idempotent - it can be safely re-run
- All `CREATE` statements use `IF NOT EXISTS` for safety
- Existing data is preserved and updated to match the new schema
- RLS policies ensure data security without application-level checks needed