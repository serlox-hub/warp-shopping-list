# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Principles

### 1. Code Quality and Best Practices

**ALWAYS apply software engineering best practices:**

- **DRY (Don't Repeat Yourself)**: Extract common logic into reusable functions/components
- **SOLID Principles**: Single responsibility, open/closed, dependency inversion
- **Clean Code**: Self-documenting code with clear naming, minimal comments
- **Performance**: Avoid unnecessary re-renders, optimize expensive operations
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation support
- **Security**: Never expose sensitive data, validate all inputs, follow OWASP guidelines

### 2. Proactive Communication

**ASK when uncertain, don't assume:**

- If a requirement is ambiguous, ask for clarification before implementing
- If there are multiple valid approaches, present options with pros/cons
- If you spot a potential issue in the request, raise it immediately
- If the scope seems large, suggest breaking it into smaller tasks
- If tests/documentation need updating, ask about priority

**Examples of when to ask:**
- "Should this be a modal or a separate page?"
- "Do you want to preserve existing data or allow data loss?"
- "This could impact performance - should I optimize now or later?"
- "I notice this pattern is repeated - should I refactor first?"

### 3. Critical Thinking

**Don't blindly accept all requests:**

- If a request violates best practices, suggest a better approach
- If a request could introduce bugs, explain the risks
- If a request duplicates existing functionality, point it out
- If a request seems overly complex, propose a simpler solution
- If a request conflicts with existing architecture, discuss alternatives

**Examples of constructive pushback:**
- "This approach might cause [issue]. Instead, consider [alternative] because [reason]."
- "I notice we already have [existing solution]. Would it make sense to extend that instead?"
- "This could be simplified by [suggestion], which would also improve [benefit]."
- "This request seems to contradict [previous decision]. Should we revisit that first?"

### 4. Solution Quality Over Speed

**Prioritize doing it right over doing it fast:**

- Understand the full context before coding
- Design the solution before implementing
- Consider edge cases and error handling
- Think about maintainability and future changes
- Balance pragmatism with perfectionism

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

**IMPORTANT: Test-Driven Development Workflow**

When implementing any new feature or making changes to existing functionality, you MUST follow this workflow:

1. **Write/Update Tests First**:
   - Create new tests for new features in `__tests__/` directory
   - Update existing tests if modifying functionality
   - Ensure test coverage for all new code paths

2. **Implement the Feature**:
   - Database changes require SQL migrations in Supabase dashboard
   - Add service methods to `ShoppingListService` for data operations
   - Use existing context hooks for auth, theme, and language
   - Follow the component patterns: controlled components, loading states, error handling
   - Add translations to both `src/locales/en.json` and `src/locales/es.json`

3. **Run Tests**:
   ```bash
   npm test                 # Run all tests
   ```
   - All tests MUST pass before proceeding
   - Fix any failing tests immediately
   - Aim for 88%+ code coverage

4. **Verify Build**:
   ```bash
   npm run build            # Production build must succeed
   ```
   - Build MUST complete without errors
   - Fix any TypeScript/build errors before committing

5. **Final Checks**:
   - Run `npm run lint` to check code quality
   - Test the feature manually in the browser
   - Verify dark mode and responsive design
   - Test in both languages (English/Spanish)

**Never skip the testing and build verification steps. Code without tests or that breaks the build should not be committed.**

### Self-Review Before Completion

**Before marking any task as complete, perform a self-review:**

1. **Code Quality Check**:
   - Is the code DRY? Any duplicated logic that should be extracted?
   - Are names clear and self-documenting?
   - Are there any magic numbers/strings that should be constants?
   - Is error handling comprehensive?
   - Are edge cases covered?

2. **Architecture Check**:
   - Does this follow existing patterns in the codebase?
   - Is the component/function doing too much? (Single Responsibility)
   - Could this be simplified?
   - Is it properly integrated with existing services/contexts?

3. **Performance Check**:
   - Any unnecessary re-renders?
   - Are expensive operations memoized?
   - Could this cause memory leaks?
   - Is data fetching optimized?

4. **Accessibility Check**:
   - Are all interactive elements keyboard accessible?
   - Do images/icons have appropriate aria-labels?
   - Is the semantic HTML correct?
   - Does it work with screen readers?

5. **User Experience Check**:
   - Are loading states handled?
   - Are error messages clear and helpful?
   - Is the UI responsive on mobile?
   - Does it work in both light and dark modes?
   - Is it intuitive for both English and Spanish users?

6. **Suggest Improvements**:
   - If you notice technical debt during implementation, mention it
   - If you see opportunities for refactoring, suggest them
   - If patterns could be improved, propose alternatives
   - Document any known limitations or future considerations

**Example self-review output:**
```
✅ Feature implemented and tested
⚠️ Note: This component could benefit from memoization if performance becomes an issue
💡 Suggestion: Consider extracting the form validation logic into a custom hook for reusability
📝 Future: This would be a good candidate for React Server Components in Next.js 15
```

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

## Real-World Application Examples

### When to Apply Critical Thinking

**Example 1: Request violates existing patterns**
```
User: "Add a new method to fetch items directly in the component"
Response: "I notice we use the service layer pattern for all data operations.
Adding direct Supabase calls in components would break this pattern and make
testing harder. Instead, I suggest adding the method to ShoppingListService.
This keeps the architecture consistent. Does that work for you?"
```

**Example 2: Request could introduce bugs**
```
User: "Remove the loading state from the shopping list"
Response: "Removing the loading state could cause issues:
- Users might interact with stale data
- Race conditions could occur if they add items before data loads
- It would violate our UX pattern of always showing loading states

Could you clarify why you want to remove it? Maybe there's a specific
issue we can address differently?"
```

**Example 3: Request duplicates functionality**
```
User: "Create a new component for displaying aisle colors"
Response: "I see we already have AisleName component that displays aisle
colors (src/components/AisleName.js). Would it make sense to extend that
component instead? This would:
- Maintain consistency across the app
- Reduce code duplication
- Make future changes easier

What specific functionality do you need that AisleName doesn't provide?"
```

### When to Ask for Clarification

**Example 1: Ambiguous requirement**
```
User: "Improve the item list performance"
Response: "I'd like to clarify the performance improvement approach:

1. What specific performance issue are you experiencing?
   - Slow initial load?
   - Laggy interactions?
   - Slow updates?

2. Should I prioritize:
   - Virtualizing the list for large datasets?
   - Memoizing expensive calculations?
   - Optimizing re-renders?

Understanding the specific issue will help me implement the most effective solution."
```

**Example 2: Multiple valid approaches**
```
User: "Add the ability to share shopping lists"
Response: "I can implement list sharing, but there are several approaches
with different tradeoffs:

Option A: Simple URL sharing (read-only)
- ✅ Quick to implement
- ✅ No auth required for viewers
- ❌ No collaboration features

Option B: User-to-user sharing with permissions
- ✅ Full collaboration
- ✅ Permission control (view/edit)
- ❌ More complex, requires invitation system

Option C: Real-time collaborative editing
- ✅ Best UX for multiple users
- ❌ Significant complexity, requires WebSocket setup

Which approach best fits your use case?"
```

### When to Suggest Improvements

**Example 1: Spotting refactoring opportunities**
```
While implementing: "I notice the aisle selector logic is duplicated in
ShoppingItem and QuickAddBar. Should I extract this into a shared hook
(useAisleSelector) before continuing? This would:
- Reduce duplication (~50 lines)
- Make future changes easier
- Ensure consistent behavior

Would add ~15 minutes to this task but save time long-term."
```

**Example 2: Identifying technical debt**
```
After implementation: "✅ Feature complete and tested

⚠️ Note: The shopping list state management is getting complex (page.js is 600+ lines).

💡 Future consideration: This would benefit from:
- Extracting state logic to a custom hook (useShoppingList)
- Moving data fetching to React Query for better caching
- Splitting page.js into smaller components

Not blocking, but worth planning for if we add more features."
```

**Example 3: Security concerns**
```
User: "Store the user's preferences in localStorage"
Response: "I can implement localStorage, but I have a concern:

Currently, user preferences are stored in Supabase with RLS policies.
Moving to localStorage would:
- ❌ Lose sync across devices
- ❌ Make preferences browser-specific
- ❌ Lose the preferences if user clears cache

Alternative: Keep Supabase storage but add an in-memory cache to reduce
database calls. This gives us:
- ✅ Cross-device sync
- ✅ Performance (cached reads)
- ✅ Reliability (DB backup)

Is there a specific reason you prefer localStorage?"
```

## Code Review Checklist

Before submitting any code, verify:

- [ ] Follows TDD workflow (tests → code → verify)
- [ ] Passes all existing tests
- [ ] Adds tests for new functionality
- [ ] Build compiles without errors or warnings
- [ ] Follows existing code patterns and conventions
- [ ] Includes proper error handling
- [ ] Has clear, self-documenting names
- [ ] Works in both light and dark mode
- [ ] Works in both English and Spanish
- [ ] Is accessible (keyboard navigation, ARIA labels)
- [ ] Is responsive on mobile and desktop
- [ ] No console errors or warnings
- [ ] No commented-out code or debug logs
- [ ] Translation keys added to both locale files
- [ ] Database changes documented if applicable
