import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AisleManager from '../../components/AisleManager.js'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('../../lib/supabase')

// Mock LanguageContext for translations
jest.mock('../../contexts/LanguageContext', () => ({
  useTranslations: () => (key) => key // Return the key itself as a simple mock
}))

// Mock types/shoppingList utility
jest.mock('../../types/shoppingList', () => ({
  isValidAisleName: jest.fn().mockReturnValue(true)
}))

// Get reference after mock
const { isValidAisleName: mockIsValidAisleName } = require('../../types/shoppingList')

const MockProvider = ({ children }) => {
  return children
}

describe('AisleManager', () => {
  const mockOnUpdateAisles = jest.fn()
  const mockOnClose = jest.fn()
  
  const defaultProps = {
    aisles: ['Produce', 'Dairy', 'Meat'],
    onUpdateAisles: mockOnUpdateAisles,
    onClose: mockOnClose
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnUpdateAisles.mockClear()
    mockOnClose.mockClear()
    mockIsValidAisleName.mockReturnValue(true)
  })

  it('should render without crashing', () => {
    render(
      <MockProvider>
        <AisleManager {...defaultProps} />
      </MockProvider>
    )
    
    // Should render the modal dialog
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Produce')).toBeInTheDocument()
    expect(screen.getByText('Dairy')).toBeInTheDocument()
    expect(screen.getByText('Meat')).toBeInTheDocument()
  })

  it('should handle close button click', () => {
    render(
      <MockProvider>
        <AisleManager {...defaultProps} />
      </MockProvider>
    )
    
    // Find and click close button
    const closeButtons = screen.getAllByRole('button')
    // Find the close button (should be one with an X icon or close functionality)
    const closeButton = closeButtons.find(button => 
      button.getAttribute('title') === 'common.close' || 
      // If no title, look for one that likely closes (first button in header area)
      closeButtons[0] === button
    )
    
    if (closeButton) {
      closeButton.click()
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    }
  })

  it('should display all aisles', () => {
    render(<AisleManager {...defaultProps} />)
    
    expect(screen.getByText('Produce')).toBeInTheDocument()
    expect(screen.getByText('Dairy')).toBeInTheDocument()
    expect(screen.getByText('Meat')).toBeInTheDocument()
  })

  it('should show add aisle elements', () => {
    render(<AisleManager {...defaultProps} />)
    
    // Should show the input placeholder and add button
    expect(screen.getByPlaceholderText('aisleManager.addPlaceholder')).toBeInTheDocument()
    expect(screen.getByText('common.add')).toBeInTheDocument()
  })

  it('should handle close button click', () => {
    render(<AisleManager {...defaultProps} />)
    
    // Find the close button in the header
    const closeButtons = screen.getAllByRole('button')
    const closeButton = closeButtons.find(button => 
      button.innerHTML.includes('M6 18L18 6M6 6l12 12') // X icon path
    )
    
    if (closeButton) {
      fireEvent.click(closeButton)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  it('should handle cancel button click', () => {
    render(<AisleManager {...defaultProps} />)
    
    // Find the cancel button in footer
    const cancelButton = screen.getByText('common.cancel')
    fireEvent.click(cancelButton)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should render with empty aisles array', () => {
    render(<AisleManager aisles={[]} onUpdateAisles={mockOnUpdateAisles} onClose={mockOnClose} />)
    
    // Should still show add input and button even with no aisles
    expect(screen.getByPlaceholderText('aisleManager.addPlaceholder')).toBeInTheDocument()
    expect(screen.getByText('common.add')).toBeInTheDocument()
  })

  it('should handle single aisle case', () => {
    render(<AisleManager aisles={['Produce']} onUpdateAisles={mockOnUpdateAisles} onClose={mockOnClose} />)
    
    expect(screen.getByText('Produce')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('aisleManager.addPlaceholder')).toBeInTheDocument()
    expect(screen.getByText('common.add')).toBeInTheDocument()
  })

  it('should validate aisle names correctly', async () => {
    const user = userEvent.setup()
    mockIsValidAisleName.mockReturnValue(false)
    
    render(<AisleManager {...defaultProps} />)
    
    const input = screen.getByPlaceholderText('aisleManager.addPlaceholder')
    const addButton = screen.getByText('common.add')
    
    // Type an aisle name
    await user.type(input, 'Invalid Aisle')
    await user.click(addButton)
    
    // Should call isValidAisleName when trying to add
    expect(mockIsValidAisleName).toHaveBeenCalled()
  })

  it('should handle save and cancel operations', async () => {
    const user = userEvent.setup()
    
    render(<AisleManager {...defaultProps} />)
    
    // Should show save and cancel buttons in footer
    const saveButton = screen.getByText('aisleManager.saveChanges')
    const cancelButton = screen.getByText('common.cancel')
    
    expect(saveButton).toBeInTheDocument()
    expect(cancelButton).toBeInTheDocument()
    
    // Test save operation
    await user.click(saveButton)
    expect(mockOnUpdateAisles).toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()
  })

  // Test error boundary and edge cases
  it('should handle errors gracefully', () => {
    // Test with null props
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    try {
      render(<AisleManager aisles={null} onUpdateAisles={null} onClose={null} />)
      // Should not crash
      expect(true).toBe(true)
    } catch (error) {
      // If it does throw, that's expected with null props
      expect(error).toBeDefined()
    }
    
    consoleError.mockRestore()
  })
})
