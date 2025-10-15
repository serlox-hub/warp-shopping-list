# Shopping List App

[![CI](https://github.com/your-username/warp-shopping-list/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/warp-shopping-list/actions/workflows/ci.yml)
[![Tests](https://github.com/your-username/warp-shopping-list/actions/workflows/test.yml/badge.svg)](https://github.com/your-username/warp-shopping-list/actions/workflows/test.yml)
[![Build](https://github.com/your-username/warp-shopping-list/actions/workflows/build.yml/badge.svg)](https://github.com/your-username/warp-shopping-list/actions/workflows/build.yml)

A Next.js application for managing shopping lists with items organized by store aisles.

## Features

- ✅ Add, edit, and delete shopping items
- 🏪 Organize items by store aisles (Produce, Dairy, Meat & Seafood, etc.)
- ✔️ Mark items as completed
- 📊 Progress tracking with completion counter and progress bar
- 🔐 User authentication with Supabase
- 🗄️ Database storage with Supabase
- 👥 Multi-user support with list sharing
- 🌐 Internationalization (English/Spanish)
- 🎨 Dark/Light theme support
- 📱 Responsive design with Tailwind CSS
- 🎨 Clean, intuitive interface
- 🧪 Comprehensive test suite (88%+ coverage)

## Store Aisles

Items can be organized into the following aisles:
- Produce
- Dairy
- Meat & Seafood
- Bakery
- Pantry
- Frozen
- Personal Care
- Household
- Other

## Getting Started

### Prerequisites

- Node.js 18+ and npm installed on your system
- Supabase account and project (for database and authentication)

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

### Testing

Run the test suite:
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Usage

1. **Add Items**: Use the form at the top to add new items with name, aisle, and quantity
2. **Edit Items**: Click the "Edit" button next to any item to modify it
3. **Complete Items**: Check the box next to items as you collect them
4. **Delete Items**: Click the "Delete" button to remove items
5. **Clear Completed**: Remove all completed items at once
6. **Clear All**: Start fresh with an empty list

## Built With

- [Next.js 14](https://nextjs.org/) - React framework
- [React 18](https://reactjs.org/) - UI library
- [Supabase](https://supabase.com/) - Database and authentication
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [React i18next](https://react.i18next.com/) - Internationalization
- [Jest](https://jestjs.io/) - Testing framework
- [React Testing Library](https://testing-library.com/react) - Component testing

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

This project maintains high test coverage (88%+) with comprehensive test suites:

- **Unit Tests**: Component, service, and utility testing
- **Integration Tests**: Context and service integration
- **User Interaction Tests**: Real user behavior simulation
- **Error Handling**: Comprehensive error scenario coverage
- **Async Testing**: Proper handling of asynchronous operations

### Test Scripts

```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage report
npm run test:watch    # Watch mode for development
```

## CI/CD

This project includes GitHub Actions workflows:

- **Continuous Integration**: Runs tests on all pushes and PRs
- **Test Suite**: Comprehensive testing with coverage reporting
- **Build Check**: Verifies successful application builds
- **Multi-Node Testing**: Tests against Node.js 18.x and 20.x

## License

This project is open source and available under the [MIT License](LICENSE).