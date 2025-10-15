import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShoppingItem from '../../components/ShoppingItem'
import { useTranslations } from '../../contexts/LanguageContext'

// Mock contexts and components
jest.mock('../../contexts/LanguageContext')
jest.mock('../../components/AisleName', () => {
  return function MockAisleName({ aisle }) {
    return <span data-testid="aisle-name">{aisle}</span>
  }
})

const mockTranslations = {
  'common.edit': 'Edit',
  'common.delete': 'Delete'
}

describe('ShoppingItem', () => {
  const mockUseTranslations = useTranslations
  const mockOnToggleComplete = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnEdit = jest.fn()

  const defaultItem = {
    id: '1',
    name: 'Apples',
    aisle: 'Produce',
    quantity: 3,
    completed: false,
    comment: 'Red apples'
  }

  const defaultProps = {
    item: defaultItem,
    onToggleComplete: mockOnToggleComplete,
    onDelete: mockOnDelete,
    onEdit: mockOnEdit
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseTranslations.mockReturnValue((key) => mockTranslations[key] || key)
  })

  it('should render item information correctly', () => {
    render(<ShoppingItem {...defaultProps} />)
    
    expect(screen.getByText('Apples')).toBeInTheDocument()
    expect(screen.getByText('(3)')).toBeInTheDocument()
    expect(screen.getByText('Red apples')).toBeInTheDocument()
    expect(screen.getByTestId('aisle-name')).toHaveTextContent('Produce')
  })

  it('should show item as completed when completed is true', () => {
    const completedItem = { ...defaultItem, completed: true }
    render(<ShoppingItem {...defaultProps} item={completedItem} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
    
    const itemName = screen.getByText('Apples')
    expect(itemName.parentElement).toHaveClass('line-through')
  })

  it('should show item as incomplete when completed is false', () => {
    render(<ShoppingItem {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
    
    const itemName = screen.getByText('Apples')
    expect(itemName.parentElement).not.toHaveClass('line-through')
  })

  it('should not show quantity when quantity is 1', () => {
    const singleItem = { ...defaultItem, quantity: 1 }
    render(<ShoppingItem {...defaultProps} item={singleItem} />)
    
    expect(screen.queryByText('(1)')).not.toBeInTheDocument()
  })

  it('should not show comment when comment is empty', () => {
    const itemWithoutComment = { ...defaultItem, comment: '' }
    render(<ShoppingItem {...defaultProps} item={itemWithoutComment} />)
    
    expect(screen.queryByText('Red apples')).not.toBeInTheDocument()
  })

  it('should call onToggleComplete when checkbox is clicked', async () => {
    const user = userEvent.setup()
    render(<ShoppingItem {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    
    expect(mockOnToggleComplete).toHaveBeenCalledWith('1')
  })

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<ShoppingItem {...defaultProps} />)
    
    const editButton = screen.getByText('Edit')
    await user.click(editButton)
    
    expect(mockOnEdit).toHaveBeenCalledWith(defaultItem)
  })

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<ShoppingItem {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)
    
    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })

  it('should handle item without comment gracefully', () => {
    const itemWithoutComment = { ...defaultItem, comment: null }
    render(<ShoppingItem {...defaultProps} item={itemWithoutComment} />)
    
    expect(screen.getByText('Apples')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument() // SVG icon
  })

  it('should apply correct styling based on completion status', () => {
    const { rerender } = render(<ShoppingItem {...defaultProps} />)
    
    // Check incomplete styling
    let container = screen.getByText('Apples').closest('div.p-3')
    expect(container).toHaveClass('bg-white')
    
    // Check completed styling
    const completedItem = { ...defaultItem, completed: true }
    rerender(<ShoppingItem {...defaultProps} item={completedItem} />)
    
    container = screen.getByText('Apples').closest('div.p-3')
    expect(container).toHaveClass('opacity-75')
  })
})
