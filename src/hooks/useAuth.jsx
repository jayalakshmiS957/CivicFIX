import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');

  // Check existing session on mount
  const checkSession = useCallback(async () => {
    try {
      const data = await authApi.getMe();
      if (data && data.user) {
        setUser(data.user);
        setSessionExpiredMessage('');
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
      if (err.status === 401 && (err.message?.toLowerCase().includes('expired') || err.message?.toLowerCase().includes('sign in'))) {
        setSessionExpiredMessage('Your session expired, please sign in again');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (credentials) => {
    try {
      const data = await authApi.login(credentials);
      setUser(data.user);
      setSessionExpiredMessage('');
      return { success: true, user: data.user, ...data.user };
    } catch (err) {
      let rawErr = err?.message;
      let errMsg = 'Incorrect email or password';
      if (typeof rawErr === 'string' && rawErr.trim() && rawErr !== '[object Object]') {
        errMsg = rawErr;
      }
      return {
        success: false,
        error: errMsg,
      };
    }
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    setUser(data.user);
    setSessionExpiredMessage('');
    return { success: true, user: data.user, ...data.user };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setSessionExpiredMessage('');
    }
  };

  const clearSessionExpired = () => {
    setSessionExpiredMessage('');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        sessionExpiredMessage,
        clearSessionExpired,
        login,
        register,
        logout,
        refreshUser: checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
