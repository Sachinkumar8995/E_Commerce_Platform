import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

/**
 * AuthProvider – wraps the app and provides authentication state & helpers.
 * Stores user info (including token) in localStorage under 'userInfo'.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setToken(parsed.token);
      } catch {
        localStorage.removeItem('userInfo');
      }
    }
    setLoading(false);
  }, []);

  // Persist user info whenever it changes
  const persistUser = useCallback((userData) => {
    if (userData) {
      localStorage.setItem('userInfo', JSON.stringify(userData));
      setUser(userData);
      setToken(userData.token);
    } else {
      localStorage.removeItem('userInfo');
      setUser(null);
      setToken(null);
    }
  }, []);

  /**
   * Register a new user account.
   * @param {string} name
   * @param {string} email
   * @param {string} password
   * @returns {object} user data
   */
  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    persistUser(data);
    return data;
  }, [persistUser]);

  /**
   * Login with email + password.
   * @returns {object} user data
   */
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persistUser(data);
    return data;
  }, [persistUser]);

  /**
   * Logout – clear local state.
   */
  const logout = useCallback(() => {
    persistUser(null);
  }, [persistUser]);

  /** Helper: is the current user an admin? */
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, register, isAdmin, setUser: persistUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to consume auth context.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
