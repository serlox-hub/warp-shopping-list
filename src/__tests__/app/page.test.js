import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../../app/page'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslations } from '../../contexts/LanguageContext'
import { ShoppingListService } from '../../lib/shoppingListService'

// Mock dependencies
jest.mock('../../contexts/AuthContext')
jest.mock('../../contexts/LanguageContext')
jest.mock('../../lib/shoppingListService')
let addItemFormPropsLog = []
let aisleSectionRenderLog = []

jest.mock('../../components/AddItemForm', () => {
  return function MockAddItemForm({ onAddItem, customAisles, aisleColors, existingItems }) {
    addItemFormPropsLog.push({ customAisles, aisleColors, existingItems })
    return (
      <div data-testid="add-item-form">
        <button onClick={() => onAddItem({ name: 'Test Item', aisle: 'Produce', quantity: 1 })}>
          Add Item
        </button>
      </div>
    )
  }
})

jest.mock('../../components/EditItemModal', () => {
  return function MockEditItemModal({ item, onUpdateItem, onClose }) {
    return (
      <div data-testid="edit-item-modal">
        <h2>Edit Item</h2>
        <span>Editing: {item.name}</span>
        <input defaultValue={item.name} data-testid="edit-name-input" />
        <button onClick={() => onUpdateItem({ ...item, name: 'Updated Item' })}>
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
  return function MockAisleManager({ aisles, onUpdateAisles, onClose }) {
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
        {items.map(item => {
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
  'topItems.title': 'Top Items',
  'topItems.subtitle': 'Subtitle',
  'topItems.empty': 'No top items yet',
  'topItems.purchasedCount': 'Purchased {{count}} times',
  'topItems.addButton': 'Add',
  'topItems.alreadyAdded': 'Already added',
  'topItems.openButton': 'Top Items',
  'topItems.refreshing': 'Refreshing'
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

    mockShoppingListService.getUserAisles.mockResolvedValue([])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.addShoppingItem.mockResolvedValue(undefined)
    mockShoppingListService.updateShoppingItem.mockResolvedValue(undefined)
    mockShoppingListService.deleteShoppingItem.mockResolvedValue(undefined)
    mockShoppingListService.clearCompletedItems.mockResolvedValue(undefined)
    mockShoppingListService.clearAllItems.mockResolvedValue(undefined)
    mockShoppingListService.updateUserAisles.mockResolvedValue(undefined)
    mockShoppingListService.getMostPurchasedItems.mockResolvedValue([])
    mockShoppingListService.renameItemUsage.mockResolvedValue(undefined)
    mockShoppingListService.updateItemUsageMetadata.mockResolvedValue(undefined)
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

    mockShoppingListService.getShoppingItems.mockResolvedValueOnce(mockItems)

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
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue(mockItems)

    render(<Home />)
    
    await waitFor(() => {
      expect(mockShoppingListService.getUserAisles).toHaveBeenCalledWith('user-1')
      expect(mockShoppingListService.getActiveShoppingList).toHaveBeenCalledWith('user-1')
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith('user-1')
    })

    await waitFor(() => {
      expect(mockShoppingListService.getShoppingItems).toHaveBeenCalledWith('list-1')
    })
  })

  it('should render shopping list with items when loaded', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce', 'Dairy'])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue(mockItems)

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByTestId('add-item-form')).toBeInTheDocument()
      expect(screen.getByTestId('aisle-section-Produce')).toBeInTheDocument()
      expect(screen.getByTestId('aisle-section-Dairy')).toBeInTheDocument()
    })

    expect(screen.getByText('1/2 completed')).toBeInTheDocument()
    expect(screen.getByText('Clear Completed (1)')).toBeInTheDocument()
  })

  it('should handle adding new item', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    const newItem = { id: '3', name: 'Test Item', aisle: 'Produce', quantity: 1, completed: false }
    mockShoppingListService.getUserAisles.mockResolvedValue([{ name: 'Produce', color: '#22c55e' }])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.addShoppingItem.mockResolvedValue(newItem)

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByTestId('add-item-form')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Add Item'))
    
    await waitFor(() => {
      expect(mockShoppingListService.addShoppingItem).toHaveBeenCalledWith(
        'list-1',
        'user-1',
        { name: 'Test Item', aisle: 'Produce', quantity: 1 }
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

    const usageItem = {
      item_name: 'Bananas',
      purchase_count: 5,
      last_aisle: 'Produce',
      last_quantity: 2
    }

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.addShoppingItem.mockResolvedValue({
      id: '4',
      name: 'Bananas',
      aisle: 'Produce',
      quantity: 2,
      completed: false
    })
    mockShoppingListService.getMostPurchasedItems.mockResolvedValue([usageItem])

    render(<Home />)

    await waitFor(() => {
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith('user-1')
    })

    await user.click(screen.getByText('Top Items'))

    const quickAddButton = await screen.findByText('Add Bananas')
    await user.click(quickAddButton)

    await waitFor(() => {
      expect(mockShoppingListService.addShoppingItem).toHaveBeenCalledWith(
        'list-1',
        'user-1',
        { name: 'Bananas', aisle: 'Produce', quantity: 2, comment: '' }
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

    const usageItem = {
      item_name: 'Apples',
      purchase_count: 8,
      last_aisle: 'Produce',
      last_quantity: 4
    }

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([mockItems[0]])
    mockShoppingListService.getMostPurchasedItems.mockResolvedValue([usageItem])

    render(<Home />)

    await waitFor(() => {
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledWith('user-1')
    })

    await user.click(screen.getByText('Top Items'))

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
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([mockItems[0]])
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
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([mockItems[0]])
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
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([mockItems[0]])

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

    const updatedItem = { ...mockItems[0], name: 'Updated Item' }
    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([mockItems[0]])
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
          aisle: 'Produce',
          quantity: 3
        })
      )
    })

    await waitFor(() => {
      expect(mockShoppingListService.renameItemUsage).toHaveBeenCalledWith(
        'user-1',
        'Apples',
        'Updated Item',
        expect.objectContaining({
          oldAisle: 'Produce',
          newAisle: 'Produce',
          quantity: 3
        })
      )
    })

    await waitFor(() => {
      expect(mockShoppingListService.getMostPurchasedItems).toHaveBeenCalledTimes(2)
    })
  })

  it('should handle clearing completed items', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce', 'Dairy'])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue(mockItems)
    mockShoppingListService.clearCompletedItems.mockResolvedValue(undefined)

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Clear Completed (1)')).toBeInTheDocument()
    })

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
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([mockItems[0]])
    mockShoppingListService.clearAllItems.mockResolvedValue(undefined)

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

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

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([])

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Manage Aisles')).toBeInTheDocument()
    })

    // Open aisle manager
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

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.updateUserAisles.mockResolvedValue(undefined)

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Manage Aisles')).toBeInTheDocument()
    })

    // Open aisle manager
    await user.click(screen.getByText('Manage Aisles'))
    
    // Update aisles
    await user.click(screen.getByText('Update Aisles'))
    
    await waitFor(() => {
      expect(mockShoppingListService.updateUserAisles).toHaveBeenCalledWith('user-1', [
        { name: 'New Aisle', color: '#6b7280' }
      ])
    })
  })

  it('should show empty state when no items', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue([{ name: 'Produce', color: '#22c55e' }])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([])

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Your list is empty')).toBeInTheDocument()
      expect(screen.getByText('Add your first item above')).toBeInTheDocument()
    })
  })

  it('should handle list change', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    const newList = { id: '2', name: 'New List' }
    mockShoppingListService.getUserAisles.mockResolvedValue([{ name: 'Produce', color: '#22c55e' }])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
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
})
