# Database Migrations

This folder contains database migration files for the Shopping List application. Each migration should be run in order.

## How to Apply Migrations

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in numerical order
4. Check that each migration completed successfully before moving to the next

## Migration List

### 001_initial_shopping_tables.sql
- **Created**: 2025-01-14
- **Description**: Initial database setup with shopping_lists and shopping_items tables
- **Tables Created**:
  - `shopping_lists` - Stores user shopping lists
  - `shopping_items` - Stores individual items within lists
- **Features**:
  - Row Level Security (RLS) policies
  - Automatic timestamp updates
  - Foreign key relationships
  - Indexes for performance

### 002_user_preferences.sql
- **Created**: 2025-01-14  
- **Description**: User preferences table for storing theme and other settings
- **Tables Created**:
  - `user_preferences` - Stores user settings like theme preference
- **Features**:
  - Theme constraint (light, dark, system)
  - RLS policies for user isolation
  - Automatic timestamp updates

## Migration Guidelines

### Creating New Migrations

When creating new migrations:

1. **Naming Convention**: `XXX_description.sql` where XXX is the next sequential number
2. **Header Comment**: Include migration number, creation date, and description
3. **Idempotent**: Use `IF NOT EXISTS` or similar to make migrations repeatable
4. **RLS**: Always include Row Level Security policies for new tables
5. **Indexes**: Add indexes for foreign keys and frequently queried columns

### Example Migration Template

```sql
-- Migration XXX: Brief description
-- Created: YYYY-MM-DD
-- Description: Detailed description of changes

-- Your migration SQL here...
```

## Rollback Strategy

Currently, there are no automatic rollback migrations. If you need to rollback:

1. Manually reverse the changes in the SQL editor
2. Or restore from a database backup
3. Consider creating explicit rollback scripts for complex migrations

## Testing Migrations

Before applying to production:

1. Test on a development Supabase project first
2. Verify all constraints and policies work correctly
3. Test with sample data to ensure application functionality
4. Check that existing data is not affected

## Notes

- Always backup your database before running migrations in production
- Test thoroughly in development environment first
- Run migrations during low-traffic periods
- Monitor application logs after migration deployment