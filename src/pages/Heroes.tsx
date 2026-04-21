import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useAuth, canWriteContent } from '../contexts/AuthContext';
import { useConfigBundle, budgetFor } from '../lib/useConfigBundle';
import { calculateHeroPP, budgetStatus, budgetColor } from '../lib/pp-calculator';
import { Button, PageHeader, Panel, EmptyState, TierBadge } from '../components/UI';
import type { Hero } from '../types/database';

export default function Heroes() {
  const { currentEnv } = useEnvironment();
  const { role } = useAuth();
  const canEdit = canWriteContent(role);
  const navigate = useNavigate();
  const { coefficients, factors, budgets, abilityById } = useConfigBundle();
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!currentEnv) return;
    setLoading(true);
    const { data } = await supabase
      .from('heroes')
      .select('*')
      .eq('env_id', currentEnv.id)
      .order('name');
    setHeroes((data ?? []) as Hero[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [currentEnv?.id]);

  async function remove(id: string) {
    if (!confirm('Delete this hero?')) return;
    await supabase.from('heroes').delete().eq('id', id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Heroes"
        actions={
          canEdit && <Button onClick={() => navigate('/heroes/new')}>+ New hero</Button>
        }
      />
      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : heroes.length === 0 ? (
        <EmptyState
          message="No heroes yet."
          action={canEdit && <Button onClick={() => navigate('/heroes/new')}>Create one</Button>}
        />
      ) : (
        <Panel>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Tier</th>
                <th>Archetype</th>
                <th className="text-right">PP Used</th>
                <th className="text-right">Budget</th>
                <th className="text-right">Status</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {heroes.map((h) => {
                const { total } = calculateHeroPP(h, coefficients, factors, abilityById);
                const budget = budgetFor(budgets, h.tier, 'hero');
                const status = budgetStatus(total, budget);
                return (
                  <tr key={h.id}>
                    <td>
                      <Link to={`/heroes/${h.id}`} className="text-accent hover:underline">
                        {h.name}
                      </Link>
                    </td>
                    <td>
                      <TierBadge tier={h.tier} />
                    </td>
                    <td className="font-mono text-xs">{h.archetype}</td>
                    <td className="text-right font-mono">{total.toFixed(1)}</td>
                    <td className="text-right font-mono text-slate-400">{budget}</td>
                    <td className={`text-right font-mono font-semibold ${budgetColor(status)}`}>
                      {status.toUpperCase()}
                    </td>
                    <td>
                      {canEdit && (
                        <Button variant="ghost" onClick={() => remove(h.id)}>
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
