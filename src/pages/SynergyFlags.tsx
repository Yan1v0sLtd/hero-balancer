import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useAuth, canWriteContent } from '../contexts/AuthContext';
import { Button, PageHeader, Panel, EmptyState } from '../components/UI';

type Risk = 'low' | 'medium' | 'high' | 'critical';

interface SynergyFlag {
  id: string;
  env_id: string;
  combo: string[];
  risk_level: Risk;
  note: string | null;
}

const RISK_COLOR: Record<Risk, string> = {
  low: 'text-slate-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

export default function SynergyFlags() {
  const { currentEnv } = useEnvironment();
  const { role } = useAuth();
  const canEdit = canWriteContent(role);
  const [flags, setFlags] = useState<SynergyFlag[]>([]);
  const [loading, setLoading] = useState(false);

  const [combo, setCombo] = useState('');
  const [risk, setRisk] = useState<Risk>('medium');
  const [note, setNote] = useState('');

  async function load() {
    if (!currentEnv) return;
    setLoading(true);
    const { data } = await supabase
      .from('synergy_flags')
      .select('*')
      .eq('env_id', currentEnv.id)
      .order('created_at', { ascending: false });
    setFlags((data ?? []) as SynergyFlag[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [currentEnv?.id]);

  async function add() {
    if (!currentEnv) return;
    const tags = combo
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (tags.length < 2) {
      alert('Enter at least two ability tags, comma-separated.');
      return;
    }
    await supabase.from('synergy_flags').insert({
      env_id: currentEnv.id,
      combo: tags,
      risk_level: risk,
      note: note || null,
    });
    setCombo('');
    setNote('');
    setRisk('medium');
    load();
  }

  async function remove(id: string) {
    if (!confirm('Remove this flag?')) return;
    await supabase.from('synergy_flags').delete().eq('id', id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Synergy Flags"
        description="Phase 4 scaffold. Flag ability combos that break balance even when within PP budget. Warnings only — the system does not auto-block."
      />

      {canEdit && (
        <Panel className="mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Add a flag</h3>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5">
              <label>Combo (comma-separated tags)</label>
              <input
                type="text"
                placeholder="stealth, aoe_burst"
                value={combo}
                onChange={(e) => setCombo(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="col-span-2">
              <label>Risk</label>
              <select value={risk} onChange={(e) => setRisk(e.target.value as Risk)}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </div>
            <div className="col-span-4">
              <label>Note</label>
              <input
                type="text"
                placeholder="Why this combo is problematic"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="col-span-1 flex items-end">
              <Button className="w-full" onClick={add}>
                Add
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : flags.length === 0 ? (
        <EmptyState message="No synergy flags defined yet." />
      ) : (
        <Panel>
          <table>
            <thead>
              <tr>
                <th>Combo</th>
                <th>Risk</th>
                <th>Note</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.id}>
                  <td className="font-mono text-xs">{(f.combo ?? []).join(' + ')}</td>
                  <td className={`font-mono text-xs font-semibold ${RISK_COLOR[f.risk_level]}`}>
                    {f.risk_level.toUpperCase()}
                  </td>
                  <td className="text-slate-400">{f.note ?? '—'}</td>
                  <td>
                    {canEdit && (
                      <Button variant="ghost" onClick={() => remove(f.id)}>
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel className="mt-4 bg-bg-tertiary/30">
        <div className="text-xs text-slate-400 space-y-2">
          <div>
            <span className="text-slate-300 font-semibold">Phase 4 roadmap:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Attach machine-readable tags (e.g. <code>stealth</code>, <code>aoe</code>,{' '}
              <code>stun</code>) to abilities in the ability editor.
            </li>
            <li>
              Auto-scan heroes and cards for tag combos that match flags, and surface warnings in
              the editor and power ledger.
            </li>
            <li>Export a weekly balance report listing all triggered flags per tier.</li>
          </ul>
        </div>
      </Panel>
    </div>
  );
}
