import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginGoogle: (idToken: string) => Promise<void>;
  loginDemo: (email?: string, name?: string, avatar?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res.data.success && res.data.data) {
        setUser(res.data.data);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginGoogle = async (idToken: string) => {
    const res = await authApi.loginGoogle(idToken);
    if (res.data.success && res.data.data) {
      if (res.data.data.token) {
        localStorage.setItem('reachinbox_token', res.data.data.token);
      }
      setUser(res.data.data.user);
    }
  };

  const loginDemo = async (email?: string, name?: string, avatar?: string) => {
    const res = await authApi.loginDemo(email, name, avatar);
    if (res.data.success && res.data.data) {
      if (res.data.data.token) {
        localStorage.setItem('reachinbox_token', res.data.data.token);
      }
      setUser(res.data.data.user);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('reachinbox_token');
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginGoogle, loginDemo, logout, refreshUser }}>
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

