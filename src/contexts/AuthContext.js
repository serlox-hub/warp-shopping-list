'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

const stableSerialize = (value) => {
  const seen = new WeakSet();

  const serialize = (val) => {
    if (val === null) return 'null';
    if (typeof val !== 'object') return JSON.stringify(val);
    if (seen.has(val)) return '"[Circular]"';

    seen.add(val);

    if (Array.isArray(val)) {
      return `[${val.map((item) => serialize(item)).join(',')}]`;
    }

    const keys = Object.keys(val).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${serialize(val[key])}`).join(',')}}`;
  };

  return serialize(value);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastUserSignatureRef = useRef(stableSerialize(null));

  const updateUserState = useCallback((nextUser) => {
    const signature = stableSerialize(nextUser);

    if (lastUserSignatureRef.current === signature) return;

    lastUserSignatureRef.current = signature;
    setUser(nextUser);
  }, []);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      updateUserState(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        updateUserState(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, [updateUserState]);

  const signInWithGoogle = useCallback(async (redirectTo = null) => {
    try {
      // Build callback URL with optional redirect_to parameter
      let callbackUrl = `${window.location.origin}/auth/callback`;
      if (redirectTo) {
        callbackUrl += `?redirect_to=${encodeURIComponent(redirectTo)}`;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    signInWithGoogle,
    signOut,
  }), [user, loading, signInWithGoogle, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
