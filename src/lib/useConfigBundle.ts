import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import type { AbilityFactor, Ability, StatCoefficient, PPBudget } from '../types/database';

interface ConfigBundle {
  coefficients: StatCoefficient[];
  factors: AbilityFactor[];
  budgets: PPBudget[];
  abilities: Ability[];
  abilityById: Map<string, Ability>;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads all config + abilities for the current environment.
 * Heroes and card editors all need this bundle to compute PP live.
 */
export function useConfigBundle(): ConfigBundle {
  const { currentEnv } = useEnvironment();
  const [coefficients, setCoefficients] = useState<StatCoefficient[]>([]);
  const [factors, setFactors] = useState<AbilityFactor[]>([]);
  const [budgets, setBudgets] = useState<PPBudget[]>([]);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!currentEnv) return;
    setLoading(true);
    (async () => {
      const [c, f, b, a] = await Promise.all([
        supabase.from('stat_coefficients').select('*').eq('env_id', currentEnv.id),
        supabase.from('ability_factors').select('*').eq('env_id', currentEnv.id),
        supabase.from('pp_budgets').select('*').eq('env_id', currentEnv.id),
        supabase.from('abilities').select('*').eq('env_id', currentEnv.id).order('name'),
      ]);
      setCoefficients((c.data ?? []) as StatCoefficient[]);
      setFactors((f.data ?? []) as AbilityFactor[]);
      setBudgets((b.data ?? []) as PPBudget[]);
      setAbilities((a.data ?? []) as Ability[]);
      setLoading(false);
    })();
  }, [currentEnv?.id, nonce]);

  const abilityById = new Map(abilities.map((a) => [a.id, a]));
  return {
    coefficients,
    factors,
    budgets,
    abilities,
    abilityById,
    loading,
    reload: () => setNonce((n) => n + 1),
  };
}

export function budgetFor(
  budgets: PPBudget[],
  tier: string,
  entityType: 'hero' | 'card'
): number {
  return budgets.find((b) => b.tier === tier && b.entity_type === entityType)?.budget ?? 0;
}
