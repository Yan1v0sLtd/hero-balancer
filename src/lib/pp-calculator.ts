// =====================================================================
// Power Point Calculator
// =====================================================================
// Single source of truth for how PP is derived from stats and abilities.
// All numeric coefficients come from the database — this file contains
// the FORMULA only, not the values.
// =====================================================================

import type {
  Ability,
  AbilityFactor,
  Hero,
  StatCoefficient,
  Card,
  ArchetypeRule,
} from '../types/database';

// -----------------------------------------------------------------------
// Stat PP: sum over each stat of (value × coefficient)
// -----------------------------------------------------------------------
export function calculateStatPP(
  stats: Record<string, number>,
  coefficients: StatCoefficient[]
): { total: number; breakdown: { stat: string; value: number; coef: number; pp: number }[] } {
  const byName = new Map(coefficients.map((c) => [c.stat_name, c.pp_per_unit]));
  const breakdown: { stat: string; value: number; coef: number; pp: number }[] = [];
  let total = 0;

  for (const [stat, rawValue] of Object.entries(stats)) {
    const value = Number(rawValue) || 0;
    const coef = byName.get(stat) ?? 0;
    const pp = value * coef;
    total += pp;
    breakdown.push({ stat, value, coef, pp });
  }
  return { total, breakdown };
}

// -----------------------------------------------------------------------
// Ability PP formula
//
//   pp = base_power × duration × (10 / (cooldown_sec + 1)) × target × type
//
// Cooldown is baked in as an inverse term — lower CD → higher PP.
// -----------------------------------------------------------------------
export function calculateAbilityPP(
  ability: Pick<
    Ability,
    'base_power' | 'duration_type' | 'cooldown_sec' | 'target_type' | 'effect_type'
  >,
  factors: AbilityFactor[]
): { total: number; breakdown: Record<string, number> } {
  const factorMap = new Map<string, number>();
  for (const f of factors) factorMap.set(`${f.factor_type}:${f.factor_key}`, f.factor_value);

  const base = Number(ability.base_power) || 0;
  const duration = factorMap.get(`duration:${ability.duration_type}`) ?? 1;
  const cooldown = 10 / ((Number(ability.cooldown_sec) || 0) + 1);
  const target = factorMap.get(`target:${ability.target_type}`) ?? 1;
  const effect = factorMap.get(`effect_type:${ability.effect_type}`) ?? 1;

  const total = base * duration * cooldown * target * effect;
  return {
    total,
    breakdown: { base, duration, cooldown, target, effect },
  };
}

// -----------------------------------------------------------------------
// Hero total PP = stat PP + passive ability PP (if any)
// -----------------------------------------------------------------------
export function calculateHeroPP(
  hero: Pick<Hero, 'base_stats' | 'passive_ability_id'>,
  coefficients: StatCoefficient[],
  factors: AbilityFactor[],
  abilityById: Map<string, Ability>
): { total: number; statPP: number; abilityPP: number } {
  const { total: statPP } = calculateStatPP(hero.base_stats, coefficients);
  let abilityPP = 0;
  if (hero.passive_ability_id) {
    const ability = abilityById.get(hero.passive_ability_id);
    if (ability) abilityPP = calculateAbilityPP(ability, factors).total;
  }
  return { total: statPP + abilityPP, statPP, abilityPP };
}

// -----------------------------------------------------------------------
// Card PP = ability PP (cards are pure ability carriers in v1)
// -----------------------------------------------------------------------
export function calculateCardPP(
  card: Pick<Card, 'ability_id'>,
  factors: AbilityFactor[],
  abilityById: Map<string, Ability>
): number {
  if (!card.ability_id) return 0;
  const ability = abilityById.get(card.ability_id);
  if (!ability) return 0;
  return calculateAbilityPP(ability, factors).total;
}

// -----------------------------------------------------------------------
// Budget check — returns status vs. the tier budget.
// -----------------------------------------------------------------------
export type BudgetStatus = 'under' | 'ok' | 'warn' | 'over';

export function budgetStatus(used: number, budget: number): BudgetStatus {
  if (budget <= 0) return 'ok';
  const pct = used / budget;
  if (pct > 1) return 'over';
  if (pct > 0.95) return 'warn';
  if (pct < 0.5) return 'under';
  return 'ok';
}

export function budgetColor(status: BudgetStatus): string {
  switch (status) {
    case 'over':
      return 'text-red-400';
    case 'warn':
      return 'text-amber-400';
    case 'under':
      return 'text-slate-400';
    case 'ok':
    default:
      return 'text-emerald-400';
  }
}

// -----------------------------------------------------------------------
// Phase 2 scaffold: archetype constraint check.
// Given stat PP breakdown and an archetype rule, classify offense vs defense
// PP and report violations.
// -----------------------------------------------------------------------
const OFFENSE_STATS = new Set(['atk', 'crit_pct', 'crit_dmg_pct', 'spd']);
const DEFENSE_STATS = new Set(['hp', 'def']);

export function checkArchetypeConstraints(
  statBreakdown: { stat: string; pp: number }[],
  rule: ArchetypeRule
): { offensePct: number; defensePct: number; violations: string[] } {
  const totalStatPP = statBreakdown.reduce((s, x) => s + x.pp, 0) || 1;
  const offensePP = statBreakdown
    .filter((x) => OFFENSE_STATS.has(x.stat))
    .reduce((s, x) => s + x.pp, 0);
  const defensePP = statBreakdown
    .filter((x) => DEFENSE_STATS.has(x.stat))
    .reduce((s, x) => s + x.pp, 0);
  const offensePct = (offensePP / totalStatPP) * 100;
  const defensePct = (defensePP / totalStatPP) * 100;

  const violations: string[] = [];
  if (offensePct < rule.min_offense_pct)
    violations.push(`Offense ${offensePct.toFixed(0)}% < min ${rule.min_offense_pct}%`);
  if (offensePct > rule.max_offense_pct)
    violations.push(`Offense ${offensePct.toFixed(0)}% > max ${rule.max_offense_pct}%`);
  if (defensePct < rule.min_defense_pct)
    violations.push(`Defense ${defensePct.toFixed(0)}% < min ${rule.min_defense_pct}%`);
  if (defensePct > rule.max_defense_pct)
    violations.push(`Defense ${defensePct.toFixed(0)}% > max ${rule.max_defense_pct}%`);

  return { offensePct, defensePct, violations };
}
