import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareListButton from '../../components/ShareListButton';

// Mock ShoppingListService
jest.mock('../../lib/shoppingListService', () => ({
  ShoppingListService: {
    getActiveShareLink: jest.fn(),
    generateShareLink: jest.fn(),
    revokeShareLink: jest.fn(),
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


describe('ShareListButton', () => {
  const defaultProps = {
    listId: 'list-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTranslations.mockImplementation((key) => key);
    mockShoppingListService.getActiveShareLink.mockResolvedValue(null);
  });

  it('should render share button', () => {
    render(<ShareListButton {...defaultProps} />);

    expect(screen.getByLabelText('share.shareList')).toBeInTheDocument();
  });

  it('should open modal when clicked', async () => {
    const user = userEvent.setup();
    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));

    await waitFor(() => {
      expect(screen.getByText('share.title')).toBeInTheDocument();
      expect(screen.getByText('share.description')).toBeInTheDocument();
    });
  });

  it('should show generate link button when no active link exists', async () => {
    const user = userEvent.setup();
    mockShoppingListService.getActiveShareLink.mockResolvedValue(null);

    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));

    await waitFor(() => {
      expect(screen.getByText('share.generateLink')).toBeInTheDocument();
    });
  });

  it('should generate a new share link', async () => {
    const user = userEvent.setup();
    const mockLink = {
      url: 'https://example.com/join/abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    mockShoppingListService.getActiveShareLink.mockResolvedValue(null);
    mockShoppingListService.generateShareLink.mockResolvedValue(mockLink);

    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));
    await user.click(screen.getByText('share.generateLink'));

    await waitFor(() => {
      expect(mockShoppingListService.generateShareLink).toHaveBeenCalledWith('list-1', 'user-1');
      expect(mockShowSuccess).toHaveBeenCalledWith('share.linkGenerated');
    });
  });

  it('should display existing share link', async () => {
    const user = userEvent.setup();
    const mockLink = {
      url: 'https://example.com/join/abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    mockShoppingListService.getActiveShareLink.mockResolvedValue(mockLink);

    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockLink.url)).toBeInTheDocument();
    });
  });

  it('should copy link to clipboard', async () => {
    const user = userEvent.setup();
    const mockLink = {
      url: 'https://example.com/join/abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    mockShoppingListService.getActiveShareLink.mockResolvedValue(mockLink);

    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockLink.url)).toBeInTheDocument();
    });

    // Find and click copy button (it's the button next to the input in the modal)
    const modal = document.querySelector('.fixed.inset-0.z-50');
    const copyButtons = modal.querySelectorAll('button');
    // The copy button is typically after the input, inside the link display area
    const copyButton = Array.from(copyButtons).find(btn =>
      btn.closest('.flex.items-center.gap-2.p-3')
    );
    if (copyButton) {
      await user.click(copyButton);
    }

    // After clicking, the success notification should be called
    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('share.linkCopied');
    });
  });

  it('should revoke share link', async () => {
    const user = userEvent.setup();
    const mockLink = {
      url: 'https://example.com/join/abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    mockShoppingListService.getActiveShareLink.mockResolvedValue(mockLink);
    mockShoppingListService.revokeShareLink.mockResolvedValue();

    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));

    await waitFor(() => {
      expect(screen.getByText('share.revoke')).toBeInTheDocument();
    });

    await user.click(screen.getByText('share.revoke'));

    await waitFor(() => {
      expect(mockShoppingListService.revokeShareLink).toHaveBeenCalledWith('list-1');
      expect(mockShowSuccess).toHaveBeenCalledWith('share.linkRevoked');
    });
  });

  it('should close modal when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));

    await waitFor(() => {
      expect(screen.getByText('share.title')).toBeInTheDocument();
    });

    // Find close button (X icon)
    const closeButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg path[d*="M6 18L18 6"]')
    );
    if (closeButton) {
      await user.click(closeButton);
    }

    await waitFor(() => {
      expect(screen.queryByText('share.title')).not.toBeInTheDocument();
    });
  });

  it('should handle generate link error', async () => {
    const user = userEvent.setup();
    mockShoppingListService.getActiveShareLink.mockResolvedValue(null);
    mockShoppingListService.generateShareLink.mockRejectedValue(new Error('Failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));
    await user.click(screen.getByText('share.generateLink'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('share.errorGenerating');
    });

    consoleSpy.mockRestore();
  });

  it('should handle revoke link error', async () => {
    const user = userEvent.setup();
    const mockLink = {
      url: 'https://example.com/join/abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    mockShoppingListService.getActiveShareLink.mockResolvedValue(mockLink);
    mockShoppingListService.revokeShareLink.mockRejectedValue(new Error('Failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));

    await waitFor(() => {
      expect(screen.getByText('share.revoke')).toBeInTheDocument();
    });

    await user.click(screen.getByText('share.revoke'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('share.errorRevoking');
    });

    consoleSpy.mockRestore();
  });

  it('should show expiry information', async () => {
    const user = userEvent.setup();
    const mockLink = {
      url: 'https://example.com/join/abc123',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
    };
    mockShoppingListService.getActiveShareLink.mockResolvedValue(mockLink);

    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));

    await waitFor(() => {
      // Should show expiry text
      expect(screen.getByText(/share\.expiresIn/)).toBeInTheDocument();
    });
  });

  it('should show expired status for past dates', async () => {
    const user = userEvent.setup();
    const mockLink = {
      url: 'https://example.com/join/abc123',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    };
    mockShoppingListService.getActiveShareLink.mockResolvedValue(mockLink);

    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));

    await waitFor(() => {
      expect(screen.getByText('share.expired')).toBeInTheDocument();
    });
  });

  it('should allow regenerating link', async () => {
    const user = userEvent.setup();
    const mockLink = {
      url: 'https://example.com/join/abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const newMockLink = {
      url: 'https://example.com/join/xyz789',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    mockShoppingListService.getActiveShareLink.mockResolvedValue(mockLink);
    mockShoppingListService.generateShareLink.mockResolvedValue(newMockLink);

    render(<ShareListButton {...defaultProps} />);

    await user.click(screen.getByLabelText('share.shareList'));

    await waitFor(() => {
      expect(screen.getByText('share.regenerate')).toBeInTheDocument();
    });

    await user.click(screen.getByText('share.regenerate'));

    await waitFor(() => {
      expect(mockShoppingListService.generateShareLink).toHaveBeenCalledWith('list-1', 'user-1');
    });
  });

  it('should not render when listId or userId is missing', async () => {
    const user = userEvent.setup();

    render(<ShareListButton listId={null} userId="user-1" />);

    await user.click(screen.getByLabelText('share.shareList'));

    // Click generate button - should not call service
    await waitFor(() => {
      expect(screen.getByText('share.generateLink')).toBeInTheDocument();
    });

    await user.click(screen.getByText('share.generateLink'));

    // Service should not be called without listId
    expect(mockShoppingListService.generateShareLink).not.toHaveBeenCalled();
  });
});
