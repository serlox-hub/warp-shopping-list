'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

  const loadUserTheme = useCallback(async () => {
    if (!user?.id) {
      setTheme('system');
      return;
    }

    try {
      const preferences = await UserPreferencesService.getUserPreferences(user.id);
      setTheme(preferences.theme || 'system');
    } catch (error) {
      console.error('Error loading user theme:', error);
      setTheme('system');
    }
  }, [user?.id]);

  // Load theme from Supabase when user is authenticated
  useEffect(() => {
    if (user) {
      loadUserTheme();
    } else {
      setTheme('system');
    }
  }, [user, loadUserTheme]);

  // Resolve theme (convert 'system' to actual theme)
  useEffect(() => {
    // Ensure this only runs on the client side
    if (typeof window === 'undefined') return;
    
    const updateResolvedTheme = () => {
      let actualTheme = theme;
      
      if (theme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const systemPrefersDark = mediaQuery.matches;
        actualTheme = systemPrefersDark ? 'dark' : 'light';
      }
      
      setResolvedTheme(actualTheme);
    };
    
    // Update theme immediately
    updateResolvedTheme();
    
    // Listen for system theme changes if theme is 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(newTheme);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Apply resolved theme to document
  useEffect(() => {
    // Ensure this only runs on the client side
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
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
