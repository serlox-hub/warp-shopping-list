# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Next.js 14 shopping list application that organizes items by store aisles with Supabase-backed persistence. The app uses React 18, Tailwind CSS for styling, and follows the Next.js App Router pattern.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### Development Workflow
- The development server runs on `http://localhost:3000`
- Changes trigger automatic hot reload in development
- All components are client-side rendered (`'use client'` directive)

## Architecture Overview

### Application Structure
The app follows a single-page application pattern with state management handled entirely on the client side:

- **Main Page** (`src/app/page.js`): Central state container managing all shopping list operations
- **Component Composition**: Hierarchical component structure where the main page orchestrates all interactions
- **Database Integration**: Data persistence handled through Supabase with automatic read/write

### State Management Pattern
The application uses a centralized state management approach:
- All shopping list state lives in the main page component
- Props drilling pattern for passing handlers down to child components
- No external state management library - uses React's built-in useState and useEffect

### Data Flow Architecture
```
Main Page (page.js)
├── Supabase ↔ State synchronization
├── AddItemForm → Add/Edit operations
└── AisleSection → Display & item operations
    └── ShoppingItem → Individual item interactions
```

### Component Responsibilities
- **page.js**: State management, Supabase sync, business logic
- **AddItemForm.js**: Form handling for adding/editing items with dual-mode functionality
- **AisleSection.js**: Groups items by aisle, handles sorting and progress display
- **ShoppingItem.js**: Individual item display and basic interactions (complete, edit, delete)
- **shoppingList.js**: Pure utility functions for data manipulation and constants

## Data Structure

### Shopping Item Schema
Items follow this structure (defined in `src/types/shoppingList.js`):
```javascript
{
  id: string,        // Unique identifier (timestamp + random)
  name: string,      // Item name
  aisle: string,     // Store aisle category
  quantity: number,  // Item quantity
  completed: boolean,// Completion status
  createdAt: string  // ISO timestamp
}
```

### Aisle Categories
The app organizes items into predefined aisles defined in `DEFAULT_AISLES`:
- Produce, Dairy, Meat & Seafood, Bakery, Pantry, Frozen, Personal Care, Household, Other

## Development Patterns

### Component Patterns
- All components use the `'use client'` directive for client-side rendering
- Form components handle both add and edit modes through conditional rendering
- Event handlers are passed down from the main page component
- State updates use functional updates with spread operators for immutability

### Styling Approach
- Tailwind CSS utility classes throughout
- Responsive design with mobile-first approach
- Consistent color scheme (blue for primary actions, red for destructive actions, gray for neutral)
- Form styling follows consistent border-radius and focus states

### File Organization
```
src/
├── app/                # Next.js App Router structure
│   ├── layout.js      # Root layout with metadata
│   ├── page.js        # Main application page
│   └── globals.css    # Global Tailwind imports
├── components/        # React components
│   ├── AddItemForm.js # Dual-purpose add/edit form
│   ├── AisleSection.js# Aisle grouping and display
│   └── ShoppingItem.js# Individual item component
└── types/
    └── shoppingList.js# Data utilities and constants
```

## Data Persistence

The app reads and writes data through Supabase:
- **Shopping Lists & Items**: Stored per user in `shopping_lists` and `shopping_items`
- **Custom Aisles**: Managed in the `user_aisles` table and localized client-side
- **User Preferences**: Theme and language saved in `user_preferences`

## Key Features Implementation

### Item Management
- **Add**: Through AddItemForm with name, aisle, and quantity
- **Edit**: Clicking "Edit" populates the form with existing data
- **Complete**: Checkbox toggles completion status
- **Delete**: Individual item removal with confirmation through onClick
- **Bulk Operations**: Clear completed items or clear all items

### Aisle Organization
- Items are automatically grouped by aisle using `groupItemsByAisle` utility
- Empty aisles are not displayed
- Each aisle shows completion progress (X/Y completed)
- Items within aisles are sorted: incomplete items first, then alphabetical

### Progress Tracking
- Header shows total completion count and percentage
- Visual progress bar reflects completion percentage
- Per-aisle completion counters in section headers

## Troubleshooting Notes

### Common Issues
- **Supabase Access**: Components are client-side rendered while API calls handle persistence
- **State Sync**: Form state is managed independently and syncs with main state on submit
- **ID Generation**: Uses timestamp + random string for temporary client IDs before Supabase returns real IDs

### Development Considerations
- No server-side functionality beyond Supabase interactions
- Requires authentication for personalized lists and preferences
- Data synchronized across devices via Supabase
- No offline functionality once disconnected from Supabase
