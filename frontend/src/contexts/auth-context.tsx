'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/api-client';

export type Role = 'CUSTOMER' | 'ADMIN';

export type ApplicationStage =
  | 'SIGNUP_COMPLETED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'KYC_PENDING'
  | 'KYC_SUBMITTED'
  | 'ELIGIBILITY_CHECKED'
  | 'EMI_SELECTED'
  | 'BANK_ADDED'
  | 'DECLARATION_CONFIRMED'
  | 'SELFIE_PENDING'
  | 'WAITING_ADMIN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt?: string;
}

export interface Application {
  id: string;
  userId: string;
  stage: ApplicationStage;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  application: Application | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ user: User; application: Application }>;
  signup: (data: {
    email: string;
    password: string;
    phone?: string;
  }) => Promise<{ user: User; application: Application }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
  updateApplicationStage: (newStage: ApplicationStage) => void;
  setMockSession: (
    user: User | null,
    application: Application | null
  ) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const handleRoleRedirect = useCallback(
    (userRole: Role) => {
      if (userRole === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/apply');
      }
    },
    [router]
  );

  /**
   * Check authentication on mount
   */
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedToken = apiClient.getAccessToken();
      if (!storedToken) {
        // Try refresh token exchange from HttpOnly cookie
        const refreshRes = await apiClient.post<{
          accessToken: string;
          user: User;
        }>('/auth/refresh', {}, { skipAuth: true });

        if (refreshRes.data?.accessToken) {
          apiClient.setAccessToken(refreshRes.data.accessToken);
          setAccessTokenState(refreshRes.data.accessToken);
          setUser(refreshRes.data.user);
        }
      }

      // Fetch /auth/me for user and active loan application
      const meRes = await apiClient.get<{
        user: User;
        application: Application;
      }>('/auth/me');

      if (meRes.data?.user) {
        setUser(meRes.data.user);
        setApplication(meRes.data.application || null);
        setAccessTokenState(apiClient.getAccessToken());
      }
    } catch {
      // Unauthenticated or expired session
      apiClient.clearAccessToken();
      setUser(null);
      setApplication(null);
      setAccessTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<{
        user: User;
        application: Application;
        accessToken: string;
      }>('/auth/login', { email, password });

      const { user: loggedInUser, application: app, accessToken: token } =
        res.data!;

      apiClient.setAccessToken(token);
      setAccessTokenState(token);
      setUser(loggedInUser);
      setApplication(app);

      handleRoleRedirect(loggedInUser.role);

      return { user: loggedInUser, application: app };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register a new user
   */
  const signup = async (data: {
    email: string;
    password: string;
    phone?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<{
        user: User;
        application: Application;
        accessToken: string;
      }>('/auth/signup', data);

      const { user: newUser, application: app, accessToken: token } =
        res.data!;

      apiClient.setAccessToken(token);
      setAccessTokenState(token);
      setUser(newUser);
      setApplication(app);

      handleRoleRedirect(newUser.role);

      return { user: newUser, application: app };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user and clear session
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/logout', {}).catch(() => {});
    } finally {
      apiClient.clearAccessToken();
      setUser(null);
      setApplication(null);
      setAccessTokenState(null);
      setIsLoading(false);
      router.push('/login');
    }
  };

  /**
   * Explicitly refresh session
   */
  const refreshSession = async (): Promise<boolean> => {
    try {
      const res = await apiClient.post<{
        accessToken: string;
        user: User;
      }>('/auth/refresh', {}, { skipAuth: true });

      if (res.data?.accessToken) {
        apiClient.setAccessToken(res.data.accessToken);
        setAccessTokenState(res.data.accessToken);
        setUser(res.data.user);
        return true;
      }
      return false;
    } catch {
      apiClient.clearAccessToken();
      setUser(null);
      setApplication(null);
      setAccessTokenState(null);
      return false;
    }
  };

  /**
   * Helper to update application stage in local state
   */
  const updateApplicationStage = (newStage: ApplicationStage) => {
    setApplication((prev) =>
      prev
        ? { ...prev, stage: newStage, updatedAt: new Date().toISOString() }
        : null
    );
  };

  /**
   * Mock session helper for UI development / preview testing
   */
  const setMockSession = (
    mockUser: User | null,
    mockApp: Application | null
  ) => {
    setUser(mockUser);
    setApplication(mockApp);
    setAccessTokenState(mockUser ? 'mock_jwt_token_demo' : null);
    if (mockUser) {
      apiClient.setAccessToken('mock_jwt_token_demo');
    } else {
      apiClient.clearAccessToken();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        application,
        role: user?.role || null,
        isAuthenticated: Boolean(user),
        isLoading,
        accessToken,
        login,
        signup,
        logout,
        refreshSession,
        checkAuth,
        updateApplicationStage,
        setMockSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
