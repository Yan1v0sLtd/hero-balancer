import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useConfigBundle, budgetFor } from '../lib/useConfigBundle';
import { calculateHeroPP, calculateCardPP } from '../lib/pp-calculator';
import { PageHeader, Panel, EmptyState, TierBadge } from '../components/UI';
import { TIERS, ARCHETYPES } from '../types/database';
import type { Hero, Card, Tier, Archetype } from '../types/database';

/**
 * Phase 4 scaffold — this will grow into the real balance report.
 * Today it shows: PP distribution by tier, by archetype, and outliers.
 */
export default function BalanceReport() {
  const { currentEnv } = useEnvironment();
  const { coefficients, factors, budgets, abilityById, loading: cfgLoading } = useConfigBundle();
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentEnv) return;
    setLoading(true);
    (async () => {
      const [h, c] = await Promise.all([
        supabase.from('heroes').select('*').eq('env_id', currentEnv.id),
        supabase.from('cards').select('*').eq('env_id', currentEnv.id),
      ]);
      setHeroes((h.data ?? []) as Hero[]);
      setCards((c.data ?? []) as Card[]);
      setLoading(false);
    })();
  }, [currentEnv?.id]);

  // ---- Hero aggregation by (tier, archetype) ----
  const heroStats = useMemo(() => {
    const rows: { tier: Tier; archetype: Archetype; count: number; avgPP: number; overBudget: number; budget: number }[] = [];
    for (const tier of TIERS) {
      const budget = budgetFor(budgets, tier, 'hero');
      for (const archetype of ARCHETYPES) {
        const matching = heroes.filter((h) => h.tier === tier && h.archetype === archetype);
        if (matching.length === 0) continue;
        const pps = matching.map(
          (h) => calculateHeroPP(h, coefficients, factors, abilityById).total
        );
        const avgPP = pps.reduce((s, p) => s + p, 0) / pps.length;
        const overBudget = pps.filter((p) => p > budget).length;
        rows.push({ tier, archetype, count: matching.length, avgPP, overBudget, budget });
      }
    }
    return rows;
  }, [heroes, coefficients, factors, budgets, abilityById]);

  // ---- Hero outliers: > 1 std dev from archetype-tier average ----
  const outliers = useMemo(() => {
    const buckets = new Map<string, number[]>();
    const heroToBucket = new Map<string, string>();
    const heroToPP = new Map<string, number>();
    for (const h of heroes) {
      const key = `${h.tier}::${h.archetype}`;
      const pp = calculateHeroPP(h, coefficients, factors, abilityById).total;
      heroToBucket.set(h.id, key);
      heroToPP.set(h.id, pp);
      const arr = buckets.get(key) ?? [];
      arr.push(pp);
      buckets.set(key, arr);
    }
    const stats = new Map<string, { mean: number; std: number }>();
    for (const [k, arr] of buckets) {
      if (arr.length < 3) continue;
      const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
      const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
      stats.set(k, { mean, std: Math.sqrt(variance) });
    }
    const out: { hero: Hero; pp: number; deviation: number }[] = [];
    for (const h of heroes) {
      const s = stats.get(heroToBucket.get(h.id)!);
      if (!s || s.std === 0) continue;
      const pp = heroToPP.get(h.id)!;
      const z = (pp - s.mean) / s.std;
      if (Math.abs(z) > 1.0) out.push({ hero: h, pp, deviation: z });
    }
    return out.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
  }, [heroes, coefficients, factors, abilityById]);

  // ---- Card PP distribution by tier ----
  const cardStats = useMemo(() => {
    return TIERS.map((tier) => {
      const budget = budgetFor(budgets, tier, 'card');
      const matching = cards.filter((c) => c.tier === tier);
      const pps = matching.map((c) => calculateCardPP(c, factors, abilityById));
      const avgPP = pps.length === 0 ? 0 : pps.reduce((s, p) => s + p, 0) / pps.length;
      const overBudget = pps.filter((p) => p > budget).length;
      return { tier, count: matching.length, avgPP, overBudget, budget };
    });
  }, [cards, factors, budgets, abilityById]);

  const busy = loading || cfgLoading;

  return (
    <div>
      <PageHeader
        title="Balance Report"
        description="Aggregated PP distribution across the current environment. Use this to spot tier creep, underpowered archetypes, and outliers."
      />

      {busy ? (
        <div className="text-slate-400">Loading…</div>
      ) : heroes.length === 0 && cards.length === 0 ? (
        <EmptyState message="No heroes or cards in this environment yet." />
      ) : (
        <div className="space-y-6">
          {/* Heroes by tier × archetype */}
          <Panel>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Heroes — by tier × archetype
            </h3>
            {heroStats.length === 0 ? (
              <div className="text-slate-500 text-sm">No heroes yet.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Archetype</th>
                    <th className="text-right">Count</th>
                    <th className="text-right">Avg PP</th>
                    <th className="text-right">Budget</th>
                    <th className="text-right">% of budget</th>
                    <th className="text-right">Over</th>
                  </tr>
                </thead>
                <tbody>
                  {heroStats.map((r) => {
                    const pct = r.budget > 0 ? (r.avgPP / r.budget) * 100 : 0;
                    const pctColor =
                      pct > 100
                        ? 'text-red-400'
                        : pct > 90
                        ? 'text-amber-400'
                        : pct < 60
                        ? 'text-slate-400'
                        : 'text-emerald-400';
                    return (
                      <tr key={`${r.tier}-${r.archetype}`}>
                        <td>
                          <TierBadge tier={r.tier} />
                        </td>
                        <td className="font-mono text-xs">{r.archetype}</td>
                        <td className="text-right font-mono">{r.count}</td>
                        <td className="text-right font-mono">{r.avgPP.toFixed(1)}</td>
                        <td className="text-right font-mono text-slate-400">{r.budget}</td>
                        <td className={`text-right font-mono ${pctColor}`}>{pct.toFixed(0)}%</td>
                        <td
                          className={`text-right font-mono ${
                            r.overBudget > 0 ? 'text-red-400' : 'text-slate-500'
                          }`}
                        >
                          {r.overBudget}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>

          {/* Cards by tier */}
          <Panel>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Cards — by tier</h3>
            <table>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th className="text-right">Count</th>
                  <th className="text-right">Avg PP</th>
                  <th className="text-right">Budget</th>
                  <th className="text-right">% of budget</th>
                  <th className="text-right">Over</th>
                </tr>
              </thead>
              <tbody>
                {cardStats.map((r) => {
                  const pct = r.budget > 0 ? (r.avgPP / r.budget) * 100 : 0;
                  const pctColor =
                    r.count === 0
                      ? 'text-slate-600'
                      : pct > 100
                      ? 'text-red-400'
                      : pct > 90
                      ? 'text-amber-400'
                      : pct < 60
                      ? 'text-slate-400'
                      : 'text-emerald-400';
                  return (
                    <tr key={r.tier}>
                      <td>
                        <TierBadge tier={r.tier} />
                      </td>
                      <td className="text-right font-mono">{r.count}</td>
                      <td className="text-right font-mono">{r.avgPP.toFixed(1)}</td>
                      <td className="text-right font-mono text-slate-400">{r.budget}</td>
                      <td className={`text-right font-mono ${pctColor}`}>
                        {r.count === 0 ? '—' : `${pct.toFixed(0)}%`}
                      </td>
                      <td
                        className={`text-right font-mono ${
                          r.overBudget > 0 ? 'text-red-400' : 'text-slate-500'
                        }`}
                      >
                        {r.overBudget}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          {/* Outliers */}
          <Panel>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Outliers <span className="text-slate-500 font-normal">(|z| &gt; 1.0 within tier × archetype)</span>
            </h3>
            {outliers.length === 0 ? (
              <div className="text-slate-500 text-sm">
                No statistical outliers. Either balance is tight or sample sizes are still small
                (need ≥3 heroes per bucket).
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Hero</th>
                    <th>Tier</th>
                    <th>Archetype</th>
                    <th className="text-right">PP</th>
                    <th className="text-right">z-score</th>
                    <th>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {outliers.map(({ hero, pp, deviation }) => (
                    <tr key={hero.id}>
                      <td>{hero.name}</td>
                      <td>
                        <TierBadge tier={hero.tier} />
                      </td>
                      <td className="font-mono text-xs">{hero.archetype}</td>
                      <td className="text-right font-mono">{pp.toFixed(1)}</td>
                      <td
                        className={`text-right font-mono ${
                          deviation > 0 ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {deviation > 0 ? '+' : ''}
                        {deviation.toFixed(2)}σ
                      </td>
                      <td className="text-xs text-slate-400">
                        {deviation > 0 ? 'Stronger than peers' : 'Weaker than peers'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          {/* What this doesn't yet do */}
          <Panel className="bg-bg-tertiary/30">
            <div className="text-xs text-slate-400 space-y-2">
              <div className="text-slate-300 font-semibold">Planned additions:</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Win-rate simulation hook (run N fights per matchup; flag imbalances).</li>
                <li>
                  Synergy flag scan — list all heroes/cards whose ability tags match a flagged
                  combo.
                </li>
                <li>Environment diff — see what changed between dev and prod.</li>
                <li>Export to CSV for sharing with designers.</li>
              </ul>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
