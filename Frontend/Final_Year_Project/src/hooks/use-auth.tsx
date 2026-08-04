import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface User {
  id: string;
  email: string;
  user_metadata: { full_name: string };
  app_metadata: Record<string, any>;
  aud: string;
  created_at: string;
}

const DEMO_USER: User = {
  id: 'demo-user',
  email: 'demo@aerosense.in',
  user_metadata: { full_name: 'Demo Analyst' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const DEMO_KEY = 'aerosense-demo-session';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface AuthContextValue {
  session: any | null;
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async (token: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: String(data.id),
          email: data.email,
          user_metadata: { full_name: data.full_name || data.email.split('@')[0] },
          app_metadata: { role: data.role },
          aud: 'authenticated',
          created_at: data.created_at || new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('Failed to fetch current user profile:', err);
    }
    return null;
  };

  useEffect(() => {
    const initAuth = async () => {
      if (sessionStorage.getItem(DEMO_KEY) === '1') {
        setIsDemo(true);
        setUser(DEMO_USER);
        setSession({ token: 'demo-token' });
      } else {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (token) {
          const profile = await fetchCurrentUser(token);
          if (profile) {
            setUser(profile);
            setSession({ token });
          } else {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = typeof data.detail === 'string' ? data.detail : 'Invalid email or password.';
        return { error: errMsg };
      }

      const { access_token, refresh_token } = data;
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      sessionStorage.removeItem(DEMO_KEY);

      const profile = await fetchCurrentUser(access_token);
      const authenticatedUser = profile || {
        id: 'user-id',
        email,
        user_metadata: { full_name: email.split('@')[0] },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      setIsDemo(false);
      setUser(authenticatedUser);
      setSession({ token: access_token });

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Unable to connect to backend service.' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        let errMsg = 'Registration failed.';
        if (typeof data.detail === 'string') {
          errMsg = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          errMsg = data.detail[0].msg || 'Invalid registration details.';
        }
        return { error: errMsg };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Unable to connect to backend service.' };
    }
  }, []);

  const signInDemo = useCallback(() => {
    sessionStorage.setItem(DEMO_KEY, '1');
    setIsDemo(true);
    setUser(DEMO_USER);
    setSession({ token: 'demo-token' });
  }, []);

  const signOut = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (token && refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (err) {
        console.warn('Logout API call failed:', err);
      }
    }

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(DEMO_KEY);
    setIsDemo(false);
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, isDemo, signIn, signUp, signInDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
