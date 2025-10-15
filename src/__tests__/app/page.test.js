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
jest.mock('../../components/AddItemForm', () => {
  return function MockAddItemForm({ onAddItem, editingItem, onUpdateItem, onCancelEdit, customAisles }) {
    return (
      <div data-testid="add-item-form">
        <button onClick={() => onAddItem({ name: 'Test Item', aisle: 'Produce', quantity: 1 })}>
          Add Item
        </button>
        {editingItem && (
          <div>
            <span>Editing: {editingItem.name}</span>
            <button onClick={() => onUpdateItem({ ...editingItem, name: 'Updated Item' })}>
              Update
            </button>
            <button onClick={onCancelEdit}>Cancel</button>
          </div>
        )}
      </div>
    )
  }
})

jest.mock('../../components/AisleSection', () => {
  return function MockAisleSection({ aisle, items, onToggleComplete, onDelete, onEdit }) {
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
  'shoppingList.emptyTitle': 'Your list is empty',
  'shoppingList.emptySubtitle': 'Add your first item above'
}

describe('Home', () => {
  const mockUseAuth = useAuth
  const mockUseTranslations = useTranslations
  const mockShoppingListService = ShoppingListService

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseTranslations.mockReturnValue((key, params = {}) => {
      let translation = mockTranslations[key] || key
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{{${param}}}`, value.toString())
      })
      return translation
    })

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    })
  })

  it('should show loading spinner when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true
    })

    render(<Home />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
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

  it('should show loading when data is being loaded for authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    render(<Home />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should load shopping list data when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce', 'Dairy'])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue(mockItems)
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

    render(<Home />)
    
    await waitFor(() => {
      expect(mockShoppingListService.getUserAisles).toHaveBeenCalledWith('user-1')
      expect(mockShoppingListService.getActiveShoppingList).toHaveBeenCalledWith('user-1')
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
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

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
    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.addShoppingItem.mockResolvedValue(newItem)
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

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
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

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
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

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
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toBeInTheDocument()
    })

    const editButton = screen.getByText('Edit')
    await user.click(editButton)
    
    await waitFor(() => {
      expect(screen.getByText('Editing: Apples')).toBeInTheDocument()
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
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    // First click edit
    await user.click(screen.getByText('Edit'))
    
    await waitFor(() => {
      expect(screen.getByText('Update')).toBeInTheDocument()
    })

    // Then click update
    await user.click(screen.getByText('Update'))
    
    await waitFor(() => {
      expect(mockShoppingListService.updateShoppingItem).toHaveBeenCalledWith(
        '1',
        {
          name: 'Updated Item',
          aisle: 'Produce',
          quantity: 3,
          comment: undefined
        }
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
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue(mockItems)
    mockShoppingListService.clearCompletedItems.mockResolvedValue(undefined)
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

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
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

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
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

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
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Manage Aisles')).toBeInTheDocument()
    })

    // Open aisle manager
    await user.click(screen.getByText('Manage Aisles'))
    
    // Update aisles
    await user.click(screen.getByText('Update Aisles'))
    
    await waitFor(() => {
      expect(mockShoppingListService.updateUserAisles).toHaveBeenCalledWith('user-1', ['New Aisle'])
    })
  })

  it('should show empty state when no items', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false
    })

    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems.mockResolvedValue([])
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

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
    mockShoppingListService.getUserAisles.mockResolvedValue(['Produce'])
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(mockShoppingList)
    mockShoppingListService.getShoppingItems
      .mockResolvedValueOnce([]) // Initial load
      .mockResolvedValueOnce([mockItems[0]]) // After list change
    mockShoppingListService.migrateLocalStorageAisles.mockResolvedValue(false)

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
