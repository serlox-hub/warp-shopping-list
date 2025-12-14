'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LanguageContext';

export default function Header() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const t = useTranslations();
  const [avatarError, setAvatarError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.user_metadata?.avatar_url]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    setMenuOpen(false);
  };

  const handlePreferences = () => {
    router.push('/preferences');
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  return (
    <div data-testid="header-container">
      {user && (
        <div className="relative inline-flex items-center gap-3 z-20 flex-shrink-0">
          <div ref={menuRef} className="relative flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-3 py-2 shadow-sm backdrop-blur z-20">
            <button
              type="button"
              onClick={toggleMenu}
              aria-haspopup="menu"
              aria-label={t('header.menu.open')}
              aria-expanded={menuOpen}
              className="p-2 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {user.user_metadata?.avatar_url && !avatarError ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt="User avatar"
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 flex items-center justify-center text-sm font-semibold">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            {menuOpen && (
              <div
                role="menu"
                aria-label={t('header.menu.open')}
                className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 z-20"
              >
                <button
                  type="button"
                  onClick={handlePreferences}
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors duration-150"
                >
                  {t('header.menu.preferences')}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors duration-150"
                >
                  {t('header.menu.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
