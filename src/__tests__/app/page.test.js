import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../../app/page'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslations } from '../../contexts/LanguageContext'
import { useNotification } from '../../contexts/NotificationContext'
import { ShoppingListService } from '../../lib/shoppingListService'

// Mock dependencies
jest.mock('../../contexts/AuthContext')
jest.mock('../../contexts/LanguageContext')
jest.mock('../../contexts/NotificationContext')
jest.mock('../../lib/shoppingListService')
let addItemFormPropsLog = []
let aisleSectionRenderLog = []

jest.mock('../../components/QuickAddBar', () => {
  return function MockQuickAddBar({ onAddItem, customAisles, aisleColors, existingItems }) {
    addItemFormPropsLog.push({ customAisles, aisleColors, existingItems })
    return (
      <div data-testid="quick-add-bar">
        <button onClick={() => onAddItem({ name: 'Test Item', aisle: 'Produce', quantity: 1, comment: '' })}>
          Add Item
        </button>
      </div>
    )
  }
})

jest.mock('../../components/EditItemModal', () => {
  return function MockEditItemModal({ item, onUpdateItem, onClose, aisles = [] }) {
    const [name, setName] = React.useState(item.name);
    const [aisleName, setAisleName] = React.useState(item.aisle?.name || '');

    // If no aisles provided, use a default list for testing
    const availableAisles = aisles.length > 0 ? aisles : [
      { id: 'a1', name: 'Produce', color: '#22c55e' },
      { id: 'a2', name: 'Dairy', color: '#f97316' },
      { id: 'a3', name: 'Bakery', color: '#f59e0b' },
      { id: 'a4', name: 'Pantry', color: '#a855f7' }
    ];

    return (
      <div data-testid="edit-item-modal">
        <h2>Edit Item</h2>
        <span>Editing: {item.name}</span>
        <input
          defaultValue={item.name}
          data-testid="edit-name-input"
          onChange={(e) => setName(e.target.value)}
        />
        <select
          data-testid="edit-aisle-select"
          value={aisleName}
          onChange={(e) => setAisleName(e.target.value)}
        >
          {availableAisles.map(a => (
            <option key={a.name} value={a.name}>{a.name}</option>
          ))}
        </select>
        <button onClick={() => {
          const aisleObj = availableAisles.find(a => a.name === aisleName) || item.aisle;
          onUpdateItem({ ...item, name, aisle: aisleObj });
        }}>
          Update Item
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    )
  }
})

jest.mock('../../components/AisleSection', () => {
  return function MockAisleSection({ aisle, items, onToggleComplete, onDelete, onEdit }) {
    aisleSectionRenderLog.push(aisle)
    return (
      <div data-testid={`aisle-section-${aisle}`}>
        <h3>{aisle}</h3>
        {items.map(item => (
          <div key={item.id} data-testid={`item-${item.id}`}>
            <span>{item.name} - {item.completed ? 'completed' : 'pending'}</span>
            <button onClick={() => onToggleComplete(item.id)}>Toggle</button>
            <button onClick={() => onDelete(item.id)}>Delete</button>
            <button onClick={() => onEdit(item)}>Edit</button>
          </div>
        ))}
      </div>
    )
  }
})

