import React, { useState, useEffect } from 'react';
import { Auth, Hub } from 'aws-amplify';

interface AuthState {
  isAuthenticated: boolean;
  user: any;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    checkAuthState();
    
    // Listen for auth state changes via Hub
    const unsubscribe = Hub.listen('auth', ({ payload: { event, data } }) => {
      switch (event) {
        case 'signIn':
          checkAuthState();
          break;
        case 'signOut':
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          });
          break;
      }
    });
      
    return unsubscribe;
  }, []);

  const checkAuthState = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      setAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
      });
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const user = await Auth.signIn(username, password);
      setAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await Auth.signOut();
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return {
    ...authState,
    signIn,
    signOut,
    checkAuthState,
  };
};


