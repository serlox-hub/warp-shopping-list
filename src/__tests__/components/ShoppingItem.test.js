import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShoppingItem from '../../components/ShoppingItem'
import { useTranslations } from '../../contexts/LanguageContext'

// Mock contexts
jest.mock('../../contexts/LanguageContext')

const mockTranslations = {
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'shoppingList.itemActions': 'Item actions',
  'shoppingList.changeAisle': 'Change aisle',
  'shoppingList.currentAisle': 'Current aisle',
  'aisles.produce': 'Produce',
  'aisles.bakery': 'Bakery',
  'aisles.pantry': 'Pantry'
}

describe('ShoppingItem', () => {
  const mockUseTranslations = useTranslations
  const mockOnToggleComplete = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnEdit = jest.fn()
  const mockOnChangeAisle = jest.fn()

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
    onEdit: mockOnEdit,
    availableAisles: ['Produce', 'Bakery', 'Pantry'],
    onChangeAisle: mockOnChangeAisle,
    aisleColors: {
      Produce: '#22c55e',
      Bakery: '#f59e0b',
      Pantry: '#6366f1'
    }
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
    expect(screen.queryByText('Produce')).not.toBeInTheDocument()
  })

  it('should show item as completed when completed is true', () => {
    const completedItem = { ...defaultItem, completed: true }
    render(<ShoppingItem {...defaultProps} item={completedItem} />)
    
    const itemContainer = screen.getByText('Apples').closest('[role="button"]')
    expect(itemContainer).toHaveAttribute('aria-pressed', 'true')
    
    const itemName = screen.getByText('Apples')
    expect(itemName.parentElement).toHaveClass('line-through')
  })

  it('should show item as incomplete when completed is false', () => {
    render(<ShoppingItem {...defaultProps} />)
    
    const itemContainer = screen.getByText('Apples').closest('[role="button"]')
    expect(itemContainer).toHaveAttribute('aria-pressed', 'false')
    
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

  it('should call onToggleComplete when item container is clicked', async () => {
    const user = userEvent.setup()
    render(<ShoppingItem {...defaultProps} />)
    
    const itemContainer = screen.getByText('Apples').closest('div[role="button"]')
    expect(itemContainer).not.toBeNull()
    await user.click(itemContainer)
    
    expect(mockOnToggleComplete).toHaveBeenCalledWith('1')
  })

  it('should toggle when clicking item content area', async () => {
    const user = userEvent.setup()
    render(<ShoppingItem {...defaultProps} />)

    const itemName = screen.getByText('Apples')
    await user.click(itemName)

    expect(mockOnToggleComplete).toHaveBeenCalledWith('1')
  })

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<ShoppingItem {...defaultProps} />)
    
    const actionsButton = screen.getByLabelText('Item actions')
    await user.click(actionsButton)

    const editButton = screen.getByText('Edit')
    await user.click(editButton)

    expect(mockOnEdit).toHaveBeenCalledWith(defaultItem)
  })

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<ShoppingItem {...defaultProps} />)

    const actionsButton = screen.getByLabelText('Item actions')
    await user.click(actionsButton)

    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)

    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })

  it('should open aisle selector and call onChangeAisle when selecting a different aisle', async () => {
    const user = userEvent.setup()
    render(<ShoppingItem {...defaultProps} />)

    const changeAisleButton = screen.getByLabelText('Change aisle')
    await user.click(changeAisleButton)

    const bakeryOption = screen.getByRole('button', { name: 'Bakery' })
    await user.click(bakeryOption)

    expect(mockOnChangeAisle).toHaveBeenCalledWith('1', 'Bakery')
  })

  it('should not call onChangeAisle when selecting the current aisle', async () => {
    const user = userEvent.setup()
    render(<ShoppingItem {...defaultProps} />)

    const changeAisleButton = screen.getByLabelText('Change aisle')
    await user.click(changeAisleButton)

    const currentOption = screen.getByRole('button', { name: 'Produce' })
    await user.click(currentOption)

    expect(mockOnChangeAisle).not.toHaveBeenCalled()
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
    let container = screen.getByText('Apples').closest('div.px-4')
    expect(container).toHaveClass('bg-white')

    // Check completed styling
    const completedItem = { ...defaultItem, completed: true }
    rerender(<ShoppingItem {...defaultProps} item={completedItem} />)

    container = screen.getByText('Apples').closest('div.px-4')
    expect(container).toHaveClass('opacity-80')
  })
})
