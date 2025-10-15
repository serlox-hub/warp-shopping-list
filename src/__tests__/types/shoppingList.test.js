import {
  DEFAULT_AISLES,
  getLocalizedDefaultAisles,
  mapEnglishToLocalized,
  mapLocalizedToEnglish,
  createShoppingItem,
  createShoppingList,
  groupItemsByAisle,
  sortItemsInAisle,
  STORAGE_KEYS,
  loadCustomAisles,
  saveCustomAisles,
  isValidAisleName,
  updateItemsAisle,
} from '../../types/shoppingList'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock translation function
const mockT = jest.fn((key) => {
  const translations = {
    'aisles.produce': 'Productos',
    'aisles.dairy': 'Lácteos',
    'aisles.meatSeafood': 'Carnes y Mariscos',
    'aisles.bakery': 'Panadería',
    'aisles.pantry': 'Despensa',
    'aisles.frozen': 'Congelados',
    'aisles.personalCare': 'Cuidado Personal',
    'aisles.household': 'Hogar',
    'aisles.other': 'Otros'
  }
  return translations[key] || key
})

describe('shoppingList types and utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('DEFAULT_AISLES', () => {
    it('should contain all expected default aisles', () => {
      expect(DEFAULT_AISLES).toEqual([
        'Produce',
        'Dairy',
        'Meat & Seafood',
        'Bakery',
        'Pantry',
        'Frozen',
        'Personal Care',
        'Household',
        'Other'
      ])
    })

    it('should have 9 default aisles', () => {
      expect(DEFAULT_AISLES).toHaveLength(9)
    })
  })

  describe('getLocalizedDefaultAisles', () => {
    it('should return localized aisles using translation function', () => {
      const result = getLocalizedDefaultAisles(mockT)
      
      expect(result).toEqual([
        'Productos',
        'Lácteos',
        'Carnes y Mariscos',
        'Panadería',
        'Despensa',
        'Congelados',
        'Cuidado Personal',
        'Hogar',
        'Otros'
      ])
    })

    it('should call translation function for each aisle', () => {
      getLocalizedDefaultAisles(mockT)
      expect(mockT).toHaveBeenCalledTimes(9)
    })
  })

  describe('mapEnglishToLocalized', () => {
    it('should map English aisles to localized ones', () => {
      const englishAisles = ['Produce', 'Dairy', 'Unknown Aisle']
      const result = mapEnglishToLocalized(englishAisles, mockT)
      
      expect(result).toEqual(['Productos', 'Lácteos', 'Unknown Aisle'])
    })

    it('should preserve unmapped aisles', () => {
      const englishAisles = ['Custom Aisle', 'Produce']
      const result = mapEnglishToLocalized(englishAisles, mockT)
      
      expect(result).toEqual(['Custom Aisle', 'Productos'])
    })
  })

  describe('mapLocalizedToEnglish', () => {
    it('should map localized aisles back to English', () => {
      const localizedAisles = ['Productos', 'Lácteos', 'Custom Aisle']
      const result = mapLocalizedToEnglish(localizedAisles, mockT)
      
      expect(result).toEqual(['Produce', 'Dairy', 'Custom Aisle'])
    })
  })

  describe('createShoppingItem', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2023-01-01T00:00:00.000Z')
      jest.spyOn(Date, 'now').mockReturnValue(1672531200000)
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should create a shopping item with required parameters', () => {
      const item = createShoppingItem('Apples')
      
      expect(item).toEqual({
        id: expect.any(String),
        name: 'Apples',
        aisle: 'Other',
        quantity: 1,
        completed: false,
        comment: '',
        createdAt: '2023-01-01T00:00:00.000Z'
      })
    })

    it('should create a shopping item with all parameters', () => {
      const item = createShoppingItem('Milk', 'Dairy', 2, true, 'Organic only')
      
      expect(item).toEqual({
        id: expect.any(String),
        name: 'Milk',
        aisle: 'Dairy',
        quantity: 2,
        completed: true,
        comment: 'Organic only',
        createdAt: '2023-01-01T00:00:00.000Z'
      })
    })

    it('should generate unique IDs', () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.123456789).mockReturnValueOnce(0.987654321)
      
      const item1 = createShoppingItem('Item 1')
      const item2 = createShoppingItem('Item 2')
      
      expect(item1.id).not.toEqual(item2.id)
    })
  })

  describe('createShoppingList', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2023-01-01T00:00:00.000Z')
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should create a shopping list with name only', () => {
      const list = createShoppingList('Grocery List')
      
      expect(list).toEqual({
        id: expect.any(String),
        name: 'Grocery List',
        items: [],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      })
    })

    it('should create a shopping list with items', () => {
      const items = [createShoppingItem('Apples')]
      const list = createShoppingList('Grocery List', items)
      
      expect(list.items).toEqual(items)
    })
  })

  describe('groupItemsByAisle', () => {
    const mockItems = [
      { id: '1', name: 'Apple', aisle: 'Produce', completed: false },
      { id: '2', name: 'Milk', aisle: 'Dairy', completed: false },
      { id: '3', name: 'Bread', aisle: 'Bakery', completed: true },
      { id: '4', name: 'Unknown', aisle: 'Unknown Aisle', completed: false },
    ]

    it('should group items by default aisles', () => {
      const grouped = groupItemsByAisle(mockItems)
      
      expect(grouped.Produce).toEqual([mockItems[0]])
      expect(grouped.Dairy).toEqual([mockItems[1]])
      expect(grouped.Bakery).toEqual([mockItems[2]])
      expect(grouped.Other).toEqual([mockItems[3]])
    })

    it('should group items by custom aisles', () => {
      const customAisles = ['Produce', 'Dairy', 'Custom']
      const grouped = groupItemsByAisle(mockItems, customAisles)
      
      expect(grouped.Produce).toEqual([mockItems[0]])
      expect(grouped.Dairy).toEqual([mockItems[1]])
      expect(grouped.Bakery).toEqual([mockItems[2]])
      expect(grouped['Unknown Aisle']).toEqual([mockItems[3]])
    })

    it('should remove empty aisles', () => {
      const items = [{ id: '1', name: 'Apple', aisle: 'Produce', completed: false }]
      const grouped = groupItemsByAisle(items)
      
      expect(grouped.Dairy).toBeUndefined()
      expect(grouped.Produce).toBeDefined()
    })

    it('should handle empty items array', () => {
      const grouped = groupItemsByAisle([])
      expect(Object.keys(grouped)).toHaveLength(0)
    })
  })

  describe('sortItemsInAisle', () => {
    it('should sort items with completed items at bottom', () => {
      const items = [
        { name: 'Zebra', completed: true },
        { name: 'Apple', completed: false },
        { name: 'Banana', completed: true },
        { name: 'Cherry', completed: false }
      ]
      
      const sorted = sortItemsInAisle(items)
      
      expect(sorted[0].name).toBe('Apple')
      expect(sorted[1].name).toBe('Cherry')
      expect(sorted[2].name).toBe('Banana')
      expect(sorted[3].name).toBe('Zebra')
    })

    it('should sort alphabetically within completion groups', () => {
      const items = [
        { name: 'Zebra', completed: false },
        { name: 'Apple', completed: false },
        { name: 'Cherry', completed: false }
      ]
      
      const sorted = sortItemsInAisle(items)
      
      expect(sorted[0].name).toBe('Apple')
      expect(sorted[1].name).toBe('Cherry')
      expect(sorted[2].name).toBe('Zebra')
    })
  })

  describe('STORAGE_KEYS', () => {
    it('should have all required storage keys', () => {
      expect(STORAGE_KEYS).toEqual({
        ITEMS: 'shoppingListItems',
        LIST_NAME: 'shoppingListName',
        CUSTOM_AISLES: 'shoppingListAisles'
      })
    })
  })

  describe('loadCustomAisles', () => {
    it('should load aisles from localStorage', () => {
      const customAisles = ['Custom1', 'Custom2']
      localStorageMock.getItem.mockReturnValue(JSON.stringify(customAisles))
      
      const result = loadCustomAisles()
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEYS.CUSTOM_AISLES)
      expect(result).toEqual(customAisles)
    })

    it('should return default aisles if localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = loadCustomAisles()
      
      expect(result).toEqual(DEFAULT_AISLES)
    })

    it('should return localized aisles if translation function provided', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(['Produce', 'Dairy']))
      
      const result = loadCustomAisles(mockT)
      
      expect(result).toEqual(['Productos', 'Lácteos'])
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      console.error = jest.fn()
      
      const result = loadCustomAisles()
      
      expect(console.error).toHaveBeenCalled()
      expect(result).toEqual(DEFAULT_AISLES)
    })

    it('should handle localStorage errors with translation function', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      console.error = jest.fn()
      
      const result = loadCustomAisles(mockT)
      
      expect(console.error).toHaveBeenCalled()
      expect(result).toEqual(getLocalizedDefaultAisles(mockT))
    })

    it('should handle invalid JSON in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      console.error = jest.fn()
      
      const result = loadCustomAisles()
      
      expect(console.error).toHaveBeenCalled()
      expect(result).toEqual(DEFAULT_AISLES)
    })
  })

  describe('saveCustomAisles', () => {
    it('should save aisles to localStorage', () => {
      const customAisles = ['Custom1', 'Custom2']
      
      saveCustomAisles(customAisles)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CUSTOM_AISLES,
        JSON.stringify(customAisles)
      )
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      console.error = jest.fn()
      
      saveCustomAisles(['test'])
      
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('isValidAisleName', () => {
    it('should validate valid aisle names', () => {
      expect(isValidAisleName('Valid Aisle')).toBe(true)
      expect(isValidAisleName('A')).toBe(true)
      expect(isValidAisleName('A'.repeat(50))).toBe(true)
    })

    it('should reject invalid aisle names', () => {
      expect(isValidAisleName('')).toBeFalsy()
      expect(isValidAisleName('   ')).toBeFalsy()
      expect(isValidAisleName('A'.repeat(51))).toBeFalsy()
      expect(isValidAisleName(null)).toBeFalsy()
      expect(isValidAisleName(undefined)).toBeFalsy()
    })

    it('should reject duplicate aisle names (case insensitive)', () => {
      const existingAisles = ['Produce', 'Dairy']
      
      expect(isValidAisleName('produce', existingAisles)).toBe(false)
      expect(isValidAisleName('DAIRY', existingAisles)).toBe(false)
      expect(isValidAisleName('Meat', existingAisles)).toBe(true)
    })

    it('should handle whitespace correctly', () => {
      const existingAisles = ['Produce']
      
      expect(isValidAisleName(' Produce ', existingAisles)).toBe(false)
      expect(isValidAisleName(' New Aisle ', existingAisles)).toBe(true)
    })
  })

  describe('updateItemsAisle', () => {
    it('should update items with matching aisle', () => {
      const items = [
        { id: '1', name: 'Apple', aisle: 'Produce' },
        { id: '2', name: 'Milk', aisle: 'Dairy' },
        { id: '3', name: 'Banana', aisle: 'Produce' },
      ]
      
      const result = updateItemsAisle(items, 'Produce', 'Fresh Produce')
      
      expect(result[0].aisle).toBe('Fresh Produce')
      expect(result[1].aisle).toBe('Dairy')
      expect(result[2].aisle).toBe('Fresh Produce')
    })

    it('should not modify items without matching aisle', () => {
      const items = [
        { id: '1', name: 'Milk', aisle: 'Dairy' },
        { id: '2', name: 'Bread', aisle: 'Bakery' },
      ]
      
      const result = updateItemsAisle(items, 'Produce', 'Fresh Produce')
      
      expect(result).toEqual(items)
    })

    it('should handle empty items array', () => {
      const result = updateItemsAisle([], 'Old', 'New')
      expect(result).toEqual([])
    })
  })
})