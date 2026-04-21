// =====================================================================
// Domain types matching the Supabase schema.
// =====================================================================

export type Tier = 'common' | 'rare' | 'epic' | 'legendary';
export type Archetype = 'tank' | 'assassin' | 'support' | 'mage' | 'ranger';
export type CardType = 'attack' | 'defense' | 'buff' | 'debuff' | 'utility';
export type EntityType = 'hero' | 'card';
export type Role = 'admin' | 'designer' | 'viewer';
export type EnvName = 'dev' | 'staging' | 'prod';

export const TIERS: Tier[] = ['common', 'rare', 'epic', 'legendary'];
export const ARCHETYPES: Archetype[] = ['tank', 'assassin', 'support', 'mage', 'ranger'];
export const CARD_TYPES: CardType[] = ['attack', 'defense', 'buff', 'debuff', 'utility'];

export type FactorType = 'duration' | 'target' | 'effect_type';

export interface Environment {
  id: string;
  name: EnvName;
  created_at: string;
}

export interface StatCoefficient {
  id: string;
  env_id: string;
  stat_name: string;
  pp_per_unit: number;
  notes: string | null;
}

export interface PPBudget {
  id: string;
  env_id: string;
  tier: Tier;
  entity_type: EntityType;
  budget: number;
}

export interface AbilityFactor {
  id: string;
  env_id: string;
  factor_type: FactorType;
  factor_key: string;
  factor_value: number;
}

export interface Ability {
  id: string;
  env_id: string;
  name: string;
  description: string | null;
  base_power: number;
  duration_type: string;
  cooldown_sec: number;
  target_type: string;
  effect_type: string;
}

export interface Hero {
  id: string;
  env_id: string;
  name: string;
  tier: Tier;
  archetype: Archetype;
  base_stats: Record<string, number>;
  passive_ability_id: string | null;
  notes: string | null;
}

export interface Card {
  id: string;
  env_id: string;
  name: string;
  tier: Tier;
  card_type: CardType;
  ability_id: string | null;
  notes: string | null;
}

export interface ArchetypeRule {
  id: string;
  env_id: string;
  name: string;
  min_offense_pct: number;
  max_offense_pct: number;
  min_defense_pct: number;
  max_defense_pct: number;
  notes: string | null;
}

export interface UserRole {
  user_id: string;
  role: Role;
}
