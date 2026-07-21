
/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect } from 'react';
import { schedulfySDK as schedulfy } from '@/lib/sdk';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from './sdk';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const token = localStorage.getItem('authToken');
      
      // ✅ Set token in SDK if it exists
      if (token) {
        try {
          if (schedulfy && schedulfy.client) {
            schedulfy.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
          if (appParams) {
            appParams.token = token;
          }
          console.log('✅ Token set in SDK');
        } catch (tokenError) {
          console.error('Error setting token in SDK:', tokenError);
        }
        
        await checkUserAuth();
        setIsLoadingPublicSettings(false);
        return;
      }

      if (!appParams.appId) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setIsLoadingPublicSettings(false);
        return;
      }

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId,
        },
        token: appParams.token,
        interceptResponses: true,
      });

      try {
        const publicSettings = await appClient.get(
          `/prod/public-settings/by-id/${appParams.appId}`
        );
        setAppPublicSettings(publicSettings);

        if (appParams.token) {
          if (schedulfy && schedulfy.client) {
            schedulfy.client.defaults.headers.common['Authorization'] = `Bearer ${appParams.token}`;
          }
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.warn('Backend app settings unavailable, using local mode:', appError.message);

        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required',
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app',
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message,
            });
          }
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      }
    } catch (error) {
      console.error('Unexpected error in auth check:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setIsLoadingPublicSettings(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      
      const token = localStorage.getItem('authToken');
      
      if (token) {
        if (schedulfy && schedulfy.client) {
          schedulfy.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        try {
          const currentUser = await schedulfy.auth.me();
          setUser(currentUser);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
          setAuthChecked(true);
        } catch (authError) {
          console.error('Auth check failed:', authError);
          if (authError.status === 401 || authError.status === 403) {
            localStorage.removeItem('authToken');
            if (schedulfy && schedulfy.client) {
              delete schedulfy.client.defaults.headers.common['Authorization'];
            }
            setIsAuthenticated(false);
            setUser(null);
          }
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }
      } else {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required',
        });
        localStorage.removeItem('authToken');
        if (schedulfy && schedulfy.client) {
          delete schedulfy.client.defaults.headers.common['Authorization'];
        }
      }
    }
  };

  const setAuthToken = (token) => {
    if (token) {
      localStorage.setItem('authToken', token);
      if (schedulfy && schedulfy.client) {
        schedulfy.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      if (appParams) {
        appParams.token = token;
      }
    } else {
      localStorage.removeItem('authToken');
      if (schedulfy && schedulfy.client) {
        delete schedulfy.client.defaults.headers.common['Authorization'];
      }
      if (appParams) {
        appParams.token = null;
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    localStorage.removeItem('authToken');
    if (schedulfy && schedulfy.client) {
      delete schedulfy.client.defaults.headers.common['Authorization'];
    }
    if (appParams) {
      appParams.token = null;
    }

    if (shouldRedirect && schedulfy && schedulfy.auth) {
      schedulfy.auth.logout(window.location.href);
    } else if (schedulfy && schedulfy.auth) {
      schedulfy.auth.logout();
    }
  };

  const navigateToLogin = () => {
    if (schedulfy && schedulfy.auth) {
      schedulfy.auth.redirectToLogin(window.location.href);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
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