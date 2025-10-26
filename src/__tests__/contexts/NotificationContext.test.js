import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider, useNotification } from '@/contexts/NotificationContext';

// Test component that uses the notification hook
function TestComponent() {
  const { showError, showSuccess, showInfo, showWarning, addNotification, removeNotification } = useNotification();

  return (
    <div>
      <button onClick={() => showError('Error message')}>Show Error</button>
      <button onClick={() => showSuccess('Success message')}>Show Success</button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
      <button onClick={() => showWarning('Warning message')}>Show Warning</button>
      <button onClick={() => addNotification('Custom message', 'info', 10000)}>Add Custom</button>
      <button onClick={() => {
        const id = showError('Remove me');
        removeNotification(id);
      }}>Add and Remove</button>
    </div>
  );
}

describe('NotificationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('Provider Setup', () => {
    it('should render children', () => {
      render(
        <NotificationProvider>
          <div>Test Child</div>
        </NotificationProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should throw error when useNotification is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useNotification must be used within NotificationProvider');

      consoleSpy.mockRestore();
    });

    it('should render toast container with correct positioning', () => {
      const { container } = render(
        <NotificationProvider>
          <div>Test</div>
        </NotificationProvider>
      );

      const toastContainer = container.querySelector('.fixed.top-4.right-4.z-50');
      expect(toastContainer).toBeInTheDocument();
    });
  });

  describe('showError', () => {
    it('should display error notification', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Error'));

      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-rose-500');
    });

    it('should auto-close error notification after default duration (5000ms)', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Error'));
      expect(screen.getByText('Error message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Error message')).not.toBeInTheDocument();
      });
    });

    it('should return notification id', async () => {
      const user = userEvent.setup({ delay: null });
      let notificationId;

      function TestIdComponent() {
        const { showError } = useNotification();
        return (
          <button onClick={() => {
            notificationId = showError('Test');
          }}>Test</button>
        );
      }

      render(
        <NotificationProvider>
          <TestIdComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Test'));

      expect(notificationId).toBeDefined();
      expect(typeof notificationId).toBe('number');
    });
  });

  describe('showSuccess', () => {
    it('should display success notification', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-emerald-500');
    });

    it('should auto-close success notification after 3000ms', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(2999);
      });
      expect(screen.getByText('Success message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      });
    });
  });

  describe('showInfo', () => {
    it('should display info notification', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Info'));

      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-indigo-500');
    });

    it('should auto-close info notification after 4000ms', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Info'));
      expect(screen.getByText('Info message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Info message')).not.toBeInTheDocument();
      });
    });
  });

  describe('showWarning', () => {
    it('should display warning notification', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Warning'));

      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-amber-500');
    });

    it('should auto-close warning notification after 4000ms', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Warning'));
      expect(screen.getByText('Warning message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Warning message')).not.toBeInTheDocument();
      });
    });
  });

  describe('addNotification', () => {
    it('should add notification with custom duration', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Add Custom'));

      expect(screen.getByText('Custom message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(9999);
      });
      expect(screen.getByText('Custom message')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(screen.queryByText('Custom message')).not.toBeInTheDocument();
      });
    });

    it('should generate unique ids for each notification', async () => {
      const user = userEvent.setup({ delay: null });
      const ids = [];

      function TestMultipleIds() {
        const { addNotification } = useNotification();
        return (
          <button onClick={() => {
            ids.push(addNotification('Test 1'));
            ids.push(addNotification('Test 2'));
            ids.push(addNotification('Test 3'));
          }}>Add Multiple</button>
        );
      }

      render(
        <NotificationProvider>
          <TestMultipleIds />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Add Multiple'));

      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3); // All ids should be unique
    });
  });

  describe('removeNotification', () => {
    it('should remove notification immediately', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Add and Remove'));

      expect(screen.queryByText('Remove me')).not.toBeInTheDocument();
    });

    it('should only remove the specified notification', async () => {
      const user = userEvent.setup({ delay: null });

      function TestRemoveSpecific() {
        const { addNotification, removeNotification } = useNotification();
        return (
          <button onClick={() => {
            const id1 = addNotification('Keep me', 'success', 0);
            const id2 = addNotification('Remove me', 'error', 0);
            removeNotification(id2);
          }}>Test Remove Specific</button>
        );
      }

      render(
        <NotificationProvider>
          <TestRemoveSpecific />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Test Remove Specific'));

      expect(screen.getByText('Keep me')).toBeInTheDocument();
      expect(screen.queryByText('Remove me')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Notifications', () => {
    it('should display multiple notifications at once', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Error'));
      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Info'));

      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('should queue notifications with different types', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Error'));
      await user.click(screen.getByText('Show Warning'));

      // All three notifications should be visible
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();

      // Should have 3 alert elements
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(3);

      // Verify they have correct styling
      expect(alerts[0]).toHaveClass('bg-emerald-500'); // Success
      expect(alerts[1]).toHaveClass('bg-rose-500'); // Error
      expect(alerts[2]).toHaveClass('bg-amber-500'); // Warning
    });

    it('should handle many notifications (stress test)', async () => {
      const user = userEvent.setup({ delay: null });

      function TestManyNotifications() {
        const { addNotification } = useNotification();
        return (
          <button onClick={() => {
            for (let i = 0; i < 10; i++) {
              addNotification(`Notification ${i}`, 'info', 0);
            }
          }}>Add Many</button>
        );
      }

      render(
        <NotificationProvider>
          <TestManyNotifications />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Add Many'));

      for (let i = 0; i < 10; i++) {
        expect(screen.getByText(`Notification ${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('Manual Close', () => {
    it('should close notification when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Error'));
      expect(screen.getByText('Error message')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close notification');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Error message')).not.toBeInTheDocument();
      });
    });

    it('should only close the clicked notification', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Show Error'));
      await user.click(screen.getByText('Show Success'));

      const closeButtons = screen.getAllByLabelText('Close notification');
      expect(closeButtons).toHaveLength(2);

      // Close the first notification
      await user.click(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Error message')).not.toBeInTheDocument();
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });
    });
  });

  describe('Context Methods Stability', () => {
    it('should maintain stable references to context methods', () => {
      const refs = {};

      function TestStability() {
        const context = useNotification();

        if (!refs.context) {
          refs.context = context;
        } else {
          // Check that all methods have the same reference
          refs.sameRef = (
            refs.context.showError === context.showError &&
            refs.context.showSuccess === context.showSuccess &&
            refs.context.showInfo === context.showInfo &&
            refs.context.showWarning === context.showWarning &&
            refs.context.addNotification === context.addNotification &&
            refs.context.removeNotification === context.removeNotification
          );
        }

        return <div>Stability Test</div>;
      }

      const { rerender } = render(
        <NotificationProvider>
          <TestStability />
        </NotificationProvider>
      );

      rerender(
        <NotificationProvider>
          <TestStability />
        </NotificationProvider>
      );

      expect(refs.sameRef).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', async () => {
      const user = userEvent.setup({ delay: null });

      function TestEmptyMessage() {
        const { addNotification } = useNotification();
        return <button onClick={() => addNotification('', 'info')}>Empty</button>;
      }

      render(
        <NotificationProvider>
          <TestEmptyMessage />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Empty'));

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle removing non-existent notification', async () => {
      const user = userEvent.setup({ delay: null });

      function TestRemoveNonExistent() {
        const { removeNotification, addNotification } = useNotification();
        return (
          <>
            <button onClick={() => addNotification('Test', 'info')}>Add</button>
            <button onClick={() => removeNotification(99999)}>Remove Non-existent</button>
          </>
        );
      }

      render(
        <NotificationProvider>
          <TestRemoveNonExistent />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Add'));
      expect(screen.getByText('Test')).toBeInTheDocument();

      await user.click(screen.getByText('Remove Non-existent'));

      // Should not crash, notification should still be there
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle rapid add/remove cycles', async () => {
      const user = userEvent.setup({ delay: null });

      function TestRapidCycles() {
        const { addNotification, removeNotification } = useNotification();
        return (
          <button onClick={() => {
            const id1 = addNotification('Test 1', 'info', 0);
            const id2 = addNotification('Test 2', 'info', 0);
            removeNotification(id1);
            const id3 = addNotification('Test 3', 'info', 0);
            removeNotification(id3);
          }}>Rapid Cycles</button>
        );
      }

      render(
        <NotificationProvider>
          <TestRapidCycles />
        </NotificationProvider>
      );

      await user.click(screen.getByText('Rapid Cycles'));

      expect(screen.queryByText('Test 1')).not.toBeInTheDocument();
      expect(screen.getByText('Test 2')).toBeInTheDocument();
      expect(screen.queryByText('Test 3')).not.toBeInTheDocument();
    });
  });
});
