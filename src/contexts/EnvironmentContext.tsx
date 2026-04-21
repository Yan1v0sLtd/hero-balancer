import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Environment } from '../types/database';

interface EnvState {
  environments: Environment[];
  currentEnv: Environment | null;
  setCurrentEnvById: (id: string) => void;
  loading: boolean;
}

const EnvContext = createContext<EnvState | undefined>(undefined);
const STORAGE_KEY = 'hb.currentEnvId';

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [currentEnv, setCurrentEnv] = useState<Environment | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-fetch whenever the auth user changes. RLS blocks unauthenticated reads,
  // so fetching on mount before login yields an empty list and strands the
  // provider in that state. Keying on session.user.id re-runs the fetch when
  // the session lands (or is cleared on sign-out).
  useEffect(() => {
    if (!session?.user?.id) {
      setEnvironments([]);
      setCurrentEnv(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('environments')
      .select('*')
      .order('name')
      .then(({ data }) => {
        const envs = (data ?? []) as Environment[];
        setEnvironments(envs);
        const storedId = localStorage.getItem(STORAGE_KEY);
        const preferred =
          envs.find((e) => e.id === storedId) ||
          envs.find((e) => e.name === 'dev') ||
          envs[0] ||
          null;
        setCurrentEnv(preferred);
        setLoading(false);
      });
  }, [session?.user?.id]);

  const setCurrentEnvById = (id: string) => {
    const env = environments.find((e) => e.id === id);
    if (env) {
      setCurrentEnv(env);
      localStorage.setItem(STORAGE_KEY, env.id);
    }
  };

  return (
    <EnvContext.Provider value={{ environments, currentEnv, setCurrentEnvById, loading }}>
      {children}
    </EnvContext.Provider>
  );
}

export function useEnvironment() {
  const ctx = useContext(EnvContext);
  if (!ctx) throw new Error('useEnvironment must be used within EnvironmentProvider');
  return ctx;
}
