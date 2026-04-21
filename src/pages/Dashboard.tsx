import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { PageHeader, Panel } from '../components/UI';

interface Counts {
  heroes: number;
  cards: number;
  abilities: number;
}

export default function Dashboard() {
  const { currentEnv } = useEnvironment();
  const [counts, setCounts] = useState<Counts>({ heroes: 0, cards: 0, abilities: 0 });

  useEffect(() => {
    if (!currentEnv) return;
    (async () => {
      const [h, c, a] = await Promise.all([
        supabase.from('heroes').select('id', { count: 'exact', head: true }).eq('env_id', currentEnv.id),
        supabase.from('cards').select('id', { count: 'exact', head: true }).eq('env_id', currentEnv.id),
        supabase
          .from('abilities')
          .select('id', { count: 'exact', head: true })
          .eq('env_id', currentEnv.id),
      ]);
      setCounts({ heroes: h.count ?? 0, cards: c.count ?? 0, abilities: a.count ?? 0 });
    })();
  }, [currentEnv?.id]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Environment: ${currentEnv?.name ?? '—'}`}
      />
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Heroes" value={counts.heroes} to="/heroes" />
        <StatCard label="Cards" value={counts.cards} to="/cards" />
        <StatCard label="Abilities" value={counts.abilities} to="/abilities" />
      </div>

      <Panel>
        <h2 className="text-lg font-semibold mb-3">Getting started</h2>
        <ol className="text-sm text-slate-300 space-y-2 list-decimal pl-5">
          <li>
            Review <Link className="text-accent hover:underline" to="/coefficients">stat coefficients</Link> and{' '}
            <Link className="text-accent hover:underline" to="/budgets">PP budgets</Link> — these drive every calculation.
          </li>
          <li>
            Create a few <Link className="text-accent hover:underline" to="/abilities">abilities</Link> to reuse across heroes and cards.
          </li>
          <li>
            Build <Link className="text-accent hover:underline" to="/heroes">heroes</Link> and{' '}
            <Link className="text-accent hover:underline" to="/cards">cards</Link> — the PP bar shows budget usage in real time.
          </li>
          <li>
            Use the <Link className="text-accent hover:underline" to="/ledger">power ledger</Link> to spot outliers across tiers.
          </li>
        </ol>
      </Panel>
    </div>
  );
}

function StatCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link
      to={to}
      className="block bg-bg-secondary border border-border rounded-lg p-6 hover:border-accent transition-colors"
    >
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </Link>
  );
}
