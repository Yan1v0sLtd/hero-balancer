import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useAuth, canWriteConfig } from '../contexts/AuthContext';
import { Button, PageHeader, Panel } from '../components/UI';
import type { AbilityFactor, FactorType } from '../types/database';

const TYPES: FactorType[] = ['duration', 'target', 'effect_type'];

export default function Factors() {
  const { currentEnv } = useEnvironment();
  const { role } = useAuth();
  const canEdit = canWriteConfig(role);
  const [rows, setRows] = useState<AbilityFactor[]>([]);
  const [newRow, setNewRow] = useState({
    factor_type: 'duration' as FactorType,
    factor_key: '',
    factor_value: '1.0',
  });

  async function load() {
    if (!currentEnv) return;
    const { data } = await supabase
      .from('ability_factors')
      .select('*')
      .eq('env_id', currentEnv.id)
      .order('factor_type')
      .order('factor_key');
    setRows((data ?? []) as AbilityFactor[]);
  }

  useEffect(() => {
    load();
  }, [currentEnv?.id]);

  async function save(id: string, patch: Partial<AbilityFactor>) {
    await supabase.from('ability_factors').update(patch).eq('id', id);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this factor?')) return;
    await supabase.from('ability_factors').delete().eq('id', id);
    load();
  }

  async function add() {
    if (!currentEnv || !newRow.factor_key.trim()) return;
    await supabase.from('ability_factors').insert({
      env_id: currentEnv.id,
      factor_type: newRow.factor_type,
      factor_key: newRow.factor_key.trim().toLowerCase(),
      factor_value: Number(newRow.factor_value) || 0,
    });
    setNewRow({ ...newRow, factor_key: '', factor_value: '1.0' });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Ability Factors"
        description="Multipliers used in the ability PP formula."
      />
      {!canEdit && (
        <div className="mb-4 text-sm text-amber-400 bg-amber-950/40 border border-amber-900/60 rounded p-3">
          Read-only: only admins can edit global configuration.
        </div>
      )}

      <Panel className="mb-6">
        <div className="font-mono text-xs text-slate-400 mb-3 p-3 bg-bg-tertiary rounded">
          ability_pp = base_power × duration × (10 / (cooldown + 1)) × target × effect_type
        </div>
        {TYPES.map((type) => (
          <div key={type} className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              {type.replace('_', ' ')}
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th className="text-right">Multiplier</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => r.factor_type === type)
                  .map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono">{r.factor_key}</td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="0.1"
                          disabled={!canEdit}
                          defaultValue={r.factor_value}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== r.factor_value) save(r.id, { factor_value: v });
                          }}
                          className="w-24 text-right font-mono"
                        />
                      </td>
                      <td>
                        {canEdit && (
                          <Button variant="ghost" onClick={() => remove(r.id)}>
                            Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </Panel>

      {canEdit && (
        <Panel>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Add factor</h3>
          <div className="flex gap-2 items-end">
            <div>
              <label>Type</label>
              <select
                value={newRow.factor_type}
                onChange={(e) => setNewRow({ ...newRow, factor_type: e.target.value as FactorType })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label>Key</label>
              <input
                type="text"
                placeholder="e.g. 10s or line"
                value={newRow.factor_key}
                onChange={(e) => setNewRow({ ...newRow, factor_key: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="w-32">
              <label>Multiplier</label>
              <input
                type="number"
                step="0.1"
                value={newRow.factor_value}
                onChange={(e) => setNewRow({ ...newRow, factor_value: e.target.value })}
                className="w-full text-right font-mono"
              />
            </div>
            <Button onClick={add}>Add</Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
