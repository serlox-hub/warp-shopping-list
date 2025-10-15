import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AisleSection from '../../components/AisleSection'
import { useTranslations } from '../../contexts/LanguageContext'
import { sortItemsInAisle } from '../../types/shoppingList'

// Mock dependencies
jest.mock('../../contexts/LanguageContext')
jest.mock('../../types/shoppingList')
jest.mock('../../components/AisleName', () => {
  return function MockAisleName({ aisle }) {
    return <span data-testid="aisle-name">{aisle}</span>
  }
})
jest.mock('../../components/ShoppingItem', () => {
  return function MockShoppingItem({ item, onToggleComplete, onDelete, onEdit }) {
    return (
      <div data-testid={`shopping-item-${item.id}`}>
        <span>{item.name}</span>
        <span>{item.completed ? 'completed' : 'pending'}</span>
        <button onClick={() => onToggleComplete(item.id)}>Toggle</button>
        <button onClick={() => onDelete(item.id)}>Delete</button>
        <button onClick={() => onEdit(item)}>Edit</button>
      </div>
    )
  }
})

const mockTranslations = {
  'shoppingList.aisleProgress': '{{completed}}/{{total}} completed'
}

describe('AisleSection', () => {
  const mockUseTranslations = useTranslations
  const mockSortItemsInAisle = sortItemsInAisle
  const mockOnToggleComplete = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnEdit = jest.fn()

  const mockItems = [
    {
      id: '1',
      name: 'Apples',
      aisle: 'Produce',
      quantity: 3,
      completed: false
    },
    {
      id: '2',
      name: 'Bananas',
      aisle: 'Produce',
      quantity: 2,
      completed: true
    }
  ]

  const defaultProps = {
    aisle: 'Produce',
    items: mockItems,
    onToggleComplete: mockOnToggleComplete,
    onDelete: mockOnDelete,
    onEdit: mockOnEdit
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseTranslations.mockReturnValue((key, params = {}) => {
      let translation = mockTranslations[key] || key
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{{${param}}}`, value.toString())
      })
      return translation
    })
    mockSortItemsInAisle.mockImplementation((items) => items)
  })

  it('should render aisle name and items correctly', () => {
    render(<AisleSection {...defaultProps} />)
    
    expect(screen.getByTestId('aisle-name')).toHaveTextContent('Produce')
    expect(screen.getByTestId('shopping-item-1')).toBeInTheDocument()
    expect(screen.getByTestId('shopping-item-2')).toBeInTheDocument()
  })

  it('should display correct progress information', () => {
    render(<AisleSection {...defaultProps} />)
    
    expect(screen.getByText('1/2 completed')).toBeInTheDocument()
  })

  it('should display progress for all incomplete items', () => {
    const incompleteItems = mockItems.map(item => ({ ...item, completed: false }))
    render(<AisleSection {...defaultProps} items={incompleteItems} />)
    
    expect(screen.getByText('0/2 completed')).toBeInTheDocument()
  })

  it('should display progress for all completed items', () => {
    const completedItems = mockItems.map(item => ({ ...item, completed: true }))
    render(<AisleSection {...defaultProps} items={completedItems} />)
    
    expect(screen.getByText('2/2 completed')).toBeInTheDocument()
  })

  it('should handle empty items array', () => {
    render(<AisleSection {...defaultProps} items={[]} />)
    
    expect(screen.getByTestId('aisle-name')).toHaveTextContent('Produce')
    expect(screen.getByText('0/0 completed')).toBeInTheDocument()
    expect(screen.queryByTestId('shopping-item-1')).not.toBeInTheDocument()
  })

  it('should call sortItemsInAisle with items', () => {
    render(<AisleSection {...defaultProps} />)
    
    expect(mockSortItemsInAisle).toHaveBeenCalledWith([...mockItems])
  })

  it('should pass handlers to ShoppingItem components', async () => {
    const user = userEvent.setup()
    render(<AisleSection {...defaultProps} />)
    
    // Test toggle complete
    const toggleButton = screen.getAllByText('Toggle')[0]
    await user.click(toggleButton)
    expect(mockOnToggleComplete).toHaveBeenCalledWith('1')
    
    // Test delete
    const deleteButton = screen.getAllByText('Delete')[0]
    await user.click(deleteButton)
    expect(mockOnDelete).toHaveBeenCalledWith('1')
    
    // Test edit
    const editButton = screen.getAllByText('Edit')[0]
    await user.click(editButton)
    expect(mockOnEdit).toHaveBeenCalledWith(mockItems[0])
  })

  it('should render items in sorted order', () => {
    const sortedItems = [mockItems[1], mockItems[0]] // Reverse order
    mockSortItemsInAisle.mockReturnValue(sortedItems)
    
    render(<AisleSection {...defaultProps} />)
    
    expect(mockSortItemsInAisle).toHaveBeenCalledWith([...mockItems])
    // The mock ShoppingItem components should appear in the order returned by sort function
    const itemElements = screen.getAllByText(/Apples|Bananas/)
    expect(itemElements[0]).toHaveTextContent('Bananas')
    expect(itemElements[1]).toHaveTextContent('Apples')
  })
})
