'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserPreferencesService } from '@/lib/userPreferencesService';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState('system');
  const [resolvedTheme, setResolvedTheme] = useState('light');

  // Load theme from Supabase when user is authenticated
  useEffect(() => {
    if (user) {
      loadUserTheme();
    } else {
      // For non-authenticated users, use localStorage or system preference
      const savedTheme = localStorage.getItem('theme') || 'system';
      setTheme(savedTheme);
    }
  }, [user]);

  const loadUserTheme = async () => {
    try {
      // Try to migrate localStorage theme first
      const localTheme = localStorage.getItem('theme');
      if (localTheme && ['light', 'dark', 'system'].includes(localTheme)) {
        const migrated = await UserPreferencesService.migrateLocalStoragePreferences(user.id, {
          theme: localTheme
        });
        if (migrated) {
          console.log('Migrated theme preference to database');
        }
      }
      
      const preferences = await UserPreferencesService.getUserPreferences(user.id);
      setTheme(preferences.theme || 'system');
    } catch (error) {
      console.error('Error loading user theme:', error);
      // Fallback to localStorage or system preference
      const savedTheme = localStorage.getItem('theme') || 'system';
      setTheme(savedTheme);
    }
  };

  // Resolve theme (convert 'system' to actual theme)
  useEffect(() => {
    let actualTheme = theme;
    
    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      actualTheme = systemPrefersDark ? 'dark' : 'light';
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        if (theme === 'system') {
          setResolvedTheme(e.matches ? 'dark' : 'light');
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    setResolvedTheme(actualTheme);
  }, [theme]);

  // Apply resolved theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Always save to localStorage as fallback
    localStorage.setItem('theme', theme);
  }, [resolvedTheme, theme]);

  const toggleTheme = async () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Save to Supabase if user is authenticated
    if (user) {
      try {
        await UserPreferencesService.updateTheme(user.id, newTheme);
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }
  };

  const setThemePreference = async (newTheme) => {
    setTheme(newTheme);
    
    // Save to Supabase if user is authenticated
    if (user) {
      try {
        await UserPreferencesService.updateTheme(user.id, newTheme);
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }
  };

  const value = {
    theme,
    resolvedTheme,
    toggleTheme,
    setThemePreference,
    isDark: resolvedTheme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};