import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useAuth, canWriteConfig } from '../contexts/AuthContext';
import { Button, PageHeader, Panel } from '../components/UI';
import type { StatCoefficient } from '../types/database';

export default function Coefficients() {
  const { currentEnv } = useEnvironment();
  const { role } = useAuth();
  const canEdit = canWriteConfig(role);
  const [rows, setRows] = useState<StatCoefficient[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newStat, setNewStat] = useState({ stat_name: '', pp_per_unit: '1.0' });

  async function load() {
    if (!currentEnv) return;
    setLoading(true);
    const { data } = await supabase
      .from('stat_coefficients')
      .select('*')
      .eq('env_id', currentEnv.id)
      .order('stat_name');
    setRows((data ?? []) as StatCoefficient[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [currentEnv?.id]);

  async function save(row: StatCoefficient, patch: Partial<StatCoefficient>) {
    setSaving(true);
    await supabase.from('stat_coefficients').update(patch).eq('id', row.id);
    setSaving(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this coefficient? Existing heroes will recalculate with it missing.')) return;
    await supabase.from('stat_coefficients').delete().eq('id', id);
    load();
  }

  async function add() {
    if (!currentEnv || !newStat.stat_name.trim()) return;
    setSaving(true);
    await supabase.from('stat_coefficients').insert({
      env_id: currentEnv.id,
      stat_name: newStat.stat_name.trim().toLowerCase(),
      pp_per_unit: Number(newStat.pp_per_unit) || 0,
    });
    setSaving(false);
    setNewStat({ stat_name: '', pp_per_unit: '1.0' });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Stat Coefficients"
        description="PP cost per unit of each stat. Core balance lever — tune carefully."
      />
      {!canEdit && (
        <div className="mb-4 text-sm text-amber-400 bg-amber-950/40 border border-amber-900/60 rounded p-3">
          Read-only: only admins can edit global configuration.
        </div>
      )}

      <Panel className="mb-6">
        <table>
          <thead>
            <tr>
              <th>Stat</th>
              <th className="text-right">PP / unit</th>
              <th>Notes</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-500 py-8">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-500 py-8">
                  No coefficients yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono">{r.stat_name}</td>
                  <td className="text-right">
                    <input
                      type="number"
                      step="0.01"
                      disabled={!canEdit}
                      defaultValue={r.pp_per_unit}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== r.pp_per_unit) save(r, { pp_per_unit: v });
                      }}
                      className="w-24 text-right font-mono"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      disabled={!canEdit}
                      defaultValue={r.notes ?? ''}
                      onBlur={(e) => {
                        if (e.target.value !== (r.notes ?? '')) save(r, { notes: e.target.value });
                      }}
                      className="w-full"
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
              ))
            )}
          </tbody>
        </table>
      </Panel>

      {canEdit && (
        <Panel>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Add stat</h3>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label>Stat name</label>
              <input
                type="text"
                placeholder="e.g. dodge_pct"
                value={newStat.stat_name}
                onChange={(e) => setNewStat({ ...newStat, stat_name: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="w-32">
              <label>PP / unit</label>
              <input
                type="number"
                step="0.01"
                value={newStat.pp_per_unit}
                onChange={(e) => setNewStat({ ...newStat, pp_per_unit: e.target.value })}
                className="w-full text-right font-mono"
              />
            </div>
            <Button onClick={add} disabled={saving}>
              Add
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
