import { render, screen } from '@testing-library/react'
import AisleName from '../../components/AisleName.js'

// Mock translation function
const mockTranslations = jest.fn((key) => key);

jest.mock('../../contexts/LanguageContext', () => ({
  useTranslations: jest.fn(() => mockTranslations),
}));

describe('AisleName', () => {
  const defaultProps = {
    aisle: 'Produce'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockTranslations.mockImplementation((key) => key)
  })

  it('should render without crashing', () => {
    render(<AisleName {...defaultProps} />)
    
    expect(screen.getByText('aisles.produce')).toBeInTheDocument()
  })

  it('should translate known aisles', () => {
    mockTranslations.mockImplementation((key) => {
      const translations = {
        'aisles.produce': 'Productos',
        'aisles.dairy': 'Lácteos',
        'aisles.other': 'Otros'
      }
      return translations[key] || key
    })

    const { rerender } = render(<AisleName aisle="Produce" />)
    expect(screen.getByText('Productos')).toBeInTheDocument()
    
    rerender(<AisleName aisle="Dairy" />)
    expect(screen.getByText('Lácteos')).toBeInTheDocument()
    
    rerender(<AisleName aisle="Other" />)
    expect(screen.getByText('Otros')).toBeInTheDocument()
  })

  it('should return aisle name as-is for unknown aisles', () => {
    render(<AisleName aisle="Custom Aisle" />)
    expect(screen.getByText('Custom Aisle')).toBeInTheDocument()
  })

  it('should handle all predefined aisle mappings', () => {
    const predefinedAisles = [
      'Produce', 'Dairy', 'Meat & Seafood', 'Bakery', 'Pantry', 
      'Frozen', 'Personal Care', 'Household', 'Other'
    ]
    
    predefinedAisles.forEach(aisle => {
      const { rerender } = render(<AisleName aisle={aisle} />)
      expect(mockTranslations).toHaveBeenCalled()
      rerender(<div />) // Clear for next iteration
    })
  })

  // Add more specific tests based on component functionality
})
