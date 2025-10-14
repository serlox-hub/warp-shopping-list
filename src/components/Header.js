'use client';

import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {user && (
        <div className="flex items-center space-x-3">
          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt="User avatar"
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="text-sm">
            <p className="text-gray-900 dark:text-gray-100 font-medium">
              {user.user_metadata?.full_name || user.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Sign Out
          </button>
        </div>
      )}
      <ThemeToggle />
    </div>
  );
}