import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from '@/components/Toast';

describe('Toast Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render with message', () => {
      render(<Toast message="Test message" onClose={mockOnClose} />);
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should have role="alert" for accessibility', () => {
      render(<Toast message="Test message" onClose={mockOnClose} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render close button with aria-label', () => {
      render(<Toast message="Test message" onClose={mockOnClose} />);
      expect(screen.getByLabelText('Close notification')).toBeInTheDocument();
    });
  });

  describe('Toast Types', () => {
    it('should render error type with correct styling', () => {
      render(<Toast message="Error message" type="error" onClose={mockOnClose} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-rose-500');
    });

    it('should render success type with correct styling', () => {
      render(<Toast message="Success message" type="success" onClose={mockOnClose} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-emerald-500');
    });

    it('should render info type with correct styling', () => {
      render(<Toast message="Info message" type="info" onClose={mockOnClose} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-indigo-500');
    });

    it('should render warning type with correct styling', () => {
      render(<Toast message="Warning message" type="warning" onClose={mockOnClose} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-amber-500');
    });

    it('should default to error type when no type is provided', () => {
      render(<Toast message="Default message" onClose={mockOnClose} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-rose-500');
    });

    it('should fallback to slate color for unknown type', () => {
      render(<Toast message="Unknown type" type="unknown" onClose={mockOnClose} />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-slate-500');
    });
  });

  describe('Auto-close Behavior', () => {
    it('should auto-close after default duration (5000ms)', () => {
      render(<Toast message="Auto close test" onClose={mockOnClose} />);

      expect(mockOnClose).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should auto-close after custom duration', () => {
      render(<Toast message="Custom duration" onClose={mockOnClose} duration={3000} />);

      jest.advanceTimersByTime(2999);
      expect(mockOnClose).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not auto-close when duration is 0', () => {
      render(<Toast message="No auto close" onClose={mockOnClose} duration={0} />);

      jest.advanceTimersByTime(10000);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not auto-close when duration is negative', () => {
      render(<Toast message="No auto close" onClose={mockOnClose} duration={-1} />);

      jest.advanceTimersByTime(10000);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should clear timeout on unmount', () => {
      const { unmount } = render(<Toast message="Unmount test" onClose={mockOnClose} duration={5000} />);

      unmount();
      jest.advanceTimersByTime(5000);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should reset timer when duration changes', () => {
      const { rerender } = render(
        <Toast message="Duration change" onClose={mockOnClose} duration={5000} />
      );

      jest.advanceTimersByTime(3000);

      rerender(<Toast message="Duration change" onClose={mockOnClose} duration={2000} />);

      jest.advanceTimersByTime(1999);
      expect(mockOnClose).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual Close', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Toast message="Manual close" onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close notification');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Toast message="Keyboard test" onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close notification');
      closeButton.focus();

      expect(closeButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Icons', () => {
    it('should render error icon for error type', () => {
      const { container } = render(<Toast message="Error" type="error" onClose={mockOnClose} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render success icon for success type', () => {
      const { container } = render(<Toast message="Success" type="success" onClose={mockOnClose} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render info icon for info type', () => {
      const { container } = render(<Toast message="Info" type="info" onClose={mockOnClose} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render warning icon for warning type', () => {
      const { container } = render(<Toast message="Warning" type="warning" onClose={mockOnClose} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have proper layout classes', () => {
      render(<Toast message="Layout test" onClose={mockOnClose} />);
      const toast = screen.getByRole('alert');

      expect(toast).toHaveClass('flex', 'items-center', 'gap-3');
      expect(toast).toHaveClass('px-4', 'py-3', 'rounded-lg', 'shadow-lg');
    });

    it('should have minimum and maximum width', () => {
      render(<Toast message="Width test" onClose={mockOnClose} />);
      const toast = screen.getByRole('alert');

      expect(toast).toHaveClass('min-w-[300px]', 'max-w-md');
    });

    it('should have animation class', () => {
      render(<Toast message="Animation test" onClose={mockOnClose} />);
      const toast = screen.getByRole('alert');

      expect(toast).toHaveClass('animate-slide-up');
    });

    it('should have white text', () => {
      render(<Toast message="Text color test" onClose={mockOnClose} />);
      const toast = screen.getByRole('alert');

      expect(toast).toHaveClass('text-white');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      render(<Toast message="" onClose={mockOnClose} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(500);
      render(<Toast message={longMessage} onClose={mockOnClose} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle special characters in message', () => {
      const specialMessage = '<script>alert("test")</script> & "quotes" & \'apostrophes\'';
      render(<Toast message={specialMessage} onClose={mockOnClose} />);
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('should handle onClose being called multiple times', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Toast message="Multiple calls" onClose={mockOnClose} duration={1000} />);

      const closeButton = screen.getByLabelText('Close notification');
      await user.click(closeButton);
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(2);
    });
  });
});
