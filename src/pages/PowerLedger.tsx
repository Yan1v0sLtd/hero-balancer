import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useConfigBundle, budgetFor } from '../lib/useConfigBundle';
import {
  calculateHeroPP,
  calculateCardPP,
  budgetStatus,
  budgetColor,
} from '../lib/pp-calculator';
import { PageHeader, Panel, TierBadge } from '../components/UI';
import { TIERS } from '../types/database';
import type { Hero, Card, Tier } from '../types/database';

type LedgerRow = {
  id: string;
  kind: 'hero' | 'card';
  name: string;
  tier: Tier;
  subcategory: string; // archetype or card_type
  pp: number;
  budget: number;
};

export default function PowerLedger() {
  const { currentEnv } = useEnvironment();
  const { coefficients, factors, budgets, abilityById } = useConfigBundle();
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [filter, setFilter] = useState<'all' | 'hero' | 'card'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | Tier>('all');
  const [sort, setSort] = useState<'pp_desc' | 'pp_asc' | 'name' | 'delta'>('delta');

  useEffect(() => {
    if (!currentEnv) return;
    (async () => {
      const [h, c] = await Promise.all([
        supabase.from('heroes').select('*').eq('env_id', currentEnv.id),
        supabase.from('cards').select('*').eq('env_id', currentEnv.id),
      ]);
      setHeroes((h.data ?? []) as Hero[]);
      setCards((c.data ?? []) as Card[]);
    })();
  }, [currentEnv?.id]);

  const rows: LedgerRow[] = useMemo(() => {
    const heroRows: LedgerRow[] = heroes.map((h) => ({
      id: h.id,
      kind: 'hero',
      name: h.name,
      tier: h.tier,
      subcategory: h.archetype,
      pp: calculateHeroPP(h, coefficients, factors, abilityById).total,
      budget: budgetFor(budgets, h.tier, 'hero'),
    }));
    const cardRows: LedgerRow[] = cards.map((c) => ({
      id: c.id,
      kind: 'card',
      name: c.name,
      tier: c.tier,
      subcategory: c.card_type,
      pp: calculateCardPP(c, factors, abilityById),
      budget: budgetFor(budgets, c.tier, 'card'),
    }));
    return [...heroRows, ...cardRows];
  }, [heroes, cards, coefficients, factors, budgets, abilityById]);

  const filtered = rows
    .filter((r) => (filter === 'all' ? true : r.kind === filter))
    .filter((r) => (tierFilter === 'all' ? true : r.tier === tierFilter));

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'pp_desc') return b.pp - a.pp;
    if (sort === 'pp_asc') return a.pp - b.pp;
    if (sort === 'name') return a.name.localeCompare(b.name);
    // delta: biggest absolute delta from budget first — outliers surface
    return Math.abs(b.pp - b.budget) - Math.abs(a.pp - a.budget);
  });

  // Tier summary
  const tierSummary = TIERS.map((tier) => {
    const tierHeroes = heroes.filter((h) => h.tier === tier);
    const tierCards = cards.filter((c) => c.tier === tier);
    const heroAvg = tierHeroes.length
      ? tierHeroes.reduce(
          (s, h) => s + calculateHeroPP(h, coefficients, factors, abilityById).total,
          0
        ) / tierHeroes.length
      : 0;
    const cardAvg = tierCards.length
      ? tierCards.reduce((s, c) => s + calculateCardPP(c, factors, abilityById), 0) /
        tierCards.length
      : 0;
    return {
      tier,
      heroCount: tierHeroes.length,
      heroAvg,
      heroBudget: budgetFor(budgets, tier, 'hero'),
      cardCount: tierCards.length,
      cardAvg,
      cardBudget: budgetFor(budgets, tier, 'card'),
    };
  });

  return (
    <div>
      <PageHeader
        title="Power Ledger"
        description="All heroes and cards ranked. Sort by delta-from-budget to spot outliers."
      />

      <Panel className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Tier averages</h3>
        <table>
          <thead>
            <tr>
              <th>Tier</th>
              <th className="text-right">Heroes</th>
              <th className="text-right">Avg Hero PP</th>
              <th className="text-right">Hero Budget</th>
              <th className="text-right">Cards</th>
              <th className="text-right">Avg Card PP</th>
              <th className="text-right">Card Budget</th>
            </tr>
          </thead>
          <tbody>
            {tierSummary.map((t) => (
              <tr key={t.tier}>
                <td>
                  <TierBadge tier={t.tier} />
                </td>
                <td className="text-right font-mono">{t.heroCount}</td>
                <td className="text-right font-mono">{t.heroAvg.toFixed(1)}</td>
                <td className="text-right font-mono text-slate-400">{t.heroBudget}</td>
                <td className="text-right font-mono">{t.cardCount}</td>
                <td className="text-right font-mono">{t.cardAvg.toFixed(1)}</td>
                <td className="text-right font-mono text-slate-400">{t.cardBudget}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel>
        <div className="flex gap-2 mb-4">
          <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | 'hero' | 'card')}>
            <option value="all">All types</option>
            <option value="hero">Heroes</option>
            <option value="card">Cards</option>
          </select>
          <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as 'all' | Tier)}>
            <option value="all">All tiers</option>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="delta">Sort: outliers first</option>
            <option value="pp_desc">Sort: PP desc</option>
            <option value="pp_asc">Sort: PP asc</option>
            <option value="name">Sort: name</option>
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th>Tier</th>
              <th>Category</th>
              <th className="text-right">PP</th>
              <th className="text-right">Budget</th>
              <th className="text-right">Δ</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const status = budgetStatus(r.pp, r.budget);
              const delta = r.pp - r.budget;
              const deltaColor =
                delta > 0 ? 'text-red-400' : delta < -budgetFor([], '', 'hero') * 0.3 ? 'text-slate-500' : 'text-slate-300';
              return (
                <tr key={`${r.kind}-${r.id}`}>
                  <td>
                    <Link
                      to={`/${r.kind === 'hero' ? 'heroes' : 'cards'}/${r.id}`}
                      className="text-accent hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="font-mono text-xs uppercase text-slate-400">{r.kind}</td>
                  <td>
                    <TierBadge tier={r.tier} />
                  </td>
                  <td className="font-mono text-xs">{r.subcategory}</td>
                  <td className="text-right font-mono">{r.pp.toFixed(1)}</td>
                  <td className="text-right font-mono text-slate-400">{r.budget}</td>
                  <td className={`text-right font-mono ${deltaColor}`}>
                    {delta > 0 ? '+' : ''}
                    {delta.toFixed(1)}
                  </td>
                  <td className={`text-right font-mono font-semibold ${budgetColor(status)}`}>
                    {status.toUpperCase()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
