import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useAuth, canWriteConfig } from '../contexts/AuthContext';
import { PageHeader, Panel, TierBadge } from '../components/UI';
import { TIERS } from '../types/database';
import type { PPBudget } from '../types/database';

export default function Budgets() {
  const { currentEnv } = useEnvironment();
  const { role } = useAuth();
  const canEdit = canWriteConfig(role);
  const [rows, setRows] = useState<PPBudget[]>([]);

  async function load() {
    if (!currentEnv) return;
    const { data } = await supabase
      .from('pp_budgets')
      .select('*')
      .eq('env_id', currentEnv.id);
    setRows((data ?? []) as PPBudget[]);
  }

  useEffect(() => {
    load();
  }, [currentEnv?.id]);

  async function save(id: string, budget: number) {
    await supabase.from('pp_budgets').update({ budget }).eq('id', id);
    load();
  }

  const heroBudgets = rows.filter((r) => r.entity_type === 'hero');
  const cardBudgets = rows.filter((r) => r.entity_type === 'card');

  return (
    <div>
      <PageHeader
        title="PP Budgets"
        description="The maximum PP a hero or card can spend, per rarity tier."
      />
      {!canEdit && (
        <div className="mb-4 text-sm text-amber-400 bg-amber-950/40 border border-amber-900/60 rounded p-3">
          Read-only: only admins can edit global configuration.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <BudgetTable title="Hero budgets" rows={heroBudgets} canEdit={canEdit} onSave={save} />
        <BudgetTable title="Card budgets" rows={cardBudgets} canEdit={canEdit} onSave={save} />
      </div>
    </div>
  );
}

function BudgetTable({
  title,
  rows,
  canEdit,
  onSave,
}: {
  title: string;
  rows: PPBudget[];
  canEdit: boolean;
  onSave: (id: string, budget: number) => void;
}) {
  const byTier = new Map(rows.map((r) => [r.tier, r]));
  return (
    <Panel>
      <h3 className="text-sm font-semibold text-slate-300 mb-3">{title}</h3>
      <table>
        <thead>
          <tr>
            <th>Tier</th>
            <th className="text-right">PP Budget</th>
          </tr>
        </thead>
        <tbody>
          {TIERS.map((tier) => {
            const row = byTier.get(tier);
            return (
              <tr key={tier}>
                <td>
                  <TierBadge tier={tier} />
                </td>
                <td className="text-right">
                  {row ? (
                    <input
                      type="number"
                      step="1"
                      disabled={!canEdit}
                      defaultValue={row.budget}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== row.budget) onSave(row.id, v);
                      }}
                      className="w-24 text-right font-mono"
                    />
                  ) : (
                    <span className="text-slate-500 text-xs italic">no row</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
