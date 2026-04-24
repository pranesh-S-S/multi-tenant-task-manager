'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import api, { setAccessToken } from '@/lib/api';
import type { User, Organization } from '@/types';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loginWithToken: (accessToken: string) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  /**
   * Try to restore session on mount.
   * Calls /auth/refresh (cookie-based) to get a new access token.
   */
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.post('/auth/refresh');
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      // Fetch org separately if not in refresh response
      if (res.data.organization) {
        setOrganization(res.data.organization);
      }
    } catch {
      setAccessToken(null);
      setUser(null);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip auto-refresh on the OAuth callback page — it handles its own auth
    if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
      setIsLoading(false);
      return;
    }
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    setOrganization(res.data.organization);
    router.push('/dashboard');
  };

  const register = async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    setOrganization(res.data.organization);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors — clear state anyway
    }
    setAccessToken(null);
    setUser(null);
    setOrganization(null);
    router.push('/login');
  };

  /**
   * Called from OAuth callback page — we already have an access token from
   * the URL, so we store it and use it to fetch the current user profile.
   */
  const loginWithToken = async (token: string) => {
    setAccessToken(token);
    const res = await api.get('/auth/me');
    setUser(res.data.user);
    setOrganization(res.data.organization);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        loginWithToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
