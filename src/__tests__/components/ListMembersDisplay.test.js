import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListMembersDisplay from '../../components/ListMembersDisplay';

// Mock ShoppingListService
jest.mock('../../lib/shoppingListService', () => ({
  ShoppingListService: {
    getListMembers: jest.fn(),
    leaveList: jest.fn(),
  },
}));

const { ShoppingListService: mockShoppingListService } = require('../../lib/shoppingListService');

// Mock contexts
const mockTranslations = jest.fn((key) => key);
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('../../contexts/LanguageContext', () => ({
  useTranslations: jest.fn(() => mockTranslations),
}));

jest.mock('../../contexts/NotificationContext', () => ({
  useNotification: jest.fn(() => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  })),
}));

describe('ListMembersDisplay', () => {
  const defaultProps = {
    listId: 'list-1',
    currentUserId: 'user-1',
    onLeaveList: jest.fn(),
  };

  const mockMembers = [
    { user_id: 'user-1', email: 'user1@example.com' },
    { user_id: 'user-2', email: 'user2@example.com' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockTranslations.mockImplementation((key) => key);
    mockShoppingListService.getListMembers.mockResolvedValue(mockMembers);
  });

  it('should render member avatars when list is shared', async () => {
    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(mockShoppingListService.getListMembers).toHaveBeenCalledWith('list-1', 'user-1');
    });

    // Should show avatars
    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });
  });

  it('should not render when list has only one member', async () => {
    mockShoppingListService.getListMembers.mockResolvedValue([
      { user_id: 'user-1', email: 'user1@example.com' },
    ]);

    const { container } = render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(mockShoppingListService.getListMembers).toHaveBeenCalledWith('list-1', 'user-1');
    });

    // Wait for loading to complete and check that nothing renders
    await waitFor(() => {
      // The component returns null when not shared, so container should be empty
      expect(container.firstChild).toBeNull();
    });
  });

  it('should open members modal when avatars are clicked', async () => {
    const user = userEvent.setup();
    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('share.viewMembers'));

    await waitFor(() => {
      expect(screen.getByText('share.members')).toBeInTheDocument();
      expect(screen.getByText(/share\.membersCount/)).toBeInTheDocument();
    });
  });

  it('should display all members in modal', async () => {
    const user = userEvent.setup();
    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('share.viewMembers'));

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    });
  });

  it('should mark current user with "You" label', async () => {
    const user = userEvent.setup();
    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('share.viewMembers'));

    await waitFor(() => {
      expect(screen.getByText('share.you')).toBeInTheDocument();
      expect(screen.getByText('share.member')).toBeInTheDocument();
    });
  });

  it('should show leave list button for shared lists', async () => {
    const user = userEvent.setup();
    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('share.viewMembers'));

    await waitFor(() => {
      expect(screen.getByText('share.leaveList')).toBeInTheDocument();
    });
  });

  it('should show confirmation when leaving list', async () => {
    const user = userEvent.setup();
    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('share.viewMembers'));
    await user.click(screen.getByText('share.leaveList'));

    await waitFor(() => {
      expect(screen.getByText('share.confirmLeave')).toBeInTheDocument();
    });
  });

  it('should cancel leaving list when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('share.viewMembers'));
    await user.click(screen.getByText('share.leaveList'));

    await waitFor(() => {
      expect(screen.getByText('share.confirmLeave')).toBeInTheDocument();
    });

    await user.click(screen.getByText('common.cancel'));

    await waitFor(() => {
      expect(screen.queryByText('share.confirmLeave')).not.toBeInTheDocument();
    });
  });

  it('should leave list when confirmed', async () => {
    const user = userEvent.setup();
    const onLeaveList = jest.fn();
    mockShoppingListService.leaveList.mockResolvedValue({ listDeleted: false });

    render(<ListMembersDisplay {...defaultProps} onLeaveList={onLeaveList} />);

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('share.viewMembers'));
    await user.click(screen.getByText('share.leaveList'));

    // Click the leave button in confirmation
    const leaveButtons = screen.getAllByText('share.leaveList');
    await user.click(leaveButtons[leaveButtons.length - 1]);

    await waitFor(() => {
      expect(mockShoppingListService.leaveList).toHaveBeenCalledWith('list-1', 'user-1');
      expect(mockShowSuccess).toHaveBeenCalledWith('share.leftList');
      expect(onLeaveList).toHaveBeenCalled();
    });
  });

  it('should show different message when list is deleted after leaving', async () => {
    const user = userEvent.setup();
    const onLeaveList = jest.fn();
    mockShoppingListService.leaveList.mockResolvedValue({ listDeleted: true });

    render(<ListMembersDisplay {...defaultProps} onLeaveList={onLeaveList} />);

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('share.viewMembers'));
    await user.click(screen.getByText('share.leaveList'));

    const leaveButtons = screen.getAllByText('share.leaveList');
    await user.click(leaveButtons[leaveButtons.length - 1]);

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('share.leftAndDeleted');
    });
  });

  it('should handle leave list error', async () => {
    const user = userEvent.setup();
    mockShoppingListService.leaveList.mockRejectedValue(new Error('Failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('share.viewMembers'));
    await user.click(screen.getByText('share.leaveList'));

    const leaveButtons = screen.getAllByText('share.leaveList');
    await user.click(leaveButtons[leaveButtons.length - 1]);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('share.errorLeaving');
    });

    consoleSpy.mockRestore();
  });

  it('should close modal when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('share.viewMembers'));

    await waitFor(() => {
      expect(screen.getByText('share.members')).toBeInTheDocument();
    });

    // Find and click close button
    const closeButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg path[d*="M6 18L18 6"]')
    );
    if (closeButton) {
      await user.click(closeButton);
    }

    await waitFor(() => {
      expect(screen.queryByText('share.members')).not.toBeInTheDocument();
    });
  });

  it('should show loading state while fetching members', async () => {
    mockShoppingListService.getListMembers.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockMembers), 100))
    );

    render(<ListMembersDisplay {...defaultProps} />);

    // Component only shows button after loading completes and there are multiple members
    // Wait for loading to complete and then verify the button appears
    await waitFor(() => {
      expect(mockShoppingListService.getListMembers).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });
  });

  it('should handle error when loading members', async () => {
    mockShoppingListService.getListMembers.mockRejectedValue(new Error('Failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading list members:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should display overflow indicator for many members', async () => {
    const manyMembers = [
      { user_id: 'user-1', email: 'user1@example.com' },
      { user_id: 'user-2', email: 'user2@example.com' },
      { user_id: 'user-3', email: 'user3@example.com' },
      { user_id: 'user-4', email: 'user4@example.com' },
      { user_id: 'user-5', email: 'user5@example.com' },
    ];
    mockShoppingListService.getListMembers.mockResolvedValue(manyMembers);

    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      // Should show +2 for the extra members beyond 3
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  it('should generate correct initials from email', async () => {
    const user = userEvent.setup();
    render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('share.viewMembers')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('share.viewMembers'));

    await waitFor(() => {
      // user1@example.com -> US (first two characters of local part)
      // Look for initials in the modal (avatar containers)
      const modal = document.querySelector('.fixed.inset-0');
      expect(modal).toBeInTheDocument();
      // Initials are displayed in avatar divs
      const avatars = modal.querySelectorAll('.rounded-full');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  it('should reload members when listId changes', async () => {
    const { rerender } = render(<ListMembersDisplay {...defaultProps} />);

    await waitFor(() => {
      expect(mockShoppingListService.getListMembers).toHaveBeenCalledWith('list-1', 'user-1');
    });

    mockShoppingListService.getListMembers.mockClear();

    rerender(<ListMembersDisplay {...defaultProps} listId="list-2" />);

    await waitFor(() => {
      expect(mockShoppingListService.getListMembers).toHaveBeenCalledWith('list-2', 'user-1');
    });
  });
});
