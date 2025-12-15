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
    
    expect(screen.getByAltText('User avatar')).toBeInTheDocument()
    expect(screen.getByLabelText('header.menu.open')).toBeInTheDocument()
  })

  it('should show email when full name is not available', () => {
    mockAuth.user = {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: {}
    }
    
    render(<Header />)

    expect(screen.getByText('T')).toBeInTheDocument()
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
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('should handle preferences button click', async () => {
    const user = userEvent.setup()
    mockAuth.user = { id: 'user-1', email: 'test@example.com' }
    
    render(<Header />)
    
    const menuButton = screen.getByLabelText('header.menu.open')
    await user.click(menuButton)
    const preferencesButton = screen.getByText('header.menu.preferences')
    await user.click(preferencesButton)
    
    expect(mockRouter.push).toHaveBeenCalledWith('/preferences')
  })

  it('should handle sign out button click', async () => {
    const user = userEvent.setup()
    mockAuth.user = { id: 'user-1', email: 'test@example.com' }
    
    render(<Header />)
    
    const menuButton = screen.getByLabelText('header.menu.open')
    await user.click(menuButton)
    const signOutButton = screen.getByText('header.menu.logout')
    await user.click(signOutButton)
    
    expect(mockAuth.signOut).toHaveBeenCalled()
  })

  it('should handle sign out error gracefully', async () => {
    const user = userEvent.setup()
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockAuth.user = { id: 'user-1', email: 'test@example.com' }
    mockAuth.signOut.mockRejectedValue(new Error('Sign out failed'))
    
    render(<Header />)
    
    const menuButton = screen.getByLabelText('header.menu.open')
    await user.click(menuButton)
    const signOutButton = screen.getByText('header.menu.logout')
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

  describe('Menu Actions', () => {
    it('should call onShareList when share list button is clicked', async () => {
      const user = userEvent.setup()
      const onShareList = jest.fn()
      mockAuth.user = { id: 'user-1', email: 'test@example.com' }

      render(<Header onShareList={onShareList} />)

      const menuButton = screen.getByLabelText('header.menu.open')
      await user.click(menuButton)
      const shareButton = screen.getByText('share.shareList')
      await user.click(shareButton)

      expect(onShareList).toHaveBeenCalled()
    })

    it('should call onViewMembers when view members button is clicked and list is shared', async () => {
      const user = userEvent.setup()
      const onViewMembers = jest.fn()
      mockAuth.user = { id: 'user-1', email: 'test@example.com' }

      render(<Header onViewMembers={onViewMembers} isListShared={true} />)

      const menuButton = screen.getByLabelText('header.menu.open')
      await user.click(menuButton)
      const viewMembersButton = screen.getByText('share.viewMembers')
      await user.click(viewMembersButton)

      expect(onViewMembers).toHaveBeenCalled()
    })

    it('should not show view members button when list is not shared', async () => {
      const user = userEvent.setup()
      const onViewMembers = jest.fn()
      mockAuth.user = { id: 'user-1', email: 'test@example.com' }

      render(<Header onViewMembers={onViewMembers} isListShared={false} />)

      const menuButton = screen.getByLabelText('header.menu.open')
      await user.click(menuButton)

      expect(screen.queryByText('share.viewMembers')).not.toBeInTheDocument()
    })

    it('should call onManageAisles when manage aisles button is clicked', async () => {
      const user = userEvent.setup()
      const onManageAisles = jest.fn()
      mockAuth.user = { id: 'user-1', email: 'test@example.com' }

      render(<Header onManageAisles={onManageAisles} />)

      const menuButton = screen.getByLabelText('header.menu.open')
      await user.click(menuButton)
      const manageAislesButton = screen.getByText('shoppingList.manageAisles')
      await user.click(manageAislesButton)

      expect(onManageAisles).toHaveBeenCalled()
    })

    it('should call onOpenHistory when history button is clicked and canOpenHistory is true', async () => {
      const user = userEvent.setup()
      const onOpenHistory = jest.fn()
      mockAuth.user = { id: 'user-1', email: 'test@example.com' }

      render(<Header onOpenHistory={onOpenHistory} canOpenHistory={true} />)

      const menuButton = screen.getByLabelText('header.menu.open')
      await user.click(menuButton)
      const historyButton = screen.getByText('topItems.openButton')
      await user.click(historyButton)

      expect(onOpenHistory).toHaveBeenCalled()
    })

    it('should disable history button when canOpenHistory is false', async () => {
      const user = userEvent.setup()
      const onOpenHistory = jest.fn()
      mockAuth.user = { id: 'user-1', email: 'test@example.com' }

      render(<Header onOpenHistory={onOpenHistory} canOpenHistory={false} />)

      const menuButton = screen.getByLabelText('header.menu.open')
      await user.click(menuButton)
      const historyButton = screen.getByText('topItems.openButton')

      expect(historyButton.closest('button')).toBeDisabled()
    })

    it('should call onClearCompleted when clear completed button is clicked', async () => {
      const user = userEvent.setup()
      const onClearCompleted = jest.fn()
      mockAuth.user = { id: 'user-1', email: 'test@example.com' }

      render(<Header onClearCompleted={onClearCompleted} completedCount={5} totalCount={10} />)

      const menuButton = screen.getByLabelText('header.menu.open')
      await user.click(menuButton)
      const clearCompletedButton = screen.getByText('shoppingList.clearCompleted')
      await user.click(clearCompletedButton)

      expect(onClearCompleted).toHaveBeenCalled()
    })

    it('should disable clear completed button when completedCount is 0', async () => {
      const user = userEvent.setup()
      const onClearCompleted = jest.fn()
      mockAuth.user = { id: 'user-1', email: 'test@example.com' }

      render(<Header onClearCompleted={onClearCompleted} completedCount={0} totalCount={10} />)

      const menuButton = screen.getByLabelText('header.menu.open')
      await user.click(menuButton)
      const clearCompletedButton = screen.getByText('shoppingList.clearCompleted')

      expect(clearCompletedButton.closest('button')).toBeDisabled()
    })

    it('should call onClearAll when clear all button is clicked', async () => {
      const user = userEvent.setup()
      const onClearAll = jest.fn()
      mockAuth.user = { id: 'user-1', email: 'test@example.com' }

      render(<Header onClearAll={onClearAll} totalCount={10} />)

      const menuButton = screen.getByLabelText('header.menu.open')
      await user.click(menuButton)
      const clearAllButton = screen.getByText('shoppingList.clearAll')
      await user.click(clearAllButton)

      expect(onClearAll).toHaveBeenCalled()
    })

    it('should disable clear all button when totalCount is 0', async () => {
      const user = userEvent.setup()
      const onClearAll = jest.fn()
      mockAuth.user = { id: 'user-1', email: 'test@example.com' }

      render(<Header onClearAll={onClearAll} totalCount={0} />)

      const menuButton = screen.getByLabelText('header.menu.open')
      await user.click(menuButton)
      const clearAllButton = screen.getByText('shoppingList.clearAll')

      expect(clearAllButton.closest('button')).toBeDisabled()
    })

    it('should not show menu action buttons when props are not provided', async () => {
      const user = userEvent.setup()
      mockAuth.user = { id: 'user-1', email: 'test@example.com' }

      render(<Header />)

      const menuButton = screen.getByLabelText('header.menu.open')
      await user.click(menuButton)

      expect(screen.queryByText('share.shareList')).not.toBeInTheDocument()
      expect(screen.queryByText('shoppingList.manageAisles')).not.toBeInTheDocument()
      expect(screen.queryByText('topItems.openButton')).not.toBeInTheDocument()
      expect(screen.queryByText('shoppingList.clearCompleted')).not.toBeInTheDocument()
      expect(screen.queryByText('shoppingList.clearAll')).not.toBeInTheDocument()
      // But preferences and logout should still be visible
      expect(screen.getByText('header.menu.preferences')).toBeInTheDocument()
      expect(screen.getByText('header.menu.logout')).toBeInTheDocument()
    })
  })
})
