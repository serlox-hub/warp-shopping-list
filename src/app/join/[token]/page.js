'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LanguageContext';
import { ShoppingListService } from '@/lib/shoppingListService';
import LoginForm from '@/components/LoginForm';

export default function JoinListPage({ params }) {
  const { token } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [status, setStatus] = useState('loading'); // loading, invalid, joining, success, error, already_member
  const [listInfo, setListInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!authLoading && user && token) {
      joinList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, token]);

  const joinList = async () => {
    setStatus('joining');
    try {
      const result = await ShoppingListService.joinListViaInvite(token, user.id);
      setListInfo(result);
      setStatus('success');

      // Redirect to home after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error('Error joining list:', error);

      if (error.message?.includes('already a member')) {
        setStatus('already_member');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else if (error.message?.includes('invalid') || error.message?.includes('expired') || error.message?.includes('revoked')) {
        setStatus('invalid');
        setErrorMessage(t('join.invalidToken'));
      } else {
        setStatus('error');
        setErrorMessage(error.message || t('join.genericError'));
      }
    }
  };

  // Show loading while checking auth or before client mount (avoid hydration mismatch)
  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">&nbsp;</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <div className="max-w-md mx-auto pt-12 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 mb-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                {t('join.title')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                {t('join.loginRequired')}
              </p>
            </div>
          </div>
          <LoginForm redirectTo={pathname} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-8">
        {status === 'loading' || status === 'joining' ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('join.joining')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {t('join.pleaseWait')}
            </p>
          </div>
        ) : status === 'success' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('join.success')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {t('join.joinedList', { listName: listInfo?.listName || t('join.theList') })}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">
              {t('join.redirecting')}
            </p>
          </div>
        ) : status === 'already_member' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('join.alreadyMember')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {t('join.alreadyMemberDescription')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">
              {t('join.redirecting')}
            </p>
          </div>
        ) : status === 'invalid' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('join.invalidTitle')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 rounded-lg transition-colors"
            >
              {t('join.goHome')}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('join.errorTitle')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 rounded-lg transition-colors"
            >
              {t('join.goHome')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
