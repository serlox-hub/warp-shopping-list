'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LanguageContext';
import ThemeToggle from './ThemeToggle';
import { LanguageToggle } from './LanguageSwitcher';

export default function Header() {
  const { user, signOut } = useAuth();
  const t = useTranslations();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {user && (
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt="User avatar"
              className="w-7 h-7 rounded-full"
            />
          )}
          <div className="text-sm min-w-0">
            <p className="text-gray-900 dark:text-gray-100 font-medium truncate max-w-32">
              {user.user_metadata?.full_name || user.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200"
            title={t('auth.logout')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      )}
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}