import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddItemForm from '../../components/AddItemForm'
import { useTranslations } from '../../contexts/LanguageContext'

// Mock dependencies
jest.mock('../../contexts/LanguageContext')
jest.mock('../../types/shoppingList', () => ({
  DEFAULT_AISLES: ['Produce', 'Dairy', 'Bakery', 'Other'],
  getDefaultAisleColor: (aisle) => ({
    Produce: '#22c55e',
    Dairy: '#f97316',
    Bakery: '#f59e0b',
    Other: '#6b7280'
  })[aisle] || '#6b7280'
}))

const mockTranslations = {
  'addItemForm.addTitle': 'Add New Item',
  'addItemForm.editTitle': 'Edit Item',
  'addItemForm.itemName': 'Item Name',
  'addItemForm.itemNamePlaceholder': 'Enter item name',
  'addItemForm.aisle': 'Aisle',
  'addItemForm.quantity': 'Quantity',
  'addItemForm.comment': 'Comment (optional)',
  'addItemForm.commentPlaceholder': 'Add a note or comment...',
  'addItemForm.commentHelper': 'Optional note (max 200 characters)',
  'addItemForm.addButton': 'Add Item',
  'addItemForm.updateButton': 'Update Item',
  'common.cancel': 'Cancel',
  'topItems.alreadyAdded': 'Already in list',
  // Aisle translations
  'aisles.produce': 'Produce',
  'aisles.dairy': 'Dairy',
  'aisles.bakery': 'Bakery',
  'aisles.other': 'Other'
}

