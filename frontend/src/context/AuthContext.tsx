import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { updateTimezone } from '../api/user';
import { refreshToken } from '../api/auth';
import { getTokenPayload } from '../lib/utils';

interface User {
  id: string;
  username: string;
  email: string;
  timezone?: string; // Add timezone to user interface
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userState, setUserState] = useState<User | null>(null);
  const [tokenState, setTokenState] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const setAuthUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const setAuthToken = useCallback((newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    setTokenState(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken && storedUser !== 'undefined') {
      try {
        setUserState(JSON.parse(storedUser));
        setTokenState(storedToken);

        // Refresh the token when it is expired or about to expire (within 7 days).
        const payload = getTokenPayload(storedToken);
        const expiresAtMs = payload?.exp ? payload.exp * 1000 : 0;
        if (expiresAtMs <= Date.now()) {
          logout();
        } else if (expiresAtMs <= Date.now() + 7 * 24 * 60 * 60 * 1000) {
          refreshToken(storedToken)
            .then(({ token }) => {
              // Bail if the user logged out while the request was in flight
              if (localStorage.getItem('token') === storedToken) {
                setAuthToken(token);
              }
            })
            .catch((error) => {
              // Network hiccups are tolerable; the next API call will recover.
              console.error('Failed to refresh session token:', error);
            });
        }
      } catch (error) {
        console.error('Failed to parse stored user or token:', error);
        logout();
      }
    }
    setIsAuthReady(true);
  }, [logout, setAuthToken]);

  useEffect(() => {
    const autoSetTimezone = async () => {
      if (userState && tokenState && (!userState.timezone || userState.timezone === 'UTC')) {
        try {
          const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const response = await updateTimezone(localTimezone, tokenState);
          if (response && response.user) {
            setAuthUser(response.user);
          } else {
            console.error('Timezone update response did not contain user data:', response);
          }
        } catch (error) {
          console.error('Failed to automatically set timezone:', error);
        }
      }
    };

    autoSetTimezone();
  }, [userState, tokenState, setAuthUser]);


  return (
    <AuthContext.Provider value={{ user: userState, token: tokenState, setUser: setAuthUser, setToken: setAuthToken, logout, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
