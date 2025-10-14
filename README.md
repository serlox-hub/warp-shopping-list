# Shopping List App

A Next.js application for managing shopping lists with items organized by store aisles.

## Features

- ✅ Add, edit, and delete shopping items
- 🏪 Organize items by store aisles (Produce, Dairy, Meat & Seafood, etc.)
- ✔️ Mark items as completed
- 📊 Progress tracking with completion counter and progress bar
- 💾 Local storage persistence (data saved in browser)
- 📱 Responsive design with Tailwind CSS
- 🎨 Clean, intuitive interface

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

Make sure you have Node.js and npm installed on your system.

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

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
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- Local Storage - Data persistence

## Project Structure

```
src/
├── app/
│   ├── layout.js          # Root layout
│   ├── page.js            # Main shopping list page
│   └── globals.css        # Global styles
├── components/
│   ├── AddItemForm.js     # Form for adding/editing items
│   ├── AisleSection.js    # Aisle grouping component
│   └── ShoppingItem.js    # Individual item component
└── types/
    └── shoppingList.js    # Data utilities and constants
```

## License

This project is open source and available under the [MIT License](LICENSE).