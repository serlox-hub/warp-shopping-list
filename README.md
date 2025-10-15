# 🛒 Shopping List App

[![CI](https://github.com/your-username/warp-shopping-list/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/warp-shopping-list/actions/workflows/ci.yml)
[![Tests](https://github.com/your-username/warp-shopping-list/actions/workflows/test.yml/badge.svg)](https://github.com/your-username/warp-shopping-list/actions/workflows/test.yml)
[![Build](https://github.com/your-username/warp-shopping-list/actions/workflows/build.yml/badge.svg)](https://github.com/your-username/warp-shopping-list/actions/workflows/build.yml)
[![Coverage](https://img.shields.io/badge/coverage-88%25-brightgreen)](https://github.com/your-username/warp-shopping-list)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, full-stack Next.js application for managing collaborative shopping lists with real-time synchronization and intuitive aisle-based organization.

## ✨ Features

### 🛒 Core Shopping Experience
- **Smart Item Management**: Add, edit, delete, and organize items with quantity tracking
- **Aisle Organization**: Automatic categorization by store sections (Produce, Dairy, Bakery, etc.)
- **Progress Tracking**: Visual completion counter and progress bar
- **Quick Actions**: Mark items as completed, bulk operations, and smart suggestions

### 👥 Collaboration & Sharing
- **Multi-User Lists**: Create and share shopping lists with family and friends
- **Real-time Sync**: Live updates when multiple users edit the same list
- **User Authentication**: Secure login with Supabase Auth
- **List Management**: Create multiple lists, switch between them seamlessly

### 🎨 User Experience
- **Dark/Light Themes**: System-aware theme switching with manual override
- **Internationalization**: Full support for English and Spanish
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support
- **Custom Aisles**: Personalize and reorder aisle categories

### 🔧 Technical Excellence
- **Real-time Database**: Powered by Supabase with PostgreSQL
- **Type Safety**: Comprehensive data validation and type checking
- **Test Coverage**: 88%+ coverage with Jest and React Testing Library
- **CI/CD Pipeline**: Automated testing, building, and deployment
- **Performance**: Optimized Next.js with SSR and client-side caching

## 🏪 Store Aisles

The app comes with predefined aisles that mirror typical grocery store layouts:

| Aisle | Examples |
|-------|----------|
| 🥬 **Produce** | Fruits, vegetables, herbs |
| 🥛 **Dairy** | Milk, cheese, yogurt, eggs |
| 🥩 **Meat & Seafood** | Fresh meat, fish, poultry |
| 🥖 **Bakery** | Bread, pastries, cakes |
| 🥫 **Pantry** | Canned goods, pasta, rice |
| 🧊 **Frozen** | Frozen foods, ice cream |
| 🧴 **Personal Care** | Toiletries, health items |
| 🧽 **Household** | Cleaning supplies, paper goods |
| 📦 **Other** | Miscellaneous items |

**Customizable**: Users can reorder aisles, rename them, or add custom categories to match their preferred shopping route.

## Getting Started

### Prerequisites

- **Node.js 18+** and **npm** installed on your system
- **Supabase account** and project ([Create free account](https://supabase.com))
- **Git** for version control

> **Note**: This app requires a Supabase backend for authentication and data storage. The free tier is sufficient for personal use.

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/warp-shopping-list.git
cd warp-shopping-list
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### 🧪 Testing

Run the comprehensive test suite:
```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch

# Run tests for CI (non-interactive)
npm run test:ci
```

**Current Test Coverage**: 88.22% overall
- Components: 89.38%
- Services: 93.18% 
- Utilities: 100%

## 📱 Usage Guide

### Getting Started
1. **Sign Up/Login**: Create an account or login with existing credentials
2. **Create Lists**: Start with your first shopping list or use the default one
3. **Add Items**: Use the quick-add form with smart aisle detection

### Core Features

#### 📝 Managing Items
- **Add**: Enter item name, select aisle, specify quantity
- **Edit**: Click edit button to modify any item details
- **Complete**: Check off items as you shop - see real-time progress
- **Delete**: Remove unwanted items individually
- **Bulk Actions**: Clear all completed items or start fresh

#### 📋 List Management
- **Multiple Lists**: Create separate lists for different stores or occasions
- **List Switching**: Quick dropdown to switch between your lists
- **Sharing**: Collaborate with family members on shared lists
- **Real-time Updates**: See changes instantly when others edit shared lists

#### ⚙️ Customization
- **Theme**: Toggle between light/dark mode or use system preference
- **Language**: Switch between English and Spanish
- **Aisles**: Customize aisle order and names to match your shopping routine
- **Preferences**: Settings sync across devices when logged in

## 🛠️ Built With

### Core Technologies
- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[React 18](https://reactjs.org/)** - UI library with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript (via JSDoc)
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework

### Backend & Database
- **[Supabase](https://supabase.com/)** - PostgreSQL database with real-time features
- **[Supabase Auth](https://supabase.com/auth)** - Authentication and user management
- **[Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)** - Database security

### Internationalization & UX
- **[React i18next](https://react.i18next.com/)** - Multi-language support
- **[react-i18next](https://github.com/i18next/react-i18next)** - React integration
- **System Theme Detection** - Automatic dark/light mode

### Testing & Quality
- **[Jest](https://jestjs.io/)** - Testing framework
- **[React Testing Library](https://testing-library.com/react)** - Component testing
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD pipeline
- **[ESLint](https://eslint.org/)** - Code linting

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   └── callback/       # Auth callback handling
│   ├── preferences/        # User preferences page
│   ├── layout.js          # Root layout with providers
│   ├── page.js            # Main shopping list page
│   └── globals.css        # Global styles
├── components/
│   ├── AddItemForm.js     # Form for adding/editing items
│   ├── AisleManager.js    # Aisle customization component
│   ├── AisleSection.js    # Aisle grouping component
│   ├── Header.js          # App header with controls
│   ├── LanguageSwitcher.js # Language selection
│   ├── ListSelector.js    # Shopping list selector
│   ├── LoginForm.js       # Authentication form
│   ├── ShoppingItem.js    # Individual item component
│   └── ThemeToggle.js     # Theme switcher
├── contexts/
│   ├── AuthContext.js     # Authentication state
│   ├── LanguageContext.js # Internationalization
│   └── ThemeContext.js    # Theme management
├── lib/
│   ├── i18n.js            # i18n configuration
│   ├── shoppingListService.js # Database operations
│   ├── supabase.js        # Supabase client
│   └── userPreferencesService.js # User settings
├── types/
│   └── shoppingList.js    # Data utilities and constants
└── __tests__/             # Test files (88%+ coverage)
    ├── components/        # Component tests
    ├── contexts/          # Context tests
    ├── lib/               # Service tests
    └── types/             # Utility tests
```

## Testing

This project maintains **88.22% test coverage** with comprehensive test suites:

### Testing Strategy
- **🧪 Unit Tests**: Individual component and function testing
- **🔗 Integration Tests**: Context providers and service interactions  
- **👆 User Interaction Tests**: Real user behavior with userEvent
- **⚠️ Error Boundary Tests**: Comprehensive error scenario coverage
- **⏱️ Async Testing**: Proper handling of promises and state updates
- **📊 Coverage Tracking**: Detailed reports with uncovered line identification

### Coverage Breakdown
| Category | Coverage | Files |
|----------|----------|-------|
| **Components** | 89.38% | UI components and forms |
| **Services** | 93.18% | API and database services |
| **Contexts** | 73.98% | React context providers |
| **Types/Utils** | 100% | Utility functions and types |
| **Overall** | **88.22%** | **All source files** |

### Test Commands
```bash
# Development
npm test              # Run all tests
npm run test:watch    # Watch mode for development

# Coverage & CI
npm run test:coverage # Generate coverage report
npm run test:ci       # CI mode (non-interactive)
```

## 🚀 CI/CD Pipeline

Robust GitHub Actions workflows ensure code quality and reliability:

### Workflow Overview
| Workflow | Trigger | Purpose | Node Versions |
|----------|---------|---------|---------------|
| **🔄 CI** | All pushes & PRs | Basic testing | 20.x |
| **🧪 Test Suite** | Main branch & PRs | Advanced testing | 18.x, 20.x |
| **🏗️ Build Check** | Main branch & PRs | Build verification | 20.x |

### Pipeline Features
- ✅ **Automated Testing**: Every commit tested before merge
- 📊 **Coverage Reporting**: Automatic coverage comments on PRs
- 🔍 **Multi-Node Testing**: Compatibility across Node.js versions
- 📦 **Build Artifacts**: Temporary build storage for review
- ⚡ **Fast Feedback**: Quick CI for rapid development
- 🛡️ **Quality Gates**: Prevent broken code from reaching main

### Status Monitoring
All workflows provide real-time status via GitHub badges above. Click any badge to see detailed build logs and coverage reports.

## License

This project is open source and available under the [MIT License](LICENSE).