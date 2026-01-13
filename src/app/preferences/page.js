'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslations } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export default function PreferencesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { theme, setThemePreference } = useTheme();
  const { currentLanguage, changeLanguage, availableLanguages, isLoading: languageLoading } = useLanguage();
  const t = useTranslations();
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.user_metadata?.avatar_url]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  // Redirect to home if not authenticated
  if (!user) {
    router.push('/');
    return null;
  }

  const handleThemeChange = (newTheme) => {
    setThemePreference(newTheme);
  };

  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
  };

  const handleGoBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleGoBack}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t('preferences.backToList')}</span>
            </button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {t('preferences.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('preferences.subtitle')}
          </p>
        </div>

        {/* Preferences Content */}
        <div className="space-y-8">
          {/* Theme Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {t('preferences.appearance.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('preferences.appearance.subtitle')}
            </p>
            
            <div className="space-y-3">
              {['light', 'dark', 'system'].map((themeOption) => (
                <label
                  key={themeOption}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                >
                  <input
                    type="radio"
                    name="theme"
                    value={themeOption}
                    checked={theme === themeOption}
                    onChange={() => handleThemeChange(themeOption)}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t(`preferences.theme.${themeOption}`)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t(`preferences.theme.${themeOption}Description`)}
                    </div>
                  </div>
                  {themeOption === 'light' && (
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300 shadow-sm"></div>
                  )}
                  {themeOption === 'dark' && (
                    <div className="w-6 h-6 rounded-full bg-gray-900 border-2 border-gray-600"></div>
                  )}
                  {themeOption === 'system' && (
                    <div className="w-6 h-6 rounded-full bg-gray-500 border-2 border-gray-300 dark:border-gray-600"></div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Language Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {t('preferences.language.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('preferences.language.subtitle')}
            </p>
            
            <div className="space-y-3">
              {availableLanguages.map((language) => (
                <label
                  key={language.code}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                >
                  <input
                    type="radio"
                    name="language"
                    value={language.code}
                    checked={currentLanguage === language.code}
                    onChange={() => handleLanguageChange(language.code)}
                    disabled={languageLoading}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {language.nativeName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {language.name}
                    </div>
                  </div>
                  <div className="w-8 h-6 rounded flex items-center justify-center text-xs font-bold text-white">
                    <div className={`w-full h-full rounded flex items-center justify-center ${
                      language.code === 'en' 
                        ? 'bg-blue-600' 
                        : 'bg-red-600'
                    }`}>
                      {language.code.toUpperCase()}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            {languageLoading && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span className="text-sm">{t('preferences.language.updating')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Account Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {t('preferences.account.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('preferences.account.subtitle')}
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {user.user_metadata?.avatar_url && !avatarError ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="User avatar"
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {user.user_metadata?.full_name?.charAt(0).toUpperCase() ||
                         user.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.user_metadata?.full_name ||
                     user.user_metadata?.name ||
                     user.email?.split('@')?.[0]}
                  </div>
                  {user.email && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Install App Section */}
          <InstallAppSection t={t} />
        </div>
      </div>
    </div>
  );
}

function InstallAppSection({ t }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running as installed PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Check if iOS device
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  if (isStandalone) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {t('preferences.installApp.title')}
        </h2>
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t('preferences.installApp.installed')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
        {t('preferences.installApp.title')}
      </h2>
      <div className="flex items-start space-x-3">
        <svg className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('preferences.installApp.addToHomeScreen')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t('preferences.installApp.description')}
          </p>
          {isIOS ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <p
                  className="text-xs text-gray-500 dark:text-gray-400"
                  dangerouslySetInnerHTML={{ __html: t('preferences.installApp.ios.step1') }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400 w-4 text-center">→</span>
                <p
                  className="text-xs text-gray-500 dark:text-gray-400"
                  dangerouslySetInnerHTML={{ __html: t('preferences.installApp.ios.step2') }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
                <p
                  className="text-xs text-gray-500 dark:text-gray-400"
                  dangerouslySetInnerHTML={{ __html: t('preferences.installApp.android.step1') }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400 w-4 text-center">→</span>
                <p
                  className="text-xs text-gray-500 dark:text-gray-400"
                  dangerouslySetInnerHTML={{ __html: t('preferences.installApp.android.step2') }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
