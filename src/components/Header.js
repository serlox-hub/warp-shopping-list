'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LanguageContext';

export default function Header() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const t = useTranslations();
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.user_metadata?.avatar_url]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handlePreferences = () => {
    router.push('/preferences');
  };

  return (
    <div data-testid="header-container">
      {user && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-4 py-3 shadow-sm backdrop-blur">
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
              {user.email?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 pr-3 mr-3 border-r border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[8rem]">
              {user.user_metadata?.full_name?.split(' ')?.[0] || user.email?.split('@')?.[0]}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePreferences}
              className="p-2 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
              title={t('preferences.title')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-500 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
              title={t('auth.logout')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
