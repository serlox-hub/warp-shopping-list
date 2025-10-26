import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuickAddBar from '../../components/QuickAddBar'
import { useTranslations } from '../../contexts/LanguageContext'

// Mock dependencies
jest.mock('../../contexts/LanguageContext')

const mockTranslations = {
  'addItemForm.itemNamePlaceholder': 'Enter item name',
  'shoppingList.changeAisle': 'Change aisle',
  'shoppingList.currentAisle': 'Current Aisle',
  'topItems.alreadyAdded': 'Already added',
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

describe('QuickAddBar', () => {
  const mockOnAddItem = jest.fn()
  const defaultProps = {
    onAddItem: mockOnAddItem,
    customAisles: ['Produce', 'Dairy', 'Bakery', 'Other'],
    itemUsageHistory: [],
    existingItems: [],
    aisleColors: {
      'Produce': '#22c55e',
      'Dairy': '#f97316',
      'Bakery': '#f59e0b',
      'Other': '#6b7280'
    },
    availableAisles: ['Produce', 'Dairy', 'Bakery', 'Other']
  }

  beforeEach(() => {
    jest.clearAllMocks()
    useTranslations.mockReturnValue((key) => mockTranslations[key] || key)
  })

  it('should render input field and aisle selector', () => {
    render(<QuickAddBar {...defaultProps} />)

    expect(screen.getByPlaceholderText('Enter item name')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument() // Default aisle
  })

  it('should call onAddItem when form is submitted', async () => {
    const user = userEvent.setup()
    render(<QuickAddBar {...defaultProps} />)

    const input = screen.getByPlaceholderText('Enter item name')
    await user.type(input, 'Test Item')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockOnAddItem).toHaveBeenCalledWith({
        name: 'Test Item',
        aisle: 'Other',
        quantity: 1,
        comment: ''
      })
    })
  })

  describe('suggestions', () => {
    it('should show suggestions when typing 3+ characters with matching history', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Milk',
            purchase_count: 10,
            usage_aisle: 'Dairy',
            last_aisle: 'Dairy',
            last_quantity: 1,
            usage_key: 'milk::dairy'
          },
          {
            item_name: 'Apples',
            purchase_count: 8,
            usage_aisle: 'Produce',
            last_aisle: 'Produce',
            last_quantity: 2,
            usage_key: 'apples::produce'
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'mil')

      await waitFor(() => {
        expect(screen.getByTestId('item-suggestions')).toBeInTheDocument()
        const suggestionItems = screen.getAllByTestId('suggestion-item')
        expect(suggestionItems.length).toBeGreaterThan(0)
        // Check that at least one suggestion contains "Milk"
        const milkItem = suggestionItems.find(item => item.textContent.includes('Milk'))
        expect(milkItem).toBeTruthy()
      })
    })

    it('should NOT show suggestions when typing less than 3 characters', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Milk',
            purchase_count: 10,
            usage_aisle: 'Dairy',
            last_aisle: 'Dairy',
            last_quantity: 1,
            usage_key: 'milk::dairy'
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'mi')

      await waitFor(() => {
        expect(screen.queryByTestId('item-suggestions')).not.toBeInTheDocument()
      })
    })

    it('should match exact items correctly', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Milk',
            purchase_count: 10,
            usage_aisle: 'Dairy',
            last_aisle: 'Dairy',
            last_quantity: 1,
            usage_key: 'milk::dairy'
          },
          {
            item_name: 'Milk Chocolate',
            purchase_count: 5,
            usage_aisle: 'Pantry',
            last_aisle: 'Pantry',
            last_quantity: 1,
            usage_key: 'milk chocolate::pantry'
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'milk')

      await waitFor(() => {
        const suggestions = screen.getAllByTestId('suggestion-item')
        // Exact match (Milk) should appear first
        expect(suggestions[0]).toHaveTextContent('Milk')
        expect(suggestions[0]).not.toHaveTextContent('Chocolate')
      })
    })

    it('should handle fuzzy matching', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Bananas',
            purchase_count: 10,
            usage_aisle: 'Produce',
            last_aisle: 'Produce',
            last_quantity: 1,
            usage_key: 'bananas::produce'
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'bna') // Fuzzy match: b-n-a

      await waitFor(() => {
        expect(screen.getByTestId('item-suggestions')).toBeInTheDocument()
        // Text might be split by highlighting
        expect(screen.getByText((content, element) => {
          return element?.textContent === 'Bananas' || content.includes('Bana')
        })).toBeInTheDocument()
      })
    })

    it('should handle diacritics correctly', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Café',
            purchase_count: 10,
            usage_aisle: 'Pantry',
            last_aisle: 'Pantry',
            last_quantity: 1,
            usage_key: 'cafe::pantry'
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'cafe') // Without accent

      await waitFor(() => {
        expect(screen.getByTestId('item-suggestions')).toBeInTheDocument()
        expect(screen.getByText('Café')).toBeInTheDocument()
      })
    })
  })

  describe('existing items detection', () => {
    it('should mark items as already added when aisle is an object', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Milk',
            purchase_count: 10,
            usage_aisle: 'Dairy',
            last_aisle: 'Dairy',
            last_quantity: 1,
            usage_key: 'milk::dairy'
          }
        ],
        existingItems: [
          {
            id: '1',
            name: 'Milk',
            aisle: { id: 'a1', name: 'Dairy', color: '#f97316' },
            quantity: 1,
            completed: false
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'mil')

      await waitFor(() => {
        const suggestionItem = screen.getByTestId('suggestion-item')
        expect(suggestionItem).toHaveAttribute('data-in-list', 'true')
        expect(screen.getByText('Already added')).toBeInTheDocument()
      })
    })

    it('should mark items as already added when aisle is a string', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Bread',
            purchase_count: 8,
            usage_aisle: 'Bakery',
            last_aisle: 'Bakery',
            last_quantity: 1,
            usage_key: 'bread::bakery'
          }
        ],
        existingItems: [
          {
            id: '1',
            name: 'Bread',
            aisle: 'Bakery', // String format
            quantity: 1,
            completed: false
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'bre')

      await waitFor(() => {
        const suggestionItem = screen.getByTestId('suggestion-item')
        expect(suggestionItem).toHaveAttribute('data-in-list', 'true')
        expect(screen.getByText('Already added')).toBeInTheDocument()
      })
    })

    it('should NOT disable items that are not in the list', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Milk',
            purchase_count: 10,
            usage_aisle: 'Dairy',
            last_aisle: 'Dairy',
            last_quantity: 1,
            usage_key: 'milk::dairy'
          }
        ],
        existingItems: [] // Empty list
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'mil')

      await waitFor(() => {
        const suggestionItem = screen.getByTestId('suggestion-item')
        expect(suggestionItem).toHaveAttribute('data-in-list', 'false')
        expect(screen.queryByText('Already added')).not.toBeInTheDocument()
      })
    })

    it('should not allow adding items that are already in the list', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Milk',
            purchase_count: 10,
            usage_aisle: 'Dairy',
            last_aisle: 'Dairy',
            last_quantity: 1,
            usage_key: 'milk::dairy'
          }
        ],
        existingItems: [
          {
            id: '1',
            name: 'Milk',
            aisle: { id: 'a1', name: 'Dairy', color: '#f97316' },
            quantity: 1,
            completed: false
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'mil')

      await waitFor(() => {
        const suggestionItem = screen.getByTestId('suggestion-item')
        expect(suggestionItem).toBeDisabled()
      })

      // Try to click the disabled item
      const suggestionItem = screen.getByTestId('suggestion-item')
      await user.click(suggestionItem)

      // onAddItem should not have been called
      expect(mockOnAddItem).not.toHaveBeenCalled()
    })
  })

  describe('suggestion interaction', () => {
    it('should add item when clicking a suggestion', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Milk',
            purchase_count: 10,
            usage_aisle: 'Dairy',
            last_aisle: 'Dairy',
            last_quantity: 1,
            usage_key: 'milk::dairy'
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'mil')

      await waitFor(() => {
        expect(screen.getByTestId('item-suggestions')).toBeInTheDocument()
      })

      const suggestion = screen.getByTestId('suggestion-item')
      await user.click(suggestion)

      await waitFor(() => {
        expect(mockOnAddItem).toHaveBeenCalledWith({
          name: 'Milk',
          aisle: 'Dairy',
          quantity: 1,
          comment: ''
        })
      })
    })

    it('should clear input after selecting a suggestion', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Apples',
            purchase_count: 8,
            usage_aisle: 'Produce',
            last_aisle: 'Produce',
            last_quantity: 2,
            usage_key: 'apples::produce'
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'app')

      await waitFor(() => {
        expect(screen.getByTestId('item-suggestions')).toBeInTheDocument()
      })

      const suggestion = screen.getByTestId('suggestion-item')
      await user.click(suggestion)

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('should hide suggestions after selecting an item', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Bananas',
            purchase_count: 10,
            usage_aisle: 'Produce',
            last_aisle: 'Produce',
            last_quantity: 1,
            usage_key: 'bananas::produce'
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'ban')

      await waitFor(() => {
        expect(screen.getByTestId('item-suggestions')).toBeInTheDocument()
      })

      const suggestion = screen.getByTestId('suggestion-item')
      await user.click(suggestion)

      await waitFor(() => {
        expect(screen.queryByTestId('item-suggestions')).not.toBeInTheDocument()
      })
    })
  })

  describe('color rendering', () => {
    it('should render aisle badges with correct colors', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Milk',
            purchase_count: 10,
            usage_aisle: 'Dairy',
            last_aisle: 'Dairy',
            last_quantity: 1,
            usage_key: 'milk::dairy'
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'mil')

      await waitFor(() => {
        const aisleBadge = screen.getByText('Dairy')
        expect(aisleBadge).toBeInTheDocument()
        // The badge should have inline styles with backgroundColor
        expect(aisleBadge.closest('span')).toHaveStyle({ backgroundColor: expect.any(String) })
      })
    })

    it('should handle items without aisle colors gracefully', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        aisleColors: {}, // No colors defined
        itemUsageHistory: [
          {
            item_name: 'Unknown Item',
            purchase_count: 5,
            usage_aisle: 'Unknown',
            last_aisle: 'Unknown',
            last_quantity: 1,
            usage_key: 'unknown item::unknown'
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'unk')

      await waitFor(() => {
        expect(screen.getByTestId('item-suggestions')).toBeInTheDocument()
        // Should still render without errors
        const suggestionItems = screen.getAllByTestId('suggestion-item')
        expect(suggestionItems.length).toBeGreaterThan(0)
        const unknownItem = suggestionItems.find(item => item.textContent.includes('Unknown Item'))
        expect(unknownItem).toBeTruthy()
      })
    })
  })

  describe('highlight segments', () => {
    it('should highlight matching characters in suggestions', async () => {
      const user = userEvent.setup()
      const propsWithHistory = {
        ...defaultProps,
        itemUsageHistory: [
          {
            item_name: 'Milk',
            purchase_count: 10,
            usage_aisle: 'Dairy',
            last_aisle: 'Dairy',
            last_quantity: 1,
            usage_key: 'milk::dairy'
          }
        ]
      }

      render(<QuickAddBar {...propsWithHistory} />)

      const input = screen.getByPlaceholderText('Enter item name')
      await user.type(input, 'mil')

      await waitFor(() => {
        const highlightedSegments = screen.getAllByTestId('highlight-segment-match')
        expect(highlightedSegments.length).toBeGreaterThan(0)
      })
    })
  })
})
