# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pocuo is a collaborative shopping list application built with Next.js 15, React 18, Supabase, and Tailwind CSS. It features real-time synchronization, multi-user lists, aisle-based organization, internationalization (English/Spanish), and theme support (light/dark/system).

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server (localhost:3000)

# Building
npm run build            # Production build
npm start                # Run production build

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report (88%+ expected)
npm run test:ci          # Non-interactive CI mode

# Code Quality
npm run lint             # Run ESLint
```

## Architecture Overview

### Core Data Flow

1. **Authentication Layer**: Supabase Auth with Google OAuth, managed via `AuthContext`
2. **State Management**: React Context API for auth, theme, and language
3. **Data Layer**: Supabase PostgreSQL with Row Level Security (RLS)
4. **Service Layer**: `ShoppingListService` handles all database operations
5. **Real-time Sync**: Supabase real-time subscriptions for multi-user collaboration

### Database Schema

The application uses four main tables:

- **`shopping_lists`**: User's shopping lists (supports multiple lists per user)
- **`shopping_items`**: Items within lists (name, aisle, quantity, completed, comment)
- **`user_preferences`**: User settings (language, theme)
- **`user_aisles`**: Custom aisle configurations (name, display_order, color)

RLS policies ensure users can only access their own data. See `DATABASE_SCHEMA.md` for complete schema documentation.

### Key Architectural Patterns

**Service Layer Pattern**: All database operations go through `ShoppingListService` (src/lib/shoppingListService.js). Never directly call Supabase from components - always use the service layer.

**Aisle Localization**: Aisles are stored in English in the database but displayed in the user's language. Use `mapEnglishToLocalized()` and `mapLocalizedToEnglish()` from `src/types/shoppingList.js` for conversion.

**Item Usage Analytics**: The app tracks purchase frequency and suggests frequently purchased items. This uses a separate `shopping_item_usage` table with special key formatting (`buildItemUsageKey` in shoppingListService.js).

**Context Providers**: The app layout wraps everything in `AuthProvider > LanguageProvider > ThemeProvider`. Components access these via hooks: `useAuth()`, `useTranslations()`, `useTheme()`.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── auth/callback/      # OAuth callback handler
│   ├── preferences/        # User preferences page
│   ├── layout.js           # Root layout with context providers
│   └── page.js             # Main shopping list page
├── components/             # React components
├── contexts/               # React contexts (Auth, Language, Theme)
├── lib/                    # Core services
│   ├── shoppingListService.js  # All database operations
│   ├── userPreferencesService.js
│   ├── supabase.js         # Supabase client initialization
│   └── i18n.js             # i18next configuration
├── types/                  # Type definitions and utilities
│   └── shoppingList.js     # Aisle utilities, constants
├── locales/                # Translation files (en.json, es.json)
└── __tests__/              # Test files mirroring src structure
```

## Working with the Codebase

### Adding New Features

1. Database changes require SQL migrations in Supabase dashboard
2. Add service methods to `ShoppingListService` for data operations
3. Use existing context hooks for auth, theme, and language
4. Follow the component patterns: controlled components, loading states, error handling
5. Add translations to both `src/locales/en.json` and `src/locales/es.json`

### Testing Conventions

- Tests mirror the source structure in `__tests__/`
- Use `@testing-library/react` for component tests
- Mock Supabase calls in service tests
- Target 88%+ coverage maintained by CI/CD
- Run `npm run test:watch` during development

### Supabase Setup

New developers need to:
1. Create a Supabase project at supabase.com
2. Copy `.env.example` to `.env.local` and add credentials
3. Run the unified migration: `20250101_unified_database_schema.sql`
4. Configure Google OAuth (see `SUPABASE_SETUP.md`)

### Style Guidelines

- **Styling**: Tailwind CSS with dark mode support via `dark:` prefix
- **Theme Colors**: Use `indigo` for primary actions, `slate` for neutral, `rose` for danger
- **Components**: Use shared button classes (see `primaryActionClass`, `subtleActionClass`, `dangerActionClass` in page.js)
- **Responsive**: Mobile-first approach, test on various screen sizes

### Internationalization

- Use `useTranslations()` hook in components: `const t = useTranslations()`
- Access translations: `t('key.path')`
- All user-facing text must be translated
- Aisle names require special handling - they're stored in English, displayed localized

### State Management Notes

- **Shopping List State**: Managed in main page.js component, passed down to children
- **Active List**: Only one list can be active at a time (enforced by DB constraint)
- **Real-time Updates**: The app doesn't currently use Supabase real-time subscriptions but the architecture supports adding them
- **Aisle State**: Loaded once on mount, refreshed after updates via `loadUserAisles()`

### Common Gotchas

- Aisle names must always be converted between English (database) and localized (UI)
- When updating items, remember to refresh item usage analytics if name/aisle changes
- RLS policies mean queries automatically filter by `user_id` - don't add manual filters
- The `ShoppingListService` methods throw errors - always wrap in try/catch
- Custom aisles are per-user and stored separately from default aisles
