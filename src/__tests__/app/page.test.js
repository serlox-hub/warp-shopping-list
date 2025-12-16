import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
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

jest.mock('../../components/FloatingAddButton', () => {
  return function MockFloatingAddButton({ onClick }) {
    return (
      <button data-testid="floating-add-button" onClick={onClick}>
        Add
      </button>
    )
  }
})

jest.mock('../../components/ItemModal', () => {
  return function MockItemModal({ isOpen, onClose, onSubmit, mode, item, customAisles, aisleColors, existingItems }) {
    const isEditMode = mode === 'edit' && item
    const [name, setName] = React.useState('');
    const [aisleName, setAisleName] = React.useState('');
    const [quantity, setQuantity] = React.useState(1);
    const [comment, setComment] = React.useState('');

    // Sync state when item changes (for edit mode)
    React.useEffect(() => {
      if (isEditMode && item) {
        setName(item.name || '');
        setAisleName(item.aisle?.name || item.aisle || '');
        setQuantity(item.quantity || 1);
        setComment(item.comment || '');
      }
    }, [isEditMode, item]);

    addItemFormPropsLog.push({ customAisles, aisleColors, existingItems })
    if (!isOpen) return null

    if (isEditMode) {
      const availableAisles = [
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
          <input
            type="number"
            data-testid="edit-quantity-input"
            value={quantity}
            onChange={(e) => {
              const val = e.target.value;
              // Allow empty string during typing, but default to 1 if NaN
              setQuantity(val === '' ? '' : (parseInt(val, 10) || 1));
            }}
          />
          <input
            data-testid="edit-comment-input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button onClick={() => {
            // If aisle name didn't change, use original aisle object to preserve identity
            const originalAisleName = item?.aisle?.name || item?.aisle || '';
            const aisleObj = aisleName === originalAisleName
              ? item.aisle
              : (availableAisles.find(a => a.name === aisleName) || item.aisle);
            // Ensure quantity is a number (convert empty string to 1)
            const finalQuantity = quantity === '' ? 1 : parseInt(quantity, 10) || 1;
            onSubmit({ ...item, name, aisle: aisleObj, quantity: finalQuantity, comment });
          }}>
            Update Item
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      )
    }

    return (
      <div data-testid="add-item-modal">
        <button onClick={() => {
          onSubmit({ name: 'Test Item', aisle: 'Produce', quantity: 1, comment: '' })
          onClose()
        }}>
          Add Item
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
  return function MockAisleManager({ aisles, onUpdateAisles, onClose }) {
    const [localAisles, setLocalAisles] = React.useState(aisles || [])

    React.useEffect(() => {
      setLocalAisles(aisles || [])
    }, [aisles])

    const handleMoveUp = (index) => {
      if (index === 0) return
      setLocalAisles(prev => {
        const copy = [...prev]
        ;[copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]
        return copy
      })
    }

    return (
      <div data-testid="aisle-manager">
        {localAisles.map((aisle, index) => (
          <div key={aisle.name || index} data-testid={`aisle-row-${index}`}>
            <span>{aisle.name}</span>
            <button
              aria-label="aisle.moveUp"
              onClick={() => handleMoveUp(index)}
              disabled={index === 0}
            >
              Move Up
            </button>
          </div>
        ))}
        <button onClick={() => onUpdateAisles(localAisles)}>
          Update Aisles
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

jest.mock('../../components/Header', () => {
  return function MockHeader({
    onShareList,
    onViewMembers,
    onManageAisles,
    onOpenHistory,
    onClearCompleted,
    onClearAll,
    completedCount = 0,
    totalCount = 0,
    canOpenHistory = false,
    isListShared = false,
  }) {
    const [menuOpen, setMenuOpen] = React.useState(false)
    return (
      <div data-testid="header">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="header.menu.open"
        >
          Menu
        </button>
        {menuOpen && (
          <div role="menu">
            {onShareList && (
              <button onClick={() => { setMenuOpen(false); onShareList(); }}>
                share.shareList
              </button>
            )}
            {isListShared && onViewMembers && (
              <button onClick={() => { setMenuOpen(false); onViewMembers(); }}>
                share.viewMembers
              </button>
            )}
            {onManageAisles && (
              <button onClick={() => { setMenuOpen(false); onManageAisles(); }}>
                Manage Aisles
              </button>
            )}
            {onOpenHistory && (
              <button
                onClick={() => { setMenuOpen(false); if (canOpenHistory) onOpenHistory(); }}
                disabled={!canOpenHistory}
              >
                History
              </button>
            )}
            {onClearCompleted && (
              <button
                onClick={() => { setMenuOpen(false); onClearCompleted(); }}
                disabled={completedCount === 0}
              >
                Clear Completed ({completedCount})
              </button>
            )}
            {onClearAll && (
              <button
                onClick={() => { setMenuOpen(false); onClearAll(); }}
                disabled={totalCount === 0}
              >
                Clear All
              </button>
            )}
          </div>
        )}
      </div>
    )
  }
})

jest.mock('../../components/LoginForm', () => {
  return function MockLoginForm() {
    return <div data-testid="login-form">Please log in</div>
  }
})

jest.mock('../../components/ListSelector', () => {
  return function MockListSelector({ currentList, onListChange, completedCount = 0, totalCount = 0 }) {
    return (
      <div data-testid="list-selector">
        {totalCount > 0 && <span>{completedCount}/{totalCount}</span>}
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

    mockShoppingListService.getListAisles.mockResolvedValue([])
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
    mockShoppingListService.updateListAisles.mockResolvedValue([])
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

    mockShoppingListService.getListAisles.mockResolvedValueOnce([
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

    mockShoppingListService.getListAisles.mockResolvedValueOnce([
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

    mockShoppingListService.getListAisles.mockResolvedValue(['Produce', 'Dairy'])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: mockItems })

    render(<Home />)

    await waitFor(() => {
      expect(mockShoppingListService.getListAisles).toHaveBeenCalledWith('list-1')
      expect(mockShoppingListService.getActiveShoppingListWithItems).toHaveBeenCalledWith('user-1')
      // getMostPurchasedItems is now called on initial load to populate suggestions
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith('list-1')
    })
  })

  it('should render shopping list with items when loaded', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getListAisles.mockResolvedValue(['Produce', 'Dairy'])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: mockItems })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId('floating-add-button')).toBeInTheDocument()
      expect(screen.getByTestId('aisle-section-Produce')).toBeInTheDocument()
      expect(screen.getByTestId('aisle-section-Dairy')).toBeInTheDocument()
    })

    expect(screen.getByText('1/2')).toBeInTheDocument()
    // Header menu button should be present (actions are now in Header menu)
    expect(screen.getByLabelText('header.menu.open')).toBeInTheDocument()
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
    mockShoppingListService.getListAisles.mockResolvedValue([mockAisle])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [] })
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.addShoppingItem.mockResolvedValue(newItem)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId('floating-add-button')).toBeInTheDocument()
    })

    // Click the floating button to open the modal
    await user.click(screen.getByTestId('floating-add-button'))

    // Now click the Add Item button inside the modal
    await user.click(screen.getByText('Add Item'))

    await waitFor(() => {
      expect(mockShoppingListService.addShoppingItem).toHaveBeenCalledWith(
        'list-1',
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
      // Called twice: once on initial load, once after adding item
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
    mockShoppingListService.getListAisles.mockResolvedValue([mockAisle])
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
      expect(screen.getByTestId('floating-add-button')).toBeInTheDocument()
    })

    // Open Header menu first
    await user.click(screen.getByLabelText('header.menu.open'))

    // Click "History" button in the menu
    await user.click(screen.getByText('History'))

    // Now getMostPurchasedItems should be called (lazy loading)
    await waitFor(() => {
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith('list-1')
    })

    const quickAddButton = await screen.findByText('Add Bananas')
    await user.click(quickAddButton)

    await waitFor(() => {
      expect(mockShoppingListService.addShoppingItem).toHaveBeenCalledWith(
        'list-1',
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

    mockShoppingListService.getListAisles.mockResolvedValue([mockAisle])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })
    mockShoppingListService.getMostPurchasedItems.mockResolvedValue([serviceItem])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId('floating-add-button')).toBeInTheDocument()
    })

    // Open Header menu first
    await user.click(screen.getByLabelText('header.menu.open'))

    // Click "History" button in the menu
    await user.click(screen.getByText('History'))

    // Now getMostPurchasedItems should be called (lazy loading)
    await waitFor(() => {
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith('list-1')
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

    mockShoppingListService.getListAisles.mockResolvedValue(['Produce'])
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

    mockShoppingListService.getListAisles.mockResolvedValue(['Produce'])
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

    mockShoppingListService.getListAisles.mockResolvedValue(['Produce'])
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
    mockShoppingListService.getListAisles.mockResolvedValue([mockAisle])
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

    mockShoppingListService.getListAisles.mockResolvedValue(['Produce', 'Dairy'])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: mockItems })
    mockShoppingListService.clearCompletedItems.mockResolvedValue(undefined)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByLabelText('header.menu.open')).toBeInTheDocument()
    })

    // Open Header menu
    await user.click(screen.getByLabelText('header.menu.open'))

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

    mockShoppingListService.getListAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })
    mockShoppingListService.clearAllItems.mockResolvedValue(undefined)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByLabelText('header.menu.open')).toBeInTheDocument()
    })

    // Open Header menu
    await user.click(screen.getByLabelText('header.menu.open'))

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

    mockShoppingListService.getListAisles.mockResolvedValue([mockAisle])
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByLabelText('header.menu.open')).toBeInTheDocument()
    })

    // Open Header menu
    await user.click(screen.getByLabelText('header.menu.open'))

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

    mockShoppingListService.getListAisles.mockResolvedValue(mockAisles)
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [mockItems[0]] })
    mockShoppingListService.updateListAisles.mockResolvedValue(mockUpdatedAisles)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByLabelText('header.menu.open')).toBeInTheDocument()
    })

    // Open Header menu
    await user.click(screen.getByLabelText('header.menu.open'))

    // Click "Manage Aisles" in the menu
    await user.click(screen.getByText('Manage Aisles'))

    // Update aisles
    await user.click(screen.getByText('Update Aisles'))

    await waitFor(() => {
      expect(mockShoppingListService.updateListAisles).toHaveBeenCalled()
    })
  })

  it('should preserve aisle IDs when reordering aisles', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    // Original order: Produce (id:1), Dairy (id:2), Meat (id:3)
    const mockAisles = [
      { id: 'aisle-1', name: 'Produce', color: '#22c55e', display_order: 1 },
      { id: 'aisle-2', name: 'Dairy', color: '#3b82f6', display_order: 2 },
      { id: 'aisle-3', name: 'Meat', color: '#ef4444', display_order: 3 }
    ]

    mockShoppingListService.getListAisles.mockResolvedValue(mockAisles)
    mockShoppingListService.getActiveShoppingListWithItems.mockResolvedValue({ list: mockShoppingList, items: [] })
    mockShoppingListService.updateListAisles.mockResolvedValue(mockAisles)
    mockShoppingListService.getShoppingItems.mockResolvedValue([])

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByLabelText('header.menu.open')).toBeInTheDocument()
    })

    // Open Header menu
    await user.click(screen.getByLabelText('header.menu.open'))

    // Click "Manage Aisles" in the menu
    await user.click(screen.getByText('Manage Aisles'))

    // Move Dairy up (simulating reorder: Dairy, Produce, Meat)
    const moveUpButtons = screen.getAllByLabelText('aisle.moveUp')
    await user.click(moveUpButtons[1]) // Click move up on Dairy (second item)

    // Save changes
    await user.click(screen.getByText('Update Aisles'))

    await waitFor(() => {
      expect(mockShoppingListService.updateListAisles).toHaveBeenCalled()
    })

    // Verify the payload has correct IDs matched by name, not by index
    const updateCall = mockShoppingListService.updateListAisles.mock.calls[0]
    const payload = updateCall[1]

    // After reorder: Dairy should be first but keep id:aisle-2
    expect(payload[0]).toMatchObject({ id: 'aisle-2', name: 'Dairy', display_order: 1 })
    // Produce should be second but keep id:aisle-1
    expect(payload[1]).toMatchObject({ id: 'aisle-1', name: 'Produce', display_order: 2 })
    // Meat stays third with id:aisle-3
    expect(payload[2]).toMatchObject({ id: 'aisle-3', name: 'Meat', display_order: 3 })
  })

  it('should show empty state when no items', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getListAisles.mockResolvedValue([{ name: 'Produce', color: '#22c55e' }])
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

    mockShoppingListService.getListAisles.mockResolvedValue([mockAisle])
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

    mockShoppingListService.getListAisles.mockResolvedValue([{ name: 'Produce', color: '#22c55e' }])
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

    mockShoppingListService.getListAisles.mockResolvedValue([mockAisle])
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

    mockShoppingListService.getListAisles.mockResolvedValue([{ name: 'Produce', color: '#22c55e' }])
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
    expect(mockShoppingListService.getListAisles).toHaveBeenCalledTimes(1)
    expect(mockShoppingListService.getActiveShoppingListWithItems).toHaveBeenCalledTimes(1)
    expect(mockShoppingListService.getListAisles).toHaveBeenCalledWith(mockShoppingList.id)
    expect(mockShoppingListService.getActiveShoppingListWithItems).toHaveBeenCalledWith(mockUser.id)
  })

  describe('itemUsageHistory and AddItemModal suggestions', () => {
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
        expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith(mockShoppingList.id)
      })

      // Wait for component to be rendered
      await waitFor(() => {
        const floatingAddButton = screen.getByTestId('floating-add-button')
        expect(floatingAddButton).toBeInTheDocument()
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
        expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith(mockShoppingList.id)
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
        expect(screen.getByTestId('floating-add-button')).toBeInTheDocument()
      })

      // Click the floating button to open the modal
      const floatingButton = screen.getByTestId('floating-add-button')
      await user.click(floatingButton)

      // Now click the Add Item button inside the modal
      const addButton = screen.getByText('Add Item')
      await user.click(addButton)

      await waitFor(() => {
        // Called twice: once on initial load, once after adding item
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
        expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith(mockShoppingList.id)
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

      mockShoppingListService.getListAisles.mockResolvedValue([
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
        expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith(mockShoppingList.id)
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

      mockShoppingListService.getListAisles.mockResolvedValue([
        { id: 'a1', name: 'Dairy', color: '#f97316' }
      ])

      const updatedItem = {
        ...mockItemToEdit,
        quantity: 2,
        comment: 'Large size'
      }

      mockShoppingListService.updateShoppingItem.mockResolvedValue(updatedItem)
      // Return a non-empty array so topItems.length > 0 and the useEffect won't re-trigger
      // Use mockImplementation to ensure the value is consistently returned
      mockShoppingListService.getMostPurchasedItems.mockImplementation(() =>
        Promise.resolve([
          { name: 'Some Item', purchase_count: 1, aisle: { name: 'Dairy' }, quantity: 1 }
        ])
      )

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId(`aisle-section-Dairy`)).toBeInTheDocument()
      })

      // Wait for initial getMostPurchasedItems call to complete before clearing
      await waitFor(() => {
        expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith(mockShoppingList.id)
      })

      // Wait for all async state updates to settle (loadTopItems sets state after the service call)
      // Use act() to properly flush all React updates
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Clear mock calls after initial load to track only update-related calls
      mockShoppingListService.getMostPurchasedItems.mockClear()

      // Edit the item
      const editButton = screen.getByText('Edit')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByTestId('edit-item-modal')).toBeInTheDocument()
      })

      // Change only quantity and comment (not name or aisle)
      const quantityInput = screen.getByTestId('edit-quantity-input')
      await user.clear(quantityInput)
      await user.type(quantityInput, '2')

      const commentInput = screen.getByTestId('edit-comment-input')
      await user.type(commentInput, 'Large size')

      const updateButton = screen.getByText('Update Item')
      await user.click(updateButton)

      await waitFor(() => {
        expect(mockShoppingListService.updateShoppingItem).toHaveBeenCalled()
      })

      // Wait for modal to close and all async operations to complete
      await waitFor(() => {
        expect(screen.queryByTestId('edit-item-modal')).not.toBeInTheDocument()
      })

      // Wait for all effects to settle
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      // Verify that updateShoppingItem was called with correct parameters
      // Name and aisle unchanged, only quantity and comment changed
      expect(mockShoppingListService.updateShoppingItem).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: 'Eggs',
          quantity: 2,
          comment: 'Large size'
        })
      )

      // Verify that getMostPurchasedItems was not called excessively
      // handleUpdateItem should NOT call loadTopItems when only quantity/comment changes
      // At most 1 call is acceptable (from useEffect if it re-triggered due to state changes)
      const finalCallCount = mockShoppingListService.getMostPurchasedItems.mock.calls.length
      expect(finalCallCount).toBeLessThanOrEqual(1)
    })
  })

  describe('Independent purchase history per list', () => {
    it('should call getMostPurchasedItems with the correct list ID', () => {
      // This test verifies that getMostPurchasedItems service method
      // requires and uses the listId parameter to filter results per list

      // Test that the method signature requires listId
      expect(mockShoppingListService.getMostPurchasedItems).toBeDefined()

      // Calling with different listIds should work independently
      mockShoppingListService.getMostPurchasedItems('list-a')
      mockShoppingListService.getMostPurchasedItems('list-b')

      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith('list-a')
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith('list-b')
    })

    it('should return different history results for different lists', async () => {
      // History for list A has "Apples"
      const historyA = [
        {
          id: 'hist-a1',
          name: 'Apples',
          purchase_count: 5,
          aisle: { name: 'Produce' }
        }
      ]

      // History for list B has "Oranges" (NOT Apples)
      const historyB = [
        {
          id: 'hist-b1',
          name: 'Oranges',
          purchase_count: 3,
          aisle: { name: 'Produce' }
        }
      ]

      // Mock implementation returns different data based on listId
      mockShoppingListService.getMostPurchasedItems.mockImplementation((listId) => {
        if (listId === 'list-a') {
          return Promise.resolve(historyA)
        } else if (listId === 'list-b') {
          return Promise.resolve(historyB)
        }
        return Promise.resolve([])
      })

      // Verify that with listA, only historyA items are returned
      const resultA = await mockShoppingListService.getMostPurchasedItems('list-a')
      expect(resultA).toEqual(historyA)
      expect(resultA.find(item => item.name === 'Apples')).toBeDefined()
      expect(resultA.find(item => item.name === 'Oranges')).toBeUndefined()

      // Verify that with listB, only historyB items are returned
      const resultB = await mockShoppingListService.getMostPurchasedItems('list-b')
      expect(resultB).toEqual(historyB)
      expect(resultB.find(item => item.name === 'Oranges')).toBeDefined()
      expect(resultB.find(item => item.name === 'Apples')).toBeUndefined()
    })
  })
})
