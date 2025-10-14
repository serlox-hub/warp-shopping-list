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
export const createShoppingItem = (name, aisle = 'Other', quantity = 1, completed = false) => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  name,
  aisle,
  quantity,
  completed,
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

// Group items by aisle
export const groupItemsByAisle = (items) => {
  const grouped = {};
  
  DEFAULT_AISLES.forEach(aisle => {
    grouped[aisle] = [];
  });
  
  items.forEach(item => {
    if (grouped[item.aisle]) {
      grouped[item.aisle].push(item);
    } else {
      if (!grouped['Other']) grouped['Other'] = [];
      grouped['Other'].push(item);
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