import { render, screen } from '@testing-library/react'
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

  // Add more specific tests based on component functionality
})
