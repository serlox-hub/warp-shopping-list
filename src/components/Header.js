'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LanguageContext';

export default function Header({
  onShareList,
  onViewMembers,
  onManageAisles,
  onOpenHistory,
  onClearCompleted,
  onClearAll,
  completedCount = 0,
  totalCount = 0,
  canOpenHistory = false,
  isListShared = false,
}) {
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
                {onShareList && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onShareList();
                    }}
                    role="menuitem"
                    className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span>{t('share.shareList')}</span>
                  </button>
                )}

                {isListShared && onViewMembers && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onViewMembers();
                    }}
                    role="menuitem"
                    className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>{t('share.viewMembers')}</span>
                  </button>
                )}

                {onManageAisles && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onManageAisles();
                    }}
                    role="menuitem"
                    className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span>{t('shoppingList.manageAisles')}</span>
                  </button>
                )}

                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      if (canOpenHistory) onOpenHistory();
                    }}
                    disabled={!canOpenHistory}
                    role="menuitem"
                    className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V5a3 3 0 013-3h2a3 3 0 013 3v2m-1 4h-8m2 4h4m-9-8h14a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9a2 2 0 012-2z" />
                    </svg>
                    <span>{t('topItems.openButton')}</span>
                  </button>
                )}

                {(onShareList || onManageAisles || onOpenHistory) && (
                  <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                )}

                {onClearCompleted && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onClearCompleted();
                    }}
                    disabled={completedCount === 0}
                    role="menuitem"
                    className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('shoppingList.clearCompleted', { count: completedCount })}</span>
                  </button>
                )}

                {onClearAll && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onClearAll();
                    }}
                    disabled={totalCount === 0}
                    role="menuitem"
                    className="w-full px-4 py-3 text-left text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>{t('shoppingList.clearAll')}</span>
                  </button>
                )}

                {(onClearCompleted || onClearAll) && (
                  <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                )}

                <button
                  type="button"
                  onClick={handlePreferences}
                  role="menuitem"
                  className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{t('header.menu.preferences')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  role="menuitem"
                  className="w-full px-4 py-3 text-left text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{t('header.menu.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