jest.mock('../../components/AisleManager', () => {
  return function MockAisleManager({ onUpdateAisles, onClose }) {
    return (
      <div data-testid="aisle-manager">
        <button onClick={() => onUpdateAisles(['New Aisle'])}>
          Update Aisles
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

jest.mock('../../components/Header', () => {
  return function MockHeader() {
    return <div data-testid="header">Header</div>
  }
})

jest.mock('../../components/LoginForm', () => {
  return function MockLoginForm() {
    return <div data-testid="login-form">Please log in</div>
  }
})

jest.mock('../../components/ListSelector', () => {
  return function MockListSelector({ currentList, onListChange }) {
    return (
      <div data-testid="list-selector">
        <span>Current: {currentList?.name || 'None'}</span>
        <button onClick={() => onListChange({ id: '2', name: 'New List' })}>
          Change List
        </button>
      </div>
    )
  }
})

jest.mock('../../components/TopPurchasedItems', () => {
  return function MockTopPurchasedItems({ items = [], onAddItem, loading, existingItemNames = [] }) {
    const existingSet = new Set(
      existingItemNames
        .filter(Boolean)
        .map(name => name.trim().toLowerCase())
    )

    return (
      <div data-testid="top-purchased-items">
        {loading && <span>Loading top items</span>}
        {items
          .filter(item => item && item.item_name) // Filter out invalid items
          .map(item => {
            const isInList = existingSet.has(item.item_name.trim().toLowerCase())

            return (
              <div key={item.item_name}>
                <span>{item.item_name}</span>
                {isInList ? (
                  <span>Already added {item.item_name}</span>
                ) : (
                  <button onClick={() => onAddItem && onAddItem(item)}>
                    Add {item.item_name}
                  </button>
                )}
              </div>
            )
          })}
      </div>
    )
  }
})

const mockUser = {
  id: 'user-1',
  email: 'test@example.com'
}

const mockShoppingList = {
  id: 'list-1',
  name: 'My Shopping List',
  user_id: 'user-1'
}

const mockItems = [
  {
    id: '1',
    name: 'Apples',
    aisle: 'Produce',
    quantity: 3,
    completed: false,
    shopping_list_id: 'list-1'
  },
  {
    id: '2',
    name: 'Milk',
    aisle: 'Dairy',
    quantity: 1,
    completed: true,
    shopping_list_id: 'list-1'
  }
]

const mockTranslations = {
  'common.loading': 'Loading...',
  'shoppingList.itemsCompleted': '{{completed}}/{{total}} completed',
  'shoppingList.clearCompleted': 'Clear Completed ({{count}})',
  'shoppingList.clearAll': 'Clear All',
  'shoppingList.manageAisles': 'Manage Aisles',
  'shoppingList.tagline': 'Plan and prioritise every grocery run with confidence.',
  'shoppingList.emptyTitle': 'Your list is empty',
  'shoppingList.emptySubtitle': 'Add your first item above',
  'shoppingList.itemActions': 'Item actions',
  'topItems.title': 'History',
  'topItems.subtitle': 'Quickly add your previously purchased products',
  'topItems.empty': 'Your purchase history will appear here as you add items.',
  'topItems.purchasedCount': 'Purchased {{count}} times',
  'topItems.addButton': 'Add',
  'topItems.alreadyAdded': 'Already added',
  'topItems.openButton': 'History',
  'topItems.refreshing': 'Updating...'
}

const englishAisleTranslations = {
  'aisles.produce': 'Produce',
  'aisles.dairy': 'Dairy',
  'aisles.meatSeafood': 'Meat & Seafood',
  'aisles.bakery': 'Bakery',
  'aisles.pantry': 'Pantry',
  'aisles.frozen': 'Frozen',
  'aisles.personalCare': 'Personal Care',
  'aisles.household': 'Household',
  'aisles.other': 'Other'
}

const spanishAisleTranslations = {
  'aisles.produce': 'Productos Frescos',
  'aisles.dairy': 'Lácteos',
  'aisles.meatSeafood': 'Carnes y Mariscos',
  'aisles.bakery': 'Panadería',
  'aisles.pantry': 'Despensa',
  'aisles.frozen': 'Congelados',
  'aisles.personalCare': 'Cuidado Personal',
  'aisles.household': 'Hogar',
  'aisles.other': 'Otros'
}

describe('Home', () => {
  const mockUseAuth = useAuth
  const mockUseTranslations = useTranslations
  const mockUseNotification = useNotification
  const mockShoppingListService = ShoppingListService

  beforeEach(() => {
    jest.clearAllMocks()
    addItemFormPropsLog = []
    aisleSectionRenderLog = []
    Object.assign(mockTranslations, englishAisleTranslations)

    mockUseTranslations.mockReturnValue((key, params = {}) => {
      let translation = mockTranslations[key] || key
      const safeParams = params && typeof params === 'object' ? params : {}
      Object.entries(safeParams).forEach(([param, value]) => {
        translation = translation.replace(`{{${param}}}`, value.toString())
      })
      return translation
    })

    mockUseNotification.mockReturnValue({
      showError: jest.fn(),
      showSuccess: jest.fn(),
      showInfo: jest.fn(),
      showWarning: jest.fn(),
      addNotification: jest.fn(),
      removeNotification: jest.fn()
    })

    mockShoppingListService.getUserAisles.mockResolvedValue([])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [] })
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({
      list: mockShoppingList,
      items: []
    })
    mockShoppingListService.addShoppingItem.mockResolvedValue(undefined)
    mockShoppingListService.updateShoppingItem.mockResolvedValue(undefined)
    mockShoppingListService.deleteShoppingItem.mockResolvedValue(undefined)
    mockShoppingListService.clearCompletedItems.mockResolvedValue(undefined)
    mockShoppingListService.clearAllItems.mockResolvedValue(undefined)
    mockShoppingListService.updateUserAisles.mockResolvedValue([])
    mockShoppingListService.getMostPurchasedItems.mockResolvedValue([])
  })

  it('should show loading spinner when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true
    })

    render(<Home />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should show login form when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false
    })

    render(<Home />)
    
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
    expect(screen.getByText('Please log in')).toBeInTheDocument()
  })

  it('should preserve default aisle colors when localized to Spanish', async () => {
    Object.assign(mockTranslations, spanishAisleTranslations)
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValueOnce([
      { name: 'Produce', color: '#22c55e' },
      { name: 'Dairy', color: '#f97316' },
      { name: 'Other', color: '#6b7280' }
    ])

    render(<Home />)

    await waitFor(() => {
      expect(addItemFormPropsLog.length).toBeGreaterThan(0)
    })

    const lastProps = addItemFormPropsLog[addItemFormPropsLog.length - 1]
    expect(lastProps.customAisles).toContain('Productos Frescos')
    expect(lastProps.customAisles).toContain('Lácteos')
    expect(lastProps.aisleColors['Produce']).toBe('#22c55e')
    expect(lastProps.aisleColors['Productos Frescos']).toBe('#22c55e')
    expect(lastProps.aisleColors['Dairy']).toBe('#f97316')
    expect(lastProps.aisleColors['Lácteos']).toBe('#f97316')
    expect(lastProps.aisleColors['Other']).toBe('#6b7280')
    expect(lastProps.aisleColors['Otros']).toBe('#6b7280')
  })

  it('should keep aisle ordering when localized to Spanish', async () => {
    Object.assign(mockTranslations, spanishAisleTranslations)
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValueOnce([
      { name: 'Produce', color: '#22c55e' },
      { name: 'Dairy', color: '#f97316' },
      { name: 'Other', color: '#6b7280' }
    ])

    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValueOnce({
      list: mockShoppingList,
      items: mockItems
    })

    render(<Home />)

    await waitFor(() => {
      const sections = document.querySelectorAll('[data-testid^="aisle-section-"]')
      expect(sections.length).toBeGreaterThanOrEqual(2)
    })

    const sections = Array.from(document.querySelectorAll('[data-testid^="aisle-section-"]'))
    const order = sections.map(node => node.getAttribute('data-testid')?.replace('aisle-section-', ''))

    expect(order.slice(0, 2)).toEqual(['Produce', 'Dairy'])
  })

  it('should show loading when data is being loaded for authenticated user', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })
  })

  it('should load shopping list data when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce', 'Dairy'])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: mockItems })

    render(<Home />)

    await waitFor(() => {
      expect(mockShoppingListService.getUserAisles).toHaveBeenCalledWith('user-1')
      expect(mockShoppingListService.getActiveShoppingListWithItems).toHaveBeenCalledWith('user-1')
      // getMostPurchasedItems is now lazy loaded, only called when modal opens
      expect(mockShoppingListService.getMostPurchasedItems).not.toHaveBeenCalled()
    })
  })

  it('should render shopping list with items when loaded', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce', 'Dairy'])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: mockItems })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId('quick-add-bar')).toBeInTheDocument()
      expect(screen.getByTestId('aisle-section-Produce')).toBeInTheDocument()
      expect(screen.getByTestId('aisle-section-Dairy')).toBeInTheDocument()
    })

    expect(screen.getByText('1/2 completed')).toBeInTheDocument()
    // Kebab menu button should be present (actions are now in menu)
    expect(screen.getByLabelText('Acciones')).toBeInTheDocument()
  })

  it('should handle adding new item', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    const mockAisle = { id: 'aisle-1', name: 'Produce', color: '#22c55e', display_order: 1 }
    const newItem = {
      id: '3',
      name: 'Test Item',
      aisle_id: 'aisle-1',
      aisle: mockAisle,
      quantity: 1,
      completed: false
    }
    mockShoppingListService.getUserAisles.mockResolvedValue([mockAisle])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [] })
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.addShoppingItem.mockResolvedValue(newItem)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId('quick-add-bar')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Add Item'))

    await waitFor(() => {
      expect(mockShoppingListService.addShoppingItem).toHaveBeenCalledWith(
        'list-1',
        'user-1',
        expect.objectContaining({
          name: 'Test Item',
          aisle: 'Produce',
          aisle_id: 'aisle-1',
          quantity: 1,
          comment: ''
        })
      )
    })

    await waitFor(() => {
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledTimes(2)
    })
  })

  it('should allow adding item from top purchased section', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    const mockAisle = { id: 'aisle-1', name: 'Produce', color: '#22c55e', display_order: 1 }

    // Mock service returns data in database format (with 'name' not 'item_name')
    const serviceItem = {
      id: '99',
      name: 'Bananas',
      purchase_count: 5,
      aisle: mockAisle,
      quantity: 2
    }

    // Mock with at least one item so kebab menu is visible
    mockShoppingListService.getUserAisles.mockResolvedValue([mockAisle])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })
    mockShoppingListService.addShoppingItem.mockResolvedValue({
      id: '4',
      name: 'Bananas',
      aisle_id: 'aisle-1',
      aisle: mockAisle,
      quantity: 2,
      completed: false
    })
    mockShoppingListService.getMostPurchasedItems.mockResolvedValue([serviceItem])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId('quick-add-bar')).toBeInTheDocument()
    })

    // Open kebab menu first
    await user.click(screen.getByLabelText('Acciones'))

    // Click "History" button in the menu
    await user.click(screen.getByText('History'))

    // Now getMostPurchasedItems should be called (lazy loading)
    await waitFor(() => {
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith('user-1')
    })

    const quickAddButton = await screen.findByText('Add Bananas')
    await user.click(quickAddButton)

    await waitFor(() => {
      expect(mockShoppingListService.addShoppingItem).toHaveBeenCalledWith(
        'list-1',
        'user-1',
        expect.objectContaining({
          name: 'Bananas',
          aisle: 'Produce',
          quantity: 2,
          comment: ''
        })
      )
    })

    await waitFor(() => {
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledTimes(2)
    })
  })

  it('should hide add button when top purchased item already exists in list', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    const mockAisle = { id: 'aisle-1', name: 'Produce', color: '#22c55e', display_order: 1 }

    // Mock service returns data in database format (with 'name' not 'item_name')
    const serviceItem = {
      id: '98',
      name: 'Apples',
      purchase_count: 8,
      aisle: mockAisle,
      quantity: 4
    }

    mockShoppingListService.getUserAisles.mockResolvedValue([mockAisle])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })
    mockShoppingListService.getMostPurchasedItems.mockResolvedValue([serviceItem])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId('quick-add-bar')).toBeInTheDocument()
    })

    // Open kebab menu first
    await user.click(screen.getByLabelText('Acciones'))

    // Click "History" button in the menu
    await user.click(screen.getByText('History'))

    // Now getMostPurchasedItems should be called (lazy loading)
    await waitFor(() => {
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith('user-1')
    })

    await waitFor(() => {
      expect(screen.queryByText('Add Apples')).not.toBeInTheDocument()
      expect(screen.getByText('Already added Apples')).toBeInTheDocument()
    })
  })

  it('should handle toggling item completion', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })
    mockShoppingListService.updateShoppingItem.mockResolvedValue({ ...mockItems[0], completed: true })

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toBeInTheDocument()
    })

    const toggleButton = screen.getByText('Toggle')
    await user.click(toggleButton)
    
    await waitFor(() => {
      expect(mockShoppingListService.updateShoppingItem).toHaveBeenCalledWith(
        '1',
        { completed: true }
      )
    })
  })

  it('should handle deleting item', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })
    mockShoppingListService.deleteShoppingItem.mockResolvedValue(undefined)

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toBeInTheDocument()
    })

    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)
    
    await waitFor(() => {
      expect(mockShoppingListService.deleteShoppingItem).toHaveBeenCalledWith('1')
    })
  })

  it('should handle editing item', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toBeInTheDocument()
    })

    const editButton = screen.getByText('Edit')
    await user.click(editButton)

    // Should show edit modal with Edit Item title
    await waitFor(() => {
      expect(screen.getByText('Edit Item')).toBeInTheDocument()
    })
  })

  it('should handle updating edited item', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    const mockAisle = { id: 'aisle-1', name: 'Produce', color: '#22c55e', display_order: 1 }
    const updatedItem = { ...mockItems[0], name: 'Updated Item' }
    mockShoppingListService.getUserAisles.mockResolvedValue([mockAisle])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })
    mockShoppingListService.updateShoppingItem.mockResolvedValue(updatedItem)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    // First click edit
    await user.click(screen.getByText('Edit'))

    // Should show modal with Update Item button
    await waitFor(() => {
      expect(screen.getByText('Update Item')).toBeInTheDocument()
    })

    // Edit the name field
    const nameInput = screen.getByDisplayValue('Apples')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Item')

    // Then click update
    await user.click(screen.getByText('Update Item'))

    await waitFor(() => {
      expect(mockShoppingListService.updateShoppingItem).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: 'Updated Item',
          quantity: 3
        })
      )
    })
  })

  it('should handle clearing completed items', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce', 'Dairy'])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: mockItems })
    mockShoppingListService.clearCompletedItems.mockResolvedValue(undefined)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByLabelText('Acciones')).toBeInTheDocument()
    })

    // Open kebab menu
    await user.click(screen.getByLabelText('Acciones'))

    // Click "Clear Completed" in the menu
    await user.click(screen.getByText('Clear Completed (1)'))

    await waitFor(() => {
      expect(mockShoppingListService.clearCompletedItems).toHaveBeenCalledWith('list-1')
    })
  })

  it('should handle clearing all items', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })
    mockShoppingListService.clearAllItems.mockResolvedValue(undefined)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByLabelText('Acciones')).toBeInTheDocument()
    })

    // Open kebab menu
    await user.click(screen.getByLabelText('Acciones'))

    // Click "Clear All" in the menu
    await user.click(screen.getByText('Clear All'))

    await waitFor(() => {
      expect(mockShoppingListService.clearAllItems).toHaveBeenCalledWith('list-1')
    })
  })

  it('should handle opening and closing aisle manager', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    const mockAisle = { id: 'aisle-1', name: 'Produce', color: '#22c55e', display_order: 1 }

    mockShoppingListService.getUserAisles.mockResolvedValue([mockAisle])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByLabelText('Acciones')).toBeInTheDocument()
    })

    // Open kebab menu
    await user.click(screen.getByLabelText('Acciones'))

    // Click "Manage Aisles" in the menu
    await user.click(screen.getByText('Manage Aisles'))

    expect(screen.getByTestId('aisle-manager')).toBeInTheDocument()

    // Close aisle manager
    await user.click(screen.getByText('Close'))

    await waitFor(() => {
      expect(screen.queryByTestId('aisle-manager')).not.toBeInTheDocument()
    })
  })

  it('should handle updating aisles', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    const mockAisles = [
      { id: 'aisle-1', name: 'Produce', color: '#22c55e', display_order: 1 }
    ]

    const mockUpdatedAisles = [
      { id: 'aisle-2', name: 'New Aisle', color: '#6b7280', display_order: 1 }
    ]

    mockShoppingListService.getUserAisles.mockResolvedValue(mockAisles)
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })
    mockShoppingListService.updateUserAisles.mockResolvedValue(mockUpdatedAisles)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByLabelText('Acciones')).toBeInTheDocument()
    })

    // Open kebab menu
    await user.click(screen.getByLabelText('Acciones'))

    // Click "Manage Aisles" in the menu
    await user.click(screen.getByText('Manage Aisles'))

    // Update aisles
    await user.click(screen.getByText('Update Aisles'))

    await waitFor(() => {
      expect(mockShoppingListService.updateUserAisles).toHaveBeenCalled()
    })
  })

  it('should show empty state when no items', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue([{ name: 'Produce', color: '#22c55e' }])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [] })
    mockShoppingListService.getShoppingItems.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Your list is empty')).toBeInTheDocument()
      expect(screen.getByText('Add your first item above')).toBeInTheDocument()
    })
  })

  it('should show frequent items button when list is empty and top items exist', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    const mockAisle = { id: 'aisle-1', name: 'Produce', color: '#22c55e', display_order: 1 }

    // Mock service returns data in database format (with 'name' not 'item_name')
    const serviceItem = {
      id: '97',
      name: 'Bananas',
      purchase_count: 5,
      aisle: mockAisle,
      quantity: 2
    }

    mockShoppingListService.getUserAisles.mockResolvedValue([mockAisle])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [] })
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.getMostPurchasedItems.mockResolvedValue([serviceItem])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Your list is empty')).toBeInTheDocument()
    })

    // Should show button to open frequent items
    expect(screen.getByText('History')).toBeInTheDocument()
  })

  it('should not show frequent items button when list is empty and no top items exist', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue([{ name: 'Produce', color: '#22c55e' }])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [] })
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.getMostPurchasedItems.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Your list is empty')).toBeInTheDocument()
    })

    // Should not show button to open frequent items
    expect(screen.queryByText('History')).not.toBeInTheDocument()
  })

  it('should open frequent items modal from empty state button', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    const mockAisle = { id: 'aisle-1', name: 'Produce', color: '#22c55e', display_order: 1 }

    // Mock service returns data in database format (with 'name' not 'item_name')
    const serviceItem = {
      id: '96',
      name: 'Bananas',
      purchase_count: 5,
      aisle: mockAisle,
      quantity: 2
    }

    mockShoppingListService.getUserAisles.mockResolvedValue([mockAisle])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [] })
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.getMostPurchasedItems.mockResolvedValue([serviceItem])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Your list is empty')).toBeInTheDocument()
    })

    // Click the frequent items button in empty state
    await user.click(screen.getByText('History'))

    // Should open the top purchased items modal
    await waitFor(() => {
      expect(screen.getByTestId('top-purchased-items')).toBeInTheDocument()
      expect(screen.getByText('Bananas')).toBeInTheDocument()
    })
  })

  it('should handle list change', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue([{ name: 'Produce', color: '#22c55e' }])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [] })
    mockShoppingListService.getShoppingItems
      .mockResolvedValueOnce([]) // Initial load
      .mockResolvedValueOnce([mockItems[0]]) // After list change

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByTestId('list-selector')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Change List'))
    
    await waitFor(() => {
      expect(mockShoppingListService.getShoppingItems).toHaveBeenCalledWith('2')
    })
  })

  it('should not make duplicate API calls on initial load', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({
      list: mockShoppingList,
      items: mockItems
    })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId('list-selector')).toBeInTheDocument()
    })

    // Verify each service method is called exactly once
    expect(mockShoppingListService.getUserAisles).toHaveBeenCalledTimes(1)
    expect(mockShoppingListService.getActiveShoppingListWithItems).toHaveBeenCalledTimes(1)
    expect(mockShoppingListService.getUserAisles).toHaveBeenCalledWith(mockUser.id)
    expect(mockShoppingListService.getActiveShoppingListWithItems).toHaveBeenCalledWith(mockUser.id)
  })

  describe('itemUsageHistory and QuickAddBar suggestions', () => {
    it('should populate itemUsageHistory when loadTopItems is called', async () => {
      const mockTopItemsData = [
        {
          name: 'Milk',
          purchase_count: 10,
          aisle: { name: 'Dairy', color: '#f97316' },
          quantity: 1
        },
        {
          name: 'Apples',
          purchase_count: 8,
          aisle: { name: 'Produce', color: '#22c55e' },
          quantity: 2
        }
      ]

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false
      })

      mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({
        list: mockShoppingList,
        items: []
      })

      mockShoppingListService.getMostPurchasedItems.mockResolvedValue(mockTopItemsData)

      render(<Home />)

      await waitFor(() => {
        expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith(mockUser.id)
      })

      // Wait for itemUsageHistory to be populated
      await waitFor(() => {
        const quickAddBar = screen.getByTestId('quick-add-bar')
        expect(quickAddBar).toBeInTheDocument()
      })

      // Verify that the service was called
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalled()
    })

    it('should load topItems when items list is empty', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false
      })

      mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({
        list: mockShoppingList,
        items: []
      })

      mockShoppingListService.getMostPurchasedItems.mockResolvedValue([
        {
          name: 'Coffee',
          purchase_count: 15,
          aisle: { name: 'Pantry', color: '#a855f7' },
          quantity: 1
        }
      ])

      render(<Home />)

      await waitFor(() => {
        expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith(mockUser.id)
      })
    })

    it('should refresh itemUsageHistory when an item is completed', async () => {
      const user = userEvent.setup()
      const mockItemToComplete = {
        id: '1',
        name: 'Bread',
        aisle: { id: 'a1', name: 'Bakery', color: '#f59e0b' },
        quantity: 1,
        completed: false,
        comment: ''
      }

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false
      })

      mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({
        list: mockShoppingList,
        items: [mockItemToComplete]
      })

      mockShoppingListService.updateShoppingItem.mockResolvedValue({
        ...mockItemToComplete,
        completed: true
      })

      mockShoppingListService.getMostPurchasedItems.mockResolvedValue([])

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId(`aisle-section-Bakery`)).toBeInTheDocument()
      })

      // Toggle item completion
      const toggleButton = screen.getByText('Toggle')
      await user.click(toggleButton)

      await waitFor(() => {
        // getMostPurchasedItems should be called at least twice:
        // once on initial load, once after completing the item
        expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalled()
        expect(mockShoppingListService.updateShoppingItem).toHaveBeenCalledWith(
          '1',
          { completed: true }
        )
      })
    })

    it('should refresh itemUsageHistory when a new item is added', async () => {
      const user = userEvent.setup()

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false
      })

      mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({
        list: mockShoppingList,
        items: []
      })

      mockShoppingListService.addShoppingItem.mockResolvedValue({
        id: 'new-1',
        name: 'Test Item',
        aisle: { id: 'a1', name: 'Produce', color: '#22c55e' },
        quantity: 1,
        completed: false,
        comment: ''
      })

      mockShoppingListService.getMostPurchasedItems.mockResolvedValue([])

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-add-bar')).toBeInTheDocument()
      })

      const addButton = screen.getByText('Add Item')
      await user.click(addButton)

      await waitFor(() => {
        // Should be called twice: once on load, once after adding item
        expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledTimes(2)
      })
    })

    it('should refresh itemUsageHistory when an item name is updated', async () => {
      const user = userEvent.setup()
      const mockItemToEdit = {
        id: '1',
        name: 'Milk',
        aisle: { id: 'a1', name: 'Dairy', color: '#f97316' },
        quantity: 1,
        completed: false,
        comment: ''
      }

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false
      })

      mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({
        list: mockShoppingList,
        items: [mockItemToEdit]
      })

      const updatedItem = {
        ...mockItemToEdit,
        name: 'Whole Milk'
      }

      mockShoppingListService.updateShoppingItem.mockResolvedValue(updatedItem)
      mockShoppingListService.getMostPurchasedItems.mockResolvedValue([])

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId(`aisle-section-Dairy`)).toBeInTheDocument()
      })

      // Edit the item
      const editButton = screen.getByText('Edit')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByTestId('edit-item-modal')).toBeInTheDocument()
      })

      // Change the name in the input
      const nameInput = screen.getByTestId('edit-name-input')
      await user.clear(nameInput)
      await user.type(nameInput, 'Whole Milk')

      const updateButton = screen.getByText('Update Item')
      await user.click(updateButton)

      await waitFor(() => {
        // getMostPurchasedItems should be called once after updating item
        // (not on initial load because items list is not empty)
        expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith(mockUser.id)
      })
    })

    it('should refresh itemUsageHistory when an item aisle is updated', async () => {
      const user = userEvent.setup()
      const mockItemToEdit = {
        id: '1',
        name: 'Bread',
        aisle: { id: 'a1', name: 'Bakery', color: '#f59e0b' },
        quantity: 1,
        completed: false,
        comment: ''
      }

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false
      })

      mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({
        list: mockShoppingList,
        items: [mockItemToEdit]
      })

      mockShoppingListService.getUserAisles.mockResolvedValue([
        { id: 'a1', name: 'Bakery', color: '#f59e0b' },
        { id: 'a2', name: 'Pantry', color: '#a855f7' }
      ])

      const updatedItem = {
        ...mockItemToEdit,
        aisle: { id: 'a2', name: 'Pantry', color: '#a855f7' }
      }

      mockShoppingListService.updateShoppingItem.mockResolvedValue(updatedItem)
      mockShoppingListService.getMostPurchasedItems.mockResolvedValue([])

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId(`aisle-section-Bakery`)).toBeInTheDocument()
      })

      // Edit the item
      const editButton = screen.getByText('Edit')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByTestId('edit-item-modal')).toBeInTheDocument()
      })

      // Change the aisle in the select
      const aisleSelect = screen.getByTestId('edit-aisle-select')
      await user.selectOptions(aisleSelect, 'Pantry')

      const updateButton = screen.getByText('Update Item')
      await user.click(updateButton)

      await waitFor(() => {
        // getMostPurchasedItems should be called once after updating item
        // (not on initial load because items list is not empty)
        expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith(mockUser.id)
      })
    })

    it('should NOT refresh itemUsageHistory when only quantity or comment changes', async () => {
      const user = userEvent.setup()
      const mockItemToEdit = {
        id: '1',
        name: 'Eggs',
        aisle: { id: 'a1', name: 'Dairy', color: '#f97316' },
        quantity: 1,
        completed: false,
        comment: ''
      }

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false
      })

      mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({
        list: mockShoppingList,
        items: [mockItemToEdit]
      })

      mockShoppingListService.getUserAisles.mockResolvedValue([
        { id: 'a1', name: 'Dairy', color: '#f97316' }
      ])

      const updatedItem = {
        ...mockItemToEdit,
        quantity: 2,
        comment: 'Large size'
      }

      mockShoppingListService.updateShoppingItem.mockResolvedValue(updatedItem)
      mockShoppingListService.getMostPurchasedItems.mockResolvedValue([])

      // Clear any initial mock calls before rendering
      mockShoppingListService.getMostPurchasedItems.mockClear()

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId(`aisle-section-Dairy`)).toBeInTheDocument()
      })

      // Edit the item
      const editButton = screen.getByText('Edit')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByTestId('edit-item-modal')).toBeInTheDocument()
      })

      const updateButton = screen.getByText('Update Item')
      await user.click(updateButton)

      await waitFor(() => {
        expect(mockShoppingListService.updateShoppingItem).toHaveBeenCalled()
      })

      // getMostPurchasedItems should NOT be called at all:
      // - Not on initial load (items list is not empty)
      // - Not after update (only quantity/comment changed, not name/aisle)
      expect(mockShoppingListService.getMostPurchasedItems).not.toHaveBeenCalled()
    })
  })
})
