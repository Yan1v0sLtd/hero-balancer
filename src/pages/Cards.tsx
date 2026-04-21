import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useAuth, canWriteContent } from '../contexts/AuthContext';
import { useConfigBundle, budgetFor } from '../lib/useConfigBundle';
import { calculateCardPP, budgetStatus, budgetColor } from '../lib/pp-calculator';
import { Button, PageHeader, Panel, EmptyState, TierBadge } from '../components/UI';
import type { Card } from '../types/database';

export default function Cards() {
  const { currentEnv } = useEnvironment();
  const { role } = useAuth();
  const canEdit = canWriteContent(role);
  const navigate = useNavigate();
  const { factors, budgets, abilityById } = useConfigBundle();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!currentEnv) return;
    setLoading(true);
    const { data } = await supabase
      .from('cards')
      .select('*')
      .eq('env_id', currentEnv.id)
      .order('name');
    setCards((data ?? []) as Card[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [currentEnv?.id]);

  async function remove(id: string) {
    if (!confirm('Delete this card?')) return;
    await supabase.from('cards').delete().eq('id', id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Cards"
        actions={canEdit && <Button onClick={() => navigate('/cards/new')}>+ New card</Button>}
      />
      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : cards.length === 0 ? (
        <EmptyState
          message="No cards yet."
          action={canEdit && <Button onClick={() => navigate('/cards/new')}>Create one</Button>}
        />
      ) : (
        <Panel>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Tier</th>
                <th>Type</th>
                <th>Ability</th>
                <th className="text-right">PP Used</th>
                <th className="text-right">Budget</th>
                <th className="text-right">Status</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => {
                const pp = calculateCardPP(c, factors, abilityById);
                const budget = budgetFor(budgets, c.tier, 'card');
                const status = budgetStatus(pp, budget);
                const ability = c.ability_id ? abilityById.get(c.ability_id) : null;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/cards/${c.id}`} className="text-accent hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td>
                      <TierBadge tier={c.tier} />
                    </td>
                    <td className="font-mono text-xs">{c.card_type}</td>
                    <td className="text-xs text-slate-400">{ability?.name ?? '—'}</td>
                    <td className="text-right font-mono">{pp.toFixed(1)}</td>
                    <td className="text-right font-mono text-slate-400">{budget}</td>
                    <td className={`text-right font-mono font-semibold ${budgetColor(status)}`}>
                      {status.toUpperCase()}
                    </td>
                    <td>
                      {canEdit && (
                        <Button variant="ghost" onClick={() => remove(c.id)}>
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
