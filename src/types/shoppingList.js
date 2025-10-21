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

// Default colors associated with each aisle (tailwind-inspired palette)
export const DEFAULT_AISLE_COLORS = {
  Produce: '#22c55e', // green-500
  Dairy: '#f97316', // orange-500
  'Meat & Seafood': '#ef4444', // red-500
  Bakery: '#f59e0b', // amber-500
  Pantry: '#6366f1', // indigo-500
  Frozen: '#0ea5e9', // sky-500
  'Personal Care': '#ec4899', // pink-500
  Household: '#14b8a6', // teal-500
  Other: '#6b7280' // gray-500
};

// Helper to provide a deterministic fallback color
export const getDefaultAisleColor = (aisleName) => {
  return DEFAULT_AISLE_COLORS[aisleName] || '#6b7280';
};

// Get default aisles localized for UI display
export const getLocalizedDefaultAisles = (t) => {
  return mapEnglishToLocalized(DEFAULT_AISLES, t);
};

// Map English aisles to localized ones
export const mapEnglishToLocalized = (englishAisles, t) => {
  const mapping = {
    'Produce': t('aisles.produce'),
    'Dairy': t('aisles.dairy'),
    'Meat & Seafood': t('aisles.meatSeafood'),
    'Bakery': t('aisles.bakery'),
    'Pantry': t('aisles.pantry'),
    'Frozen': t('aisles.frozen'),
    'Personal Care': t('aisles.personalCare'),
    'Household': t('aisles.household'),
    'Other': t('aisles.other')
  };
  
  return englishAisles.map(aisle => mapping[aisle] || aisle);
};

// Map localized aisles back to English (for storage consistency)
export const mapLocalizedToEnglish = (localizedAisles, t) => {
  const reverseMapping = {
    [t('aisles.produce')]: 'Produce',
    [t('aisles.dairy')]: 'Dairy',
    [t('aisles.meatSeafood')]: 'Meat & Seafood',
    [t('aisles.bakery')]: 'Bakery',
    [t('aisles.pantry')]: 'Pantry',
    [t('aisles.frozen')]: 'Frozen',
    [t('aisles.personalCare')]: 'Personal Care',
    [t('aisles.household')]: 'Household',
    [t('aisles.other')]: 'Other'
  };
  
  return localizedAisles.map(aisle => reverseMapping[aisle] || aisle);
};

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
// customAisles can be either an array of strings (legacy) or array of aisle objects with {name}
export const groupItemsByAisle = (items, customAisles = DEFAULT_AISLES) => {
  const grouped = {};

  // Normalize customAisles to array of names
  const aisleNames = customAisles.map(aisle =>
    typeof aisle === 'string' ? aisle : aisle.name
  );

  // Initialize with custom aisles
  aisleNames.forEach(aisle => {
    grouped[aisle] = [];
  });

  items.forEach(item => {
    // item.aisle can be:
    // - An object with {name, color, etc} (new structure from DB join)
    // - A string (legacy or from components)
    // - null/undefined (no aisle assigned)
    const itemAisleName = item.aisle?.name || item.aisle || null;

    if (itemAisleName && grouped[itemAisleName]) {
      grouped[itemAisleName].push(item);
    } else {
      // If item has an aisle not in our list, add it to 'Other' or create the aisle
      if (aisleNames.includes('Other')) {
        if (!grouped['Other']) grouped['Other'] = [];
        grouped['Other'].push(item);
      } else if (itemAisleName) {
        // Create the aisle if it doesn't exist
        if (!grouped[itemAisleName]) grouped[itemAisleName] = [];
        grouped[itemAisleName].push(item);
      } else {
        // No aisle, put in 'Other' if it exists
        if (grouped['Other']) {
          grouped['Other'].push(item);
        }
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
