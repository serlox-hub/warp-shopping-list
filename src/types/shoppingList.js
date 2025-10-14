// Shopping list data structure utilities

// Default aisles for organizing items
export const DEFAULT_AISLES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Frozen',
  'Personal Care',
  'Household',
  'Other'
];

// Create a new shopping list item
export const createShoppingItem = (name, aisle = 'Other', quantity = 1, completed = false, comment = '') => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  name,
  aisle,
  quantity,
  completed,
  comment: comment || '', // Optional comment field
  createdAt: new Date().toISOString()
});

// Create a new shopping list
export const createShoppingList = (name, items = []) => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  name,
  items,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Group items by aisle using custom or default aisles
export const groupItemsByAisle = (items, customAisles = DEFAULT_AISLES) => {
  const grouped = {};
  
  // Initialize with custom aisles
  customAisles.forEach(aisle => {
    grouped[aisle] = [];
  });
  
  items.forEach(item => {
    if (grouped[item.aisle]) {
      grouped[item.aisle].push(item);
    } else {
      // If item has an aisle not in our list, add it to 'Other' or create the aisle
      if (customAisles.includes('Other')) {
        if (!grouped['Other']) grouped['Other'] = [];
        grouped['Other'].push(item);
      } else {
        // Create the aisle if it doesn't exist
        if (!grouped[item.aisle]) grouped[item.aisle] = [];
        grouped[item.aisle].push(item);
      }
    }
  });
  
  // Remove empty aisles
  Object.keys(grouped).forEach(aisle => {
    if (grouped[aisle].length === 0) {
      delete grouped[aisle];
    }
  });
  
  return grouped;
};

// Sort items within an aisle
export const sortItemsInAisle = (items) => {
  return items.sort((a, b) => {
    // Completed items go to bottom
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // Then sort alphabetically
    return a.name.localeCompare(b.name);
  });
};

// Local storage utilities for custom aisles
export const STORAGE_KEYS = {
  ITEMS: 'shoppingListItems',
  LIST_NAME: 'shoppingListName',
  CUSTOM_AISLES: 'shoppingListAisles'
};

// Load custom aisles from localStorage
export const loadCustomAisles = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_AISLES);
    return saved ? JSON.parse(saved) : DEFAULT_AISLES;
  } catch (error) {
    console.error('Error loading custom aisles:', error);
    return DEFAULT_AISLES;
  }
};

// Save custom aisles to localStorage
export const saveCustomAisles = (aisles) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_AISLES, JSON.stringify(aisles));
  } catch (error) {
    console.error('Error saving custom aisles:', error);
  }
};

// Validate aisle name
export const isValidAisleName = (name, existingAisles = []) => {
  return name && 
         name.trim().length > 0 && 
         name.trim().length <= 50 && 
         !existingAisles.some(aisle => aisle.toLowerCase() === name.trim().toLowerCase());
};

// Update items when an aisle is renamed
export const updateItemsAisle = (items, oldAisleName, newAisleName) => {
  return items.map(item => 
    item.aisle === oldAisleName 
      ? { ...item, aisle: newAisleName }
      : item
  );
};
