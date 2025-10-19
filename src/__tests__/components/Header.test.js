import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from '../../components/Header.js'

// Mock next/navigation
const mockRouter = {
  push: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => mockRouter),
}));

// Mock contexts
const mockAuth = {
  user: { id: 'user-1', email: 'test@example.com' },
  signOut: jest.fn(),
};

const mockTranslations = jest.fn((key) => key);

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => mockAuth),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useTranslations: jest.fn(() => mockTranslations),
}));

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTranslations.mockImplementation((key) => key)
    mockAuth.user = { id: 'user-1', email: 'test@example.com' }
    mockAuth.signOut.mockResolvedValue()
  })

  it('should render without crashing', () => {
    render(<Header />)
    
    expect(screen.getByTestId('header-container')).toBeInTheDocument()
  })

  it('should show user information when user is present', () => {
    mockAuth.user = {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
      }
    }
    
    render(<Header />)
    
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByAltText('User avatar')).toBeInTheDocument()
    expect(screen.getByTitle('preferences.title')).toBeInTheDocument()
    expect(screen.getByTitle('auth.logout')).toBeInTheDocument()
  })

  it('should show email when full name is not available', () => {
    mockAuth.user = {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: {}
    }
    
    render(<Header />)

    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('should not show avatar when avatar_url is not available', () => {
    mockAuth.user = {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User'
      }
    }
    
    render(<Header />)
    
    expect(screen.queryByAltText('User avatar')).not.toBeInTheDocument()
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should handle preferences button click', async () => {
    const user = userEvent.setup()
    mockAuth.user = { id: 'user-1', email: 'test@example.com' }
    
    render(<Header />)
    
    const preferencesButton = screen.getByTitle('preferences.title')
    await user.click(preferencesButton)
    
    expect(mockRouter.push).toHaveBeenCalledWith('/preferences')
  })

  it('should handle sign out button click', async () => {
    const user = userEvent.setup()
    mockAuth.user = { id: 'user-1', email: 'test@example.com' }
    
    render(<Header />)
    
    const signOutButton = screen.getByTitle('auth.logout')
    await user.click(signOutButton)
    
    expect(mockAuth.signOut).toHaveBeenCalled()
  })

  it('should handle sign out error gracefully', async () => {
    const user = userEvent.setup()
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockAuth.user = { id: 'user-1', email: 'test@example.com' }
    mockAuth.signOut.mockRejectedValue(new Error('Sign out failed'))
    
    render(<Header />)
    
    const signOutButton = screen.getByTitle('auth.logout')
    await user.click(signOutButton)
    
    expect(mockAuth.signOut).toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('Error signing out:', expect.any(Error))
    
    consoleError.mockRestore()
  })

  it('should render nothing when no user is present', () => {
    mockAuth.user = null
    
    const { container } = render(<Header />)
    
    expect(container.firstChild?.children).toHaveLength(0)
  })

  // Add more specific tests based on component functionality
})
