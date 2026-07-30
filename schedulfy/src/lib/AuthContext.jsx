/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Get token from localStorage
  const getToken = useCallback(() => {
    return localStorage.getItem('authToken');
  }, []);

  // Set token in localStorage
  const setAuthToken = useCallback((token) => {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }, []);

  // Check if user is authenticated
  const checkUserAuth = useCallback(async () => {
    const token = getToken();
    
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    try {
      setIsLoadingAuth(true);
      
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token is invalid or expired
          localStorage.removeItem('authToken');
          setIsAuthenticated(false);
          setUser(null);
          setAuthError({
            type: 'auth_required',
            message: 'Session expired. Please login again.'
          });
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        setAuthError(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      setAuthError({
        type: 'auth_error',
        message: error.message || 'Authentication failed'
      });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, [getToken]);

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token
      if (data.token) {
        setAuthToken(data.token);
      }

      setUser(data.user || data);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      setAuthError({
        type: 'login_failed',
        message: error.message || 'Login failed'
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoadingAuth(false);
    }
  }, [setAuthToken]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    // Redirect to login
    window.location.href = '/login';
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        authError,
        authChecked,
        login,
        logout,
        checkUserAuth,
        getToken,
        setAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};