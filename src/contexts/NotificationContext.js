'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '@/components/Toast';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'error', duration = 5000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showError = useCallback((message) => {
    return addNotification(message, 'error');
  }, [addNotification]);

  const showSuccess = useCallback((message) => {
    return addNotification(message, 'success', 3000);
  }, [addNotification]);

  const showInfo = useCallback((message) => {
    return addNotification(message, 'info', 4000);
  }, [addNotification]);

  const showWarning = useCallback((message) => {
    return addNotification(message, 'warning', 4000);
  }, [addNotification]);

  const value = {
    showError,
    showSuccess,
    showInfo,
    showWarning,
    addNotification,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2">
          {notifications.map(notification => (
            <Toast
              key={notification.id}
              message={notification.message}
              type={notification.type}
              duration={notification.duration}
              onClose={() => removeNotification(notification.id)}
            />
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
