'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { UserPreferencesService } from '@/lib/userPreferencesService';
import '../lib/i18n'; // Initialize i18n

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);

  // Load user's language preference from database when authenticated
  useEffect(() => {
    if (user) {
      loadUserLanguagePreference();
    } else {
      // For non-authenticated users, use browser detection or localStorage as fallback
      const detectedLang = i18n.language || 'en';
      setCurrentLanguage(detectedLang);
      i18n.changeLanguage(detectedLang);
    }
  }, [user, i18n]);

  // Listen for language changes from i18next
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      setCurrentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const loadUserLanguagePreference = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Try to migrate localStorage language first
      const localLang = localStorage.getItem('i18nextLng');
      if (localLang && (localLang === 'en' || localLang === 'es')) {
        const migrated = await UserPreferencesService.migrateLocalStoragePreferences(user.id, {
          language: localLang
        });
        if (migrated) {
          // Don't remove from localStorage as i18next might still need it for SSR
          console.log('Migrated language preference to database');
        }
      }
      
      // Load language from database
      const preferences = await UserPreferencesService.getUserPreferences(user.id);
      const dbLanguage = preferences.language || 'en';
      
      if (dbLanguage !== currentLanguage) {
        await i18n.changeLanguage(dbLanguage);
        setCurrentLanguage(dbLanguage);
      }
    } catch (error) {
      console.error('Error loading user language preference:', error);
      // Fallback to browser detection
      const fallbackLang = i18n.language || 'en';
      setCurrentLanguage(fallbackLang);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (language) => {
    try {
      setIsLoading(true);
      await i18n.changeLanguage(language);
      setCurrentLanguage(language);
      
      // Save to database if user is authenticated
      if (user && user.id) {
        await UserPreferencesService.updateLanguage(user.id, language);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentLanguage,
    changeLanguage,
    isLoading,
    availableLanguages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' }
    ]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Custom hook for easy translation access
export function useTranslations() {
  const { t } = useTranslation();
  return t;
}