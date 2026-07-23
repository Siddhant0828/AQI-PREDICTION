import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// Create a mock User type since we removed Supabase
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
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore demo session across reloads
    if (sessionStorage.getItem(DEMO_KEY) === '1') {
      setIsDemo(true);
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (_email: string, _password: string) => {
    // We are mocking this since Supabase is removed
    return { error: 'Backend auth not fully migrated yet. Please use Demo Access.' };
  }, []);

  const signUp = useCallback(async (_email: string, _password: string, _fullName: string) => {
    return { error: 'Backend auth not fully migrated yet. Please use Demo Access.' };
  }, []);

  const signInDemo = useCallback(() => {
    sessionStorage.setItem(DEMO_KEY, '1');
    setIsDemo(true);
  }, []);

  const signOut = useCallback(async () => {
    sessionStorage.removeItem(DEMO_KEY);
    setIsDemo(false);
    setSession(null);
  }, []);

  const user = isDemo ? DEMO_USER : null;

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
