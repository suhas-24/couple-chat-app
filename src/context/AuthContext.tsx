import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User, AuthResponse } from '@/services/api';
import { useRouter } from 'next/router';
import socketService from '@/services/socketService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Try to get current user from server (checks cookie)
        const response = await api.auth.getCurrentUser();
        if (response && response.success) {
          setUser(response.user);
          // Initialize socket connection if user is authenticated
          socketService.connect();
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // User not authenticated, that's okay
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response: AuthResponse = await api.auth.login(email, password);
      
      if (response.success) {
        setUser(response.user);
        // Initialize socket connection
        socketService.connect();
        router.push('/chat');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const response: AuthResponse = await api.auth.signup(name, email, password);
      
      if (response.success) {
        setUser(response.user);
        // Initialize socket connection
        socketService.connect();
        router.push('/chat');
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Disconnect socket
      socketService.disconnect();
      setUser(null);
      router.push('/');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
