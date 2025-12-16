/**
 * useWixAuth Hook
 * Comprehensive React hook for Wix authentication management
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getBrowserSupabaseClient } from '../utils/supabaseBrowserClient';

export function useWixAuth() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [memberData, setMemberData] = useState(null);
  const [error, setError] = useState(null);

  // Check connection status
  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/wix-auth/status', {
        headers: session?.access_token
          ? { 'Authorization': `Bearer ${session.access_token}` }
          : {}
      });

      const data = await response.json();

      if (data.connected) {
        setIsConnected(true);
        setMemberData(data.memberData);
      } else {
        setIsConnected(false);
        setMemberData(null);
      }
    } catch (err) {
      console.error('Error checking Wix status:', err);
      setError(err.message);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Also check for cookie presence as quick indicator
  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )wix_connected=([^;]*)/);
    if (match && decodeURIComponent(match[1]) === 'true') {
      setIsConnected(true);
    }
  }, []);

  // Login - redirect to Wix OAuth
  const login = useCallback(async (returnUrl = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wix-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: returnUrl || router.asPath })
      });

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(data.error || 'Failed to initiate login');
      }
    } catch (err) {
      console.error('Wix login error:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [router]);

  // Logout - clear Wix session
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      await fetch('/api/wix-auth/logout', {
        method: 'POST',
        headers: session?.access_token
          ? { 'Authorization': `Bearer ${session.access_token}` }
          : {}
      });

      setIsConnected(false);
      setMemberData(null);
    } catch (err) {
      console.error('Wix logout error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get OAuth URL for manual use
  const getAuthUrl = useCallback(async () => {
    try {
      const response = await fetch('/api/wix-auth/login');
      const data = await response.json();
      return data.authUrl;
    } catch (err) {
      console.error('Error getting auth URL:', err);
      throw err;
    }
  }, []);

  return {
    isConnected,
    isLoading,
    memberData,
    error,
    login,
    logout,
    checkStatus,
    getAuthUrl
  };
}

/**
 * useRequireWixAuth Hook
 * Redirects to login if Wix auth is not connected
 */
export function useRequireWixAuth(redirectTo = '/login') {
  const router = useRouter();
  const { isConnected, isLoading } = useWixAuth();

  useEffect(() => {
    if (!isLoading && !isConnected) {
      router.replace(redirectTo);
    }
  }, [isConnected, isLoading, redirectTo, router]);

  return { isConnected, isLoading };
}

/**
 * WixAuthProvider Context
 * For app-wide Wix auth state management
 */
import { createContext, useContext } from 'react';

const WixAuthContext = createContext(null);

export function WixAuthProvider({ children }) {
  const auth = useWixAuth();

  return (
    <WixAuthContext.Provider value={auth}>
      {children}
    </WixAuthContext.Provider>
  );
}

export function useWixAuthContext() {
  const context = useContext(WixAuthContext);
  if (!context) {
    throw new Error('useWixAuthContext must be used within WixAuthProvider');
  }
  return context;
}

export default useWixAuth;