describe('AddItemForm', () => {
  const mockUseTranslations = useTranslations
  const mockOnAddItem = jest.fn()
  const mockOnUpdateItem = jest.fn()
  const mockOnCancelEdit = jest.fn()

  const defaultProps = {
    onAddItem: mockOnAddItem,
    editingItem: null,
    onUpdateItem: mockOnUpdateItem,
    onCancelEdit: mockOnCancelEdit,
    customAisles: ['Produce', 'Dairy', 'Bakery', 'Other'],
    itemUsageHistory: [],
    existingItemNames: [],
    existingItems: [],
    aisleColors: {}
  }

  const mockEditingItem = {
    id: '1',
    name: 'Apples',
    aisle: 'Produce',
    quantity: 3,
    comment: 'Red apples'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseTranslations.mockReturnValue((key) => mockTranslations[key] || key)
  })

  it('should render add form correctly', () => {
    render(<AddItemForm {...defaultProps} />)
    
    expect(screen.getByText('Add New Item')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter item name')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add a note or comment...')).toBeInTheDocument()
    expect(screen.getByText('Add Item')).toBeInTheDocument()
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('should render edit form correctly', () => {
    render(<AddItemForm {...defaultProps} editingItem={mockEditingItem} />)
    
    expect(screen.getByText('Edit Item')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Apples')).toBeInTheDocument()
    expect(screen.getByDisplayValue('3')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Red apples')).toBeInTheDocument()
    expect(screen.getByText('Update Item')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should handle form input changes', async () => {
    const user = userEvent.setup()
    render(<AddItemForm {...defaultProps} />)
    
    const nameInput = screen.getByPlaceholderText('Enter item name')
    const quantityInput = screen.getByDisplayValue('1')
    const commentInput = screen.getByPlaceholderText('Add a note or comment...')
    
    await user.type(nameInput, 'Bananas')
    await user.clear(quantityInput)
    await user.type(quantityInput, '5')
    await user.type(commentInput, 'Yellow bananas')
    
    expect(nameInput).toHaveValue('Bananas')
    expect(quantityInput).toHaveValue(5)
    expect(commentInput).toHaveValue('Yellow bananas')
  })

  it('should handle aisle selection', async () => {
    const user = userEvent.setup()
    render(<AddItemForm {...defaultProps} />)
    
    const aisleSelect = screen.getByRole('combobox')
    await user.selectOptions(aisleSelect, 'Dairy')
    
    expect(aisleSelect).toHaveValue('Dairy')
  })

  it('should submit new item with correct data', async () => {
    const user = userEvent.setup()
    render(<AddItemForm {...defaultProps} />)
    
    await user.type(screen.getByPlaceholderText('Enter item name'), 'Milk')
    await user.selectOptions(screen.getByRole('combobox'), 'Dairy')
    const quantityInput = screen.getByDisplayValue('1')
    await user.clear(quantityInput)
    await user.type(quantityInput, '2')
    await user.type(screen.getByPlaceholderText('Add a note or comment...'), 'Whole milk')
    
    await user.click(screen.getByText('Add Item'))
    
    expect(mockOnAddItem).toHaveBeenCalledWith({
      name: 'Milk',
      aisle: 'Dairy',
      quantity: 2,
      comment: 'Whole milk'
    })
  })

  it('should update existing item with correct data', async () => {
    const user = userEvent.setup()
    render(<AddItemForm {...defaultProps} editingItem={mockEditingItem} />)
    
    const nameInput = screen.getByDisplayValue('Apples')
    await user.clear(nameInput)
    await user.type(nameInput, 'Green Apples')
    
    await user.click(screen.getByText('Update Item'))
    
    expect(mockOnUpdateItem).toHaveBeenCalledWith({
      ...mockEditingItem,
      name: 'Green Apples',
      aisle: 'Produce',
      quantity: 3,
      comment: 'Red apples'
    })
  })

  it('should handle cancel edit', async () => {
    const user = userEvent.setup()
    render(<AddItemForm {...defaultProps} editingItem={mockEditingItem} />)
    
    await user.click(screen.getByText('Cancel'))
    
    expect(mockOnCancelEdit).toHaveBeenCalled()
  })

  it('should not submit with empty name', async () => {
    const user = userEvent.setup()
    render(<AddItemForm {...defaultProps} />)
    
    await user.click(screen.getByText('Add Item'))
    
    expect(mockOnAddItem).not.toHaveBeenCalled()
  })

  it('should trim whitespace from inputs', async () => {
    const user = userEvent.setup()
    render(<AddItemForm {...defaultProps} />)
    
    await user.type(screen.getByPlaceholderText('Enter item name'), '  Bread  ')
    await user.type(screen.getByPlaceholderText('Add a note or comment...'), '  Fresh bread  ')
    
    await user.click(screen.getByText('Add Item'))
    
    expect(mockOnAddItem).toHaveBeenCalledWith({
      name: 'Bread',
      aisle: 'Other', // Default aisle
      quantity: 1,
      comment: 'Fresh bread'
    })
  })

  it('should show character count for comment', async () => {
    const user = userEvent.setup()
    render(<AddItemForm {...defaultProps} />)
    
    const commentInput = screen.getByPlaceholderText('Add a note or comment...')
    await user.type(commentInput, 'Test comment')
    
    expect(screen.getByText('12/200')).toBeInTheDocument()
  })

  it('should limit comment to 200 characters', () => {
    render(<AddItemForm {...defaultProps} />)
    
    const commentInput = screen.getByPlaceholderText('Add a note or comment...')
    expect(commentInput).toHaveAttribute('maxLength', '200')
  })

  it('should show fuzzy suggestions after typing three characters', async () => {
    const user = userEvent.setup()
    render(
      <AddItemForm
        {...defaultProps}
        itemUsageHistory={[
          { item_name: 'Manzana', purchase_count: 10, last_aisle: 'Produce' },
          { item_name: 'Mazapan', purchase_count: 6, last_aisle: 'Bakery' },
          { item_name: 'Pera', purchase_count: 4 }
        ]}
        existingItems={[{ name: 'Manzana', aisle: 'Produce' }]}
      />
    )

    const nameInput = screen.getByPlaceholderText('Enter item name')
    await user.type(nameInput, 'mzn')

    const suggestionsList = await screen.findByTestId('item-suggestions')
    const suggestionItems = within(suggestionsList).getAllByTestId('suggestion-item')

    expect(suggestionItems).toHaveLength(2)
    expect(suggestionItems[0]).toHaveTextContent('Manzana')
    expect(suggestionItems[0]).toHaveAttribute('data-in-list', 'true')
    expect(suggestionItems[0]).toHaveTextContent('Already in list')
    expect(suggestionItems[1]).toHaveTextContent('Mazapan')
    expect(suggestionItems[1]).toHaveAttribute('data-in-list', 'false')
    const produceBadge = within(suggestionItems[0]).getByText('Produce')
    const bakeryBadge = within(suggestionItems[1]).getByText('Bakery')
    expect(produceBadge).toBeInTheDocument()
    expect(bakeryBadge).toBeInTheDocument()
    expect(produceBadge).toHaveStyle({ backgroundColor: '#22c55e' })
    expect(produceBadge).toHaveStyle({ borderColor: 'rgba(34, 197, 94, 0.45)' })
    expect(bakeryBadge).toHaveStyle({ backgroundColor: '#f59e0b' })

    const primaryHighlights = within(suggestionItems[0]).getAllByTestId('highlight-segment-match')
    expect(primaryHighlights.map((node) => node.textContent?.trim())).toEqual(['M', 'z', 'n'])

    const secondaryHighlights = within(suggestionItems[1]).getAllByTestId('highlight-segment-match')
    expect(secondaryHighlights.map((node) => node.textContent?.trim())).toEqual(['M', 'z', 'n'])
  })

  it('should treat identical names in different aisles as distinct suggestions', async () => {
    const user = userEvent.setup()
    render(
      <AddItemForm
        {...defaultProps}
        existingItems={[{ name: 'Setas', aisle: 'Produce' }]}
        itemUsageHistory={[
          { item_name: 'Setas', purchase_count: 8, last_aisle: 'Produce', usage_key: 'Setas::Produce' },
          { item_name: 'Setas', purchase_count: 5, last_aisle: 'Frozen', usage_key: 'Setas::Frozen' }
        ]}
      />
    )

    const nameInput = screen.getByPlaceholderText('Enter item name')
    await user.type(nameInput, 'setas')

    const suggestionsList = await screen.findByTestId('item-suggestions')
    const suggestionItems = within(suggestionsList).getAllByTestId('suggestion-item')

    expect(suggestionItems).toHaveLength(2)
    expect(suggestionItems[0]).toHaveAttribute('data-in-list', 'true')
    expect(suggestionItems[1]).toHaveAttribute('data-in-list', 'false')
  })

  it('should prioritize exact matches before partial matches', async () => {
    const user = userEvent.setup()
    render(
      <AddItemForm
        {...defaultProps}
        itemUsageHistory={[
          { item_name: 'Leche', purchase_count: 2, last_aisle: 'Dairy' },
          { item_name: 'Dulce de Leche', purchase_count: 6, last_aisle: 'Bakery' },
          { item_name: 'Lechuga', purchase_count: 5, last_aisle: 'Produce' }
        ]}
      />
    )

    const nameInput = screen.getByPlaceholderText('Enter item name')
    await user.type(nameInput, 'leche')

    const suggestionsList = await screen.findByTestId('item-suggestions')
    const suggestionItems = within(suggestionsList).getAllByTestId('suggestion-item')

    expect(suggestionItems[0]).toHaveTextContent('Leche')
    expect(suggestionItems[1]).toHaveTextContent('Dulce de Leche')
    const dairyBadge = within(suggestionItems[0]).getByText('Dairy')
    const bakeryBadge = within(suggestionItems[1]).getByText('Bakery')
    expect(dairyBadge).toBeInTheDocument()
    expect(bakeryBadge).toBeInTheDocument()
    expect(dairyBadge).toHaveStyle({ backgroundColor: '#f97316' })
    expect(bakeryBadge).toHaveStyle({ backgroundColor: '#f59e0b' })

    const exactHighlights = within(suggestionItems[0]).getAllByTestId('highlight-segment-match')
    expect(exactHighlights).toHaveLength(1)
    expect(exactHighlights[0]).toHaveTextContent('Leche')

    const partialHighlights = within(suggestionItems[1]).getAllByTestId('highlight-segment-match')
    expect(partialHighlights).toHaveLength(1)
    expect(partialHighlights[0]).toHaveTextContent('Leche')
  })

  it('should reset form after adding item', async () => {
    const user = userEvent.setup()
    render(<AddItemForm {...defaultProps} />)
    
    await user.type(screen.getByPlaceholderText('Enter item name'), 'Test Item')
    await user.type(screen.getByPlaceholderText('Add a note or comment...'), 'Test comment')
    await user.click(screen.getByText('Add Item'))
    
    // Form should reset after submission (not editing)
    expect(screen.getByPlaceholderText('Enter item name')).toHaveValue('')
    expect(screen.getByPlaceholderText('Add a note or comment...')).toHaveValue('')
    expect(screen.getByDisplayValue('1')).toHaveValue(1)
  })

  it('should handle custom aisles correctly', () => {
    const customAisles = ['Custom Aisle 1', 'Custom Aisle 2']
    render(<AddItemForm {...defaultProps} customAisles={customAisles} />)
    
    const aisleSelect = screen.getByRole('combobox')
    expect(screen.getByText('Custom Aisle 1')).toBeInTheDocument()
    expect(screen.getByText('Custom Aisle 2')).toBeInTheDocument()
  })

  it('should have different styling when editing', () => {
    const { rerender } = render(<AddItemForm {...defaultProps} />)
    
    // Check add mode styling
    let form = screen.getByText('Add New Item').closest('form')
    expect(form).toHaveClass('bg-white')
    
    // Check edit mode styling
    rerender(<AddItemForm {...defaultProps} editingItem={mockEditingItem} />)
    form = screen.getByText('Edit Item').closest('form')
    expect(form).toHaveClass('bg-blue-50')
  })
})
