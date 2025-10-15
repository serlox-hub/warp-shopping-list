import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle from '../../components/ThemeToggle.js'

// Mock Theme Context
const mockTheme = {
  theme: 'light',
  resolvedTheme: 'light',
  setThemePreference: jest.fn(),
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => mockTheme),
}));

// Mock translations
const mockTranslations = jest.fn((key) => key);
jest.mock('../../contexts/LanguageContext', () => ({
  useTranslations: jest.fn(() => mockTranslations),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTranslations.mockImplementation((key) => key)
    mockTheme.theme = 'light'
    mockTheme.resolvedTheme = 'light'
    mockTheme.setThemePreference.mockClear()
  })

  it('should render without crashing', () => {
    render(<ThemeToggle />)
    
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should open dropdown when clicked', async () => {
    const user = userEvent.setup()
    mockTheme.theme = 'light'
    
    render(<ThemeToggle />)
    
    const toggleButton = screen.getByRole('button')
    await user.click(toggleButton)
    
    // Should show theme options
    expect(screen.getByText('header.lightMode')).toBeInTheDocument()
    expect(screen.getByText('header.darkMode')).toBeInTheDocument() 
    expect(screen.getByText('header.systemMode')).toBeInTheDocument()
  })

  it('should switch to dark theme when selected', async () => {
    const user = userEvent.setup()
    mockTheme.theme = 'light'
    
    render(<ThemeToggle />)
    
    // Open dropdown
    const toggleButton = screen.getByRole('button')
    await user.click(toggleButton)
    
    // Click dark theme option
    const darkOption = screen.getByText('header.darkMode')
    await user.click(darkOption)
    
    expect(mockTheme.setThemePreference).toHaveBeenCalledWith('dark')
  })

  it('should switch to light theme when selected', async () => {
    const user = userEvent.setup()
    mockTheme.theme = 'dark'
    
    render(<ThemeToggle />)
    
    // Open dropdown
    const toggleButton = screen.getByRole('button')
    await user.click(toggleButton)
    
    // Click light theme option
    const lightOption = screen.getByText('header.lightMode')
    await user.click(lightOption)
    
    expect(mockTheme.setThemePreference).toHaveBeenCalledWith('light')
  })

  it('should show correct title for light theme', () => {
    mockTheme.theme = 'light'
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'header.currentTheme: header.lightMode')
  })

  it('should show correct title for dark theme', () => {
    mockTheme.theme = 'dark'
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'header.currentTheme: header.darkMode')
  })

  it('should show correct title for system theme', () => {
    mockTheme.theme = 'system'
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'header.currentTheme: header.systemMode')
  })

  it('should have proper accessibility attributes', () => {
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title')
    expect(button).toHaveAttribute('aria-label')
    expect(button).toHaveClass('hover:bg-gray-300')
  })

  it('should render correct icon for each theme', () => {
    // Test light theme icon
    mockTheme.theme = 'light'
    const { rerender } = render(<ThemeToggle />)
    let svg = screen.getByRole('button').querySelector('svg')
    expect(svg).toBeInTheDocument()
    
    // Test dark theme icon  
    mockTheme.theme = 'dark'
    rerender(<ThemeToggle />)
    svg = screen.getByRole('button').querySelector('svg')
    expect(svg).toBeInTheDocument()
    
    // Test system theme icon
    mockTheme.theme = 'system'
    rerender(<ThemeToggle />)
    svg = screen.getByRole('button').querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
