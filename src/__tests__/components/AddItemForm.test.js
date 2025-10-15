import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddItemForm from '../../components/AddItemForm'
import { useTranslations } from '../../contexts/LanguageContext'
import { DEFAULT_AISLES } from '../../types/shoppingList'

// Mock dependencies
jest.mock('../../contexts/LanguageContext')
jest.mock('../../types/shoppingList', () => ({
  DEFAULT_AISLES: ['Produce', 'Dairy', 'Bakery', 'Other']
}))
jest.mock('../../components/AisleName', () => {
  return function MockAisleName({ aisle }) {
    return <span data-testid="aisle-name">{aisle}</span>
  }
})

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
    customAisles: ['Produce', 'Dairy', 'Bakery', 'Other']
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
