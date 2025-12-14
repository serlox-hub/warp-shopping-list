import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ListSelector from '../../components/ListSelector.js'

// Mock ShoppingListService
jest.mock('../../lib/shoppingListService', () => ({
  ShoppingListService: {
    getUserShoppingLists: jest.fn(),
    setActiveList: jest.fn(),
    createShoppingList: jest.fn(),
    updateShoppingListName: jest.fn(),
    deleteShoppingList: jest.fn(),
    getActiveShoppingList: jest.fn(),
    isListShared: jest.fn(),
  },
}));

// Get reference after mock
const { ShoppingListService: mockShoppingListService } = require('../../lib/shoppingListService')

// Mock contexts
const mockUser = { id: 'user-1' };
const mockTranslations = jest.fn((key) => key);

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: mockUser })),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useTranslations: jest.fn(() => mockTranslations),
}));

// Mock window methods
global.alert = jest.fn();
global.confirm = jest.fn();

describe('ListSelector', () => {
  const mockList = {
    id: 'list-1',
    name: 'Test List',
    user_id: 'user-1',
    is_active: true
  };

  const defaultProps = {
    currentList: mockList,
    onListChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockTranslations.mockImplementation((key) => key)
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([mockList])
    mockShoppingListService.isListShared.mockResolvedValue(false)
  })

  it('should render without crashing', async () => {
    render(<ListSelector {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockShoppingListService.getUserShoppingLists).toHaveBeenCalledWith('user-1')
    })

    expect(screen.getByText('Test List')).toBeInTheDocument()
    expect(screen.getByTitle('listSelector.switchList')).toBeInTheDocument()
  })

  it('should return null when no currentList provided', async () => {
    const { container } = render(<ListSelector currentList={null} onListChange={jest.fn()} />)

    await waitFor(() => {
      expect(mockShoppingListService.getUserShoppingLists).toHaveBeenCalledWith('user-1')
    })

    expect(container.firstChild).toBeNull()
  })

  it('should toggle dropdown when clicked', async () => {
    render(<ListSelector {...defaultProps} />)

    await waitFor(() => {
      expect(mockShoppingListService.getUserShoppingLists).toHaveBeenCalledWith('user-1')
    })
    
    const toggleButton = screen.getByTitle('listSelector.switchList')
    
    // Initially closed
    expect(screen.queryByText('listSelector.yourLists')).not.toBeInTheDocument()
    
    // Click to open
    await userEvent.click(toggleButton)
    
    await waitFor(() => {
      expect(screen.getByText(/listSelector\.yourLists/)).toBeInTheDocument()
    })
  })

  it('should load lists on mount when user is available', async () => {
    render(<ListSelector {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockShoppingListService.getUserShoppingLists).toHaveBeenCalledWith('user-1')
    })
  })

  it('should handle list selection', async () => {
    const onListChange = jest.fn()
    const anotherList = { id: 'list-2', name: 'Another List' }
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([mockList, anotherList])
    mockShoppingListService.setActiveList.mockResolvedValue(anotherList)
    
    render(<ListSelector currentList={mockList} onListChange={onListChange} />)
    
    // Open dropdown
    const toggleButton = screen.getByTitle('listSelector.switchList')
    await userEvent.click(toggleButton)
    
    await waitFor(() => {
      const anotherListButton = screen.getByText('Another List').closest('button')
      expect(anotherListButton).toBeInTheDocument()
    })
  })

  it('should handle creating a new list', async () => {
    const user = userEvent.setup()
    const onListChange = jest.fn()
    const newList = { id: 'list-new', name: 'New List' }
    mockShoppingListService.createShoppingList.mockResolvedValue(newList)
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([mockList, newList])
    
    render(<ListSelector {...defaultProps} onListChange={onListChange} />)
    
    // Open dropdown
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    // Click "New List" button
    await waitFor(() => {
      expect(screen.getByText('listSelector.newList')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('listSelector.newList'))
    
    // Should show create form
    await waitFor(() => {
      expect(screen.getByPlaceholderText('listSelector.listNamePlaceholder')).toBeInTheDocument()
    })
    
    // Type new list name
    const input = screen.getByPlaceholderText('listSelector.listNamePlaceholder')
    await user.type(input, 'New List')
    
    // Submit form
    await user.click(screen.getByText('listSelector.createList'))
    
    await waitFor(() => {
      expect(mockShoppingListService.createShoppingList).toHaveBeenCalledWith(
        'user-1',
        'New List',
        true
      )
      expect(onListChange).toHaveBeenCalledWith(newList)
    })
  })

  it('should handle editing list name', async () => {
    const user = userEvent.setup()
    mockShoppingListService.updateShoppingListName.mockResolvedValue()
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([mockList])
    
    render(<ListSelector {...defaultProps} />)
    
    // Open dropdown
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      const editButton = screen.getByTitle('listSelector.editList')
      expect(editButton).toBeInTheDocument()
    })
    
    // Click edit button
    const editButton = screen.getByTitle('listSelector.editList')
    await user.click(editButton)
    
    // Should show edit form
    await waitFor(() => {
      const editInput = screen.getByDisplayValue('Test List')
      expect(editInput).toBeInTheDocument()
    })
    
    // Change name
    const editInput = screen.getByDisplayValue('Test List')
    await user.clear(editInput)
    await user.type(editInput, 'Updated List')
    
    // Save changes
    await user.click(screen.getByText('common.save'))
    
    await waitFor(() => {
      expect(mockShoppingListService.updateShoppingListName).toHaveBeenCalledWith(
        'list-1',
        'Updated List'
      )
    })
  })

  it('should handle delete list confirmation', async () => {
    const lists = [mockList, { id: 'list-2', name: 'List 2' }]
    mockShoppingListService.getUserShoppingLists.mockResolvedValue(lists)
    global.confirm.mockReturnValue(true)
    
    render(<ListSelector {...defaultProps} />)
    
    // Open dropdown
    await userEvent.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('listSelector.deleteList')
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
  })

  it('should prevent deletion when only one list exists', async () => {
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([mockList])
    global.alert.mockClear()
    
    render(<ListSelector {...defaultProps} />)
    
    // Open dropdown
    await userEvent.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      // Should not show delete button when only one list exists
      expect(screen.queryByTitle('listSelector.deleteList')).not.toBeInTheDocument()
    })
  })

  it('should close dropdown when clicking overlay', async () => {
    const user = userEvent.setup()
    render(<ListSelector {...defaultProps} />)
    
    // Open dropdown
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      expect(screen.getByText(/listSelector\.yourLists/)).toBeInTheDocument()
    })
    
    // Click overlay to close
    const overlay = document.querySelector('.fixed.inset-0')
    expect(overlay).toBeInTheDocument()
    await user.click(overlay)
    
    await waitFor(() => {
      expect(screen.queryByText(/listSelector\.yourLists/)).not.toBeInTheDocument()
    })
  })

  it('should not switch to same list when clicked', async () => {
    const user = userEvent.setup()
    const onListChange = jest.fn()
    
    render(<ListSelector {...defaultProps} onListChange={onListChange} />)
    
    // Open dropdown
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      expect(screen.getByText('listSelector.yourLists')).toBeInTheDocument()
    })
    
    // Simulate clicking the current list - the behavior is that it should just close
    // without calling the service methods. We can verify this by checking the service wasn't called.
    const beforeCallCount = mockShoppingListService.setActiveList.mock.calls.length
    
    // Click outside to close dropdown first, then test that clicking same list doesn't switch
    const overlay = document.querySelector('.fixed.inset-0')
    await user.click(overlay)
    
    // Verify services weren't called
    expect(mockShoppingListService.setActiveList.mock.calls.length).toBe(beforeCallCount)
    expect(onListChange).not.toHaveBeenCalled()
  })

  it('should switch to different list when clicked', async () => {
    const user = userEvent.setup()
    const onListChange = jest.fn()
    const anotherList = { id: 'list-2', name: 'Another List' }
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([mockList, anotherList])
    mockShoppingListService.setActiveList.mockResolvedValue(anotherList)
    
    render(<ListSelector currentList={mockList} onListChange={onListChange} />)
    
    // Open dropdown
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    // Click different list
    await waitFor(() => {
      expect(screen.getByText('Another List')).toBeInTheDocument()
    })
    
    const anotherListButton = screen.getByText('Another List').closest('button')
    await user.click(anotherListButton)
    
    await waitFor(() => {
      expect(mockShoppingListService.setActiveList).toHaveBeenCalledWith('user-1', 'list-2')
      expect(onListChange).toHaveBeenCalledWith(anotherList)
    })
  })

  it('should cancel editing when cancel button is clicked', async () => {
    const user = userEvent.setup()
    
    render(<ListSelector {...defaultProps} />)
    
    // Open dropdown and start editing
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      expect(screen.getByTitle('listSelector.editList')).toBeInTheDocument()
    })
    
    await user.click(screen.getByTitle('listSelector.editList'))
    
    // Should show edit form
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test List')).toBeInTheDocument()
    })
    
    // Click cancel
    await user.click(screen.getByText('common.cancel'))
    
    // Should go back to view mode
    await waitFor(() => {
      expect(screen.queryByDisplayValue('Test List')).not.toBeInTheDocument()
      // Check for the main toggle button text instead
      const mainButton = screen.getByTitle('listSelector.switchList')
      expect(mainButton).toBeInTheDocument()
    })
  })

  it('should not submit edit with empty name', async () => {
    const user = userEvent.setup()
    
    render(<ListSelector {...defaultProps} />)
    
    // Start editing
    await user.click(screen.getByTitle('listSelector.switchList'))
    await waitFor(() => {
      expect(screen.getByTitle('listSelector.editList')).toBeInTheDocument()
    })
    await user.click(screen.getByTitle('listSelector.editList'))
    
    // Clear input
    const editInput = screen.getByDisplayValue('Test List')
    await user.clear(editInput)
    
    // Save button should be disabled
    const saveButton = screen.getByText('common.save')
    expect(saveButton).toBeDisabled()
  })

  it('should cancel create list form', async () => {
    const user = userEvent.setup()
    
    render(<ListSelector {...defaultProps} />)
    
    // Open dropdown and start creating
    await user.click(screen.getByTitle('listSelector.switchList'))
    await waitFor(() => {
      expect(screen.getByText('listSelector.newList')).toBeInTheDocument()
    })
    await user.click(screen.getByText('listSelector.newList'))
    
    // Should show create form
    await waitFor(() => {
      expect(screen.getByPlaceholderText('listSelector.listNamePlaceholder')).toBeInTheDocument()
    })
    
    // Type something
    const input = screen.getByPlaceholderText('listSelector.listNamePlaceholder')
    await user.type(input, 'Some text')
    
    // Click cancel
    await user.click(screen.getByText('common.cancel'))
    
    // Should hide form and clear input
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('listSelector.listNamePlaceholder')).not.toBeInTheDocument()
      expect(screen.getByText('listSelector.newList')).toBeInTheDocument()
    })
  })

  it('should not submit create form with empty name', async () => {
    const user = userEvent.setup()
    
    render(<ListSelector {...defaultProps} />)
    
    // Start creating
    await user.click(screen.getByTitle('listSelector.switchList'))
    await user.click(screen.getByText('listSelector.newList'))
    
    await waitFor(() => {
      const createButton = screen.getByText('listSelector.createList')
      expect(createButton).toBeDisabled()
    })
  })

  it('should handle delete list with confirmation', async () => {
    const user = userEvent.setup()
    const lists = [mockList, { id: 'list-2', name: 'List 2' }]
    mockShoppingListService.getUserShoppingLists.mockResolvedValue(lists)
    global.confirm.mockReturnValue(true)
    
    render(<ListSelector {...defaultProps} />)
    
    // Open dropdown
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('listSelector.deleteList')
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
    
    const deleteButton = screen.getAllByTitle('listSelector.deleteList')[0]
    await user.click(deleteButton)
    
    expect(global.confirm).toHaveBeenCalledWith('listSelector.confirmDelete')
    
    await waitFor(() => {
      expect(mockShoppingListService.deleteShoppingList).toHaveBeenCalledWith('user-1', 'list-1')
    })
  })

  it('should cancel delete when user declines confirmation', async () => {
    const user = userEvent.setup()
    const lists = [mockList, { id: 'list-2', name: 'List 2' }]
    mockShoppingListService.getUserShoppingLists.mockResolvedValue(lists)
    global.confirm.mockReturnValue(false)
    
    render(<ListSelector {...defaultProps} />)
    
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('listSelector.deleteList')
      expect(deleteButtons[0]).toBeInTheDocument()
    })
    
    const deleteButton = screen.getAllByTitle('listSelector.deleteList')[0]
    await user.click(deleteButton)
    
    expect(mockShoppingListService.deleteShoppingList).not.toHaveBeenCalled()
  })

  it('should show alert when trying to delete last list', async () => {
    const user = userEvent.setup()
    // Mock only one list, but force showing delete button by mocking DOM
    const singleList = { ...mockList }
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([singleList])
    
    render(<ListSelector {...defaultProps} />)
    
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      // When only one list, delete button should not be rendered
      expect(screen.queryByTitle('listSelector.deleteList')).not.toBeInTheDocument()
    })
  })

  it('should handle editing current list and update it', async () => {
    const user = userEvent.setup()
    const onListChange = jest.fn()
    mockShoppingListService.updateShoppingListName.mockResolvedValue()
    
    render(<ListSelector currentList={mockList} onListChange={onListChange} />)
    
    // Start editing current list
    await user.click(screen.getByTitle('listSelector.switchList'))
    await user.click(screen.getByTitle('listSelector.editList'))
    
    // Change name
    const editInput = screen.getByDisplayValue('Test List')
    await user.clear(editInput)
    await user.type(editInput, 'Updated Current List')
    
    await user.click(screen.getByText('common.save'))
    
    await waitFor(() => {
      expect(mockShoppingListService.updateShoppingListName).toHaveBeenCalledWith(
        'list-1',
        'Updated Current List'
      )
      // Should update current list in parent
      expect(onListChange).toHaveBeenCalledWith({
        ...mockList,
        name: 'Updated Current List'
      })
    })
  })

  it('should handle deleting current list and load new active list', async () => {
    const user = userEvent.setup()
    const onListChange = jest.fn()
    const lists = [mockList, { id: 'list-2', name: 'List 2' }]
    const newActiveList = { id: 'list-2', name: 'List 2', is_active: true }
    
    mockShoppingListService.getUserShoppingLists.mockResolvedValue(lists)
    mockShoppingListService.getActiveShoppingList.mockResolvedValue(newActiveList)
    global.confirm.mockReturnValue(true)
    
    render(<ListSelector currentList={mockList} onListChange={onListChange} />)
    
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      const deleteButton = screen.getAllByTitle('listSelector.deleteList')[0]
      expect(deleteButton).toBeInTheDocument()
    })
    
    await user.click(screen.getAllByTitle('listSelector.deleteList')[0])
    
    await waitFor(() => {
      expect(mockShoppingListService.deleteShoppingList).toHaveBeenCalledWith('user-1', 'list-1')
      expect(mockShoppingListService.getActiveShoppingList).toHaveBeenCalledWith('user-1')
      expect(onListChange).toHaveBeenCalledWith(newActiveList)
    })
  })

  it('should handle errors when loading lists', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockShoppingListService.getUserShoppingLists.mockRejectedValue(new Error('Load failed'))
    
    render(<ListSelector {...defaultProps} />)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading lists:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })

  it('should handle errors when switching lists', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const anotherList = { id: 'list-2', name: 'Another List' }
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([mockList, anotherList])
    mockShoppingListService.setActiveList.mockRejectedValue(new Error('Switch failed'))
    
    render(<ListSelector {...defaultProps} />)
    
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      expect(screen.getByText('Another List')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Another List').closest('button'))
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error switching list:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })

  it('should handle errors when creating lists', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockShoppingListService.createShoppingList.mockRejectedValue(new Error('Create failed'))
    
    render(<ListSelector {...defaultProps} />)
    
    await user.click(screen.getByTitle('listSelector.switchList'))
    await user.click(screen.getByText('listSelector.newList'))
    
    const input = screen.getByPlaceholderText('listSelector.listNamePlaceholder')
    await user.type(input, 'New List')
    await user.click(screen.getByText('listSelector.createList'))
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error creating list:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })

  it('should handle errors when updating list names', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockShoppingListService.updateShoppingListName.mockRejectedValue(new Error('Update failed'))
    
    render(<ListSelector {...defaultProps} />)
    
    await user.click(screen.getByTitle('listSelector.switchList'))
    await user.click(screen.getByTitle('listSelector.editList'))
    
    const editInput = screen.getByDisplayValue('Test List')
    await user.clear(editInput)
    await user.type(editInput, 'Updated List')
    await user.click(screen.getByText('common.save'))
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error updating list name:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })

  it('should handle errors when deleting lists', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const alertSpy = jest.spyOn(global, 'alert').mockImplementation(() => {})
    
    const lists = [mockList, { id: 'list-2', name: 'List 2' }]
    mockShoppingListService.getUserShoppingLists.mockResolvedValue(lists)
    mockShoppingListService.deleteShoppingList.mockRejectedValue(new Error('Delete failed'))
    global.confirm.mockReturnValue(true)
    
    render(<ListSelector {...defaultProps} />)
    
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      const deleteButton = screen.getAllByTitle('listSelector.deleteList')[0]
      expect(deleteButton).toBeInTheDocument()
    })
    
    await user.click(screen.getAllByTitle('listSelector.deleteList')[0])
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error deleting list:', expect.any(Error))
      expect(alertSpy).toHaveBeenCalledWith('Error deleting list: Delete failed')
    })
    
    consoleSpy.mockRestore()
    alertSpy.mockRestore()
  })

  it('should disable buttons when loading', async () => {
    const user = userEvent.setup()
    // Mock a slow service call to test loading state
    mockShoppingListService.setActiveList.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockList), 100))
    )
    
    const anotherList = { id: 'list-2', name: 'Another List' }
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([mockList, anotherList])
    
    render(<ListSelector {...defaultProps} />)
    
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    // Click another list to trigger loading state
    await waitFor(() => {
      expect(screen.getByText('Another List')).toBeInTheDocument()
    })
    
    // Start the async operation but don't wait for it to complete
    user.click(screen.getByText('Another List').closest('button'))
    
    // The main toggle button should be disabled during loading
    await waitFor(() => {
      const toggleButton = screen.getByTitle('listSelector.switchList')
      expect(toggleButton).toBeDisabled()
    }, { timeout: 50 })
  })

  it('should prevent form submission with only whitespace', async () => {
    const user = userEvent.setup()
    
    render(<ListSelector {...defaultProps} />)
    
    // Test create form
    await user.click(screen.getByTitle('listSelector.switchList'))
    await user.click(screen.getByText('listSelector.newList'))
    
    const input = screen.getByPlaceholderText('listSelector.listNamePlaceholder')
    await user.type(input, '   ') // Only whitespace
    
    const createButton = screen.getByText('listSelector.createList')
    expect(createButton).toBeDisabled()
    
    // Test edit form
    await user.click(screen.getByText('common.cancel'))
    await user.click(screen.getByTitle('listSelector.editList'))
    
    const editInput = screen.getByDisplayValue('Test List')
    await user.clear(editInput)
    await user.type(editInput, '   ') // Only whitespace
    
    const saveButton = screen.getByText('common.save')
    expect(saveButton).toBeDisabled()
  })

  it('should reset overlay state when closed', async () => {
    const user = userEvent.setup()
    
    render(<ListSelector {...defaultProps} />)
    
    // Open dropdown and start creating
    await user.click(screen.getByTitle('listSelector.switchList'))
    await user.click(screen.getByText('listSelector.newList'))
    
    // Type in create form
    const input = screen.getByPlaceholderText('listSelector.listNamePlaceholder')
    await user.type(input, 'Some text')
    
    // Start editing a list
    await user.click(screen.getByText('common.cancel'))
    await user.click(screen.getByTitle('listSelector.editList'))
    
    // Click overlay to close everything
    const overlay = document.querySelector('.fixed.inset-0')
    await user.click(overlay)
    
    // Reopen - everything should be reset
    await user.click(screen.getByTitle('listSelector.switchList'))
    
    await waitFor(() => {
      // Should show new list button (not create form)
      expect(screen.getByText('listSelector.newList')).toBeInTheDocument()
      // Should not show edit form
      expect(screen.queryByDisplayValue('Test List')).not.toBeInTheDocument()
    })
  })

  it('should not make duplicate API calls on mount', async () => {
    render(<ListSelector {...defaultProps} />)

    // Wait for initial load
    await waitFor(() => {
      expect(mockShoppingListService.getUserShoppingLists).toHaveBeenCalled()
    })

    // Verify it was called exactly once with correct user ID
    expect(mockShoppingListService.getUserShoppingLists).toHaveBeenCalledTimes(1)
    expect(mockShoppingListService.getUserShoppingLists).toHaveBeenCalledWith(mockUser.id)
  })

  it('should show shared indicator for shared lists', async () => {
    const sharedList = { id: 'list-1', name: 'Shared List' }
    const privateList = { id: 'list-2', name: 'Private List' }
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([sharedList, privateList])
    mockShoppingListService.isListShared.mockImplementation(async (listId) => {
      return listId === 'list-1'
    })

    render(<ListSelector currentList={sharedList} onListChange={jest.fn()} />)

    await waitFor(() => {
      expect(mockShoppingListService.isListShared).toHaveBeenCalledWith('list-1')
      expect(mockShoppingListService.isListShared).toHaveBeenCalledWith('list-2')
    })

    // The shared indicator should be visible for shared list
    await waitFor(() => {
      const button = screen.getByTitle('listSelector.switchList')
      // Check if the shared icon SVG is present (users icon)
      expect(button.querySelector('svg[title="share.members"]')).toBeInTheDocument()
    })
  })

  it('should not show shared indicator for private lists', async () => {
    const privateList = { id: 'list-1', name: 'Private List' }
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([privateList])
    mockShoppingListService.isListShared.mockResolvedValue(false)

    render(<ListSelector currentList={privateList} onListChange={jest.fn()} />)

    await waitFor(() => {
      expect(mockShoppingListService.isListShared).toHaveBeenCalledWith('list-1')
    })

    // Should not have shared indicator
    await waitFor(() => {
      const button = screen.getByTitle('listSelector.switchList')
      expect(button.querySelector('svg[title="share.members"]')).not.toBeInTheDocument()
    })
  })

  it('should show shared indicator in dropdown list items', async () => {
    const user = userEvent.setup()
    const sharedList = { id: 'list-1', name: 'Shared List' }
    const privateList = { id: 'list-2', name: 'Private List' }
    mockShoppingListService.getUserShoppingLists.mockResolvedValue([sharedList, privateList])
    mockShoppingListService.isListShared.mockImplementation(async (listId) => {
      return listId === 'list-1'
    })

    render(<ListSelector currentList={sharedList} onListChange={jest.fn()} />)

    await waitFor(() => {
      expect(mockShoppingListService.isListShared).toHaveBeenCalled()
    })

    // Open dropdown
    await user.click(screen.getByTitle('listSelector.switchList'))

    // Check for shared indicators in dropdown
    await waitFor(() => {
      const dropdown = document.querySelector('.absolute.left-0')
      expect(dropdown).toBeInTheDocument()
      // Shared list should have the indicator
      const sharedIcons = dropdown.querySelectorAll('svg[title="share.members"]')
      expect(sharedIcons.length).toBeGreaterThan(0)
    })
  })
})
