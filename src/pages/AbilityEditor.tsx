import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useAuth, canWriteContent } from '../contexts/AuthContext';
import { useConfigBundle } from '../lib/useConfigBundle';
import { calculateAbilityPP } from '../lib/pp-calculator';
import { Button, PageHeader, Panel } from '../components/UI';
import type { Ability } from '../types/database';

type Draft = Omit<Ability, 'id' | 'env_id'>;

const EMPTY: Draft = {
  name: '',
  description: '',
  base_power: 30,
  duration_type: 'instant',
  cooldown_sec: 5,
  target_type: 'single',
  effect_type: 'damage',
};

export default function AbilityEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { currentEnv } = useEnvironment();
  const { role } = useAuth();
  const canEdit = canWriteContent(role);
  const { factors } = useConfigBundle();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      setDraft(EMPTY);
      return;
    }
    supabase
      .from('abilities')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const { id: _i, env_id: _e, created_at: _c, updated_at: _u, ...rest } = data as Record<string, unknown>;
          setDraft(rest as Draft);
        }
      });
  }, [id, isNew]);

  const durationOptions = useMemo(
    () => factors.filter((f) => f.factor_type === 'duration').map((f) => f.factor_key),
    [factors]
  );
  const targetOptions = useMemo(
    () => factors.filter((f) => f.factor_type === 'target').map((f) => f.factor_key),
    [factors]
  );
  const effectOptions = useMemo(
    () => factors.filter((f) => f.factor_type === 'effect_type').map((f) => f.factor_key),
    [factors]
  );

  const ppResult = calculateAbilityPP(draft, factors);

  async function save() {
    if (!currentEnv) return;
    setSaving(true);
    if (isNew) {
      const { data } = await supabase
        .from('abilities')
        .insert({ ...draft, env_id: currentEnv.id })
        .select()
        .single();
      setSaving(false);
      if (data) navigate(`/abilities/${data.id}`);
    } else {
      await supabase.from('abilities').update(draft).eq('id', id);
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'New ability' : draft.name || 'Edit ability'}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/abilities')}>
              Back
            </Button>
            {canEdit && (
              <Button onClick={save} disabled={saving || !draft.name.trim()}>
                {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <Panel>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label>Name</label>
                <input
                  type="text"
                  value={draft.name}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="col-span-2">
                <label>Description</label>
                <textarea
                  value={draft.description ?? ''}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="w-full"
                  rows={2}
                />
              </div>

              <div>
                <label>Base power</label>
                <input
                  type="number"
                  step="1"
                  value={draft.base_power}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, base_power: Number(e.target.value) })}
                  className="w-full font-mono"
                />
              </div>
              <div>
                <label>Cooldown (s)</label>
                <input
                  type="number"
                  step="0.5"
                  value={draft.cooldown_sec}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, cooldown_sec: Number(e.target.value) })}
                  className="w-full font-mono"
                />
              </div>
              <div>
                <label>Effect type</label>
                <select
                  value={draft.effect_type}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, effect_type: e.target.value })}
                >
                  {effectOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Target</label>
                <select
                  value={draft.target_type}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, target_type: e.target.value })}
                >
                  {targetOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Duration</label>
                <select
                  value={draft.duration_type}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, duration_type: e.target.value })}
                >
                  {durationOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right column — live PP breakdown */}
        <Panel>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">PP Breakdown</h3>
          <div className="font-mono text-sm space-y-1 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">base_power</span>
              <span>{ppResult.breakdown.base.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">× duration</span>
              <span>{ppResult.breakdown.duration.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">× cooldown inv</span>
              <span>{ppResult.breakdown.cooldown.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">× target</span>
              <span>{ppResult.breakdown.target.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">× effect</span>
              <span>{ppResult.breakdown.effect.toFixed(2)}</span>
            </div>
            <div className="border-t border-border mt-3 pt-3 flex justify-between text-lg font-semibold text-emerald-400">
              <span>Total PP</span>
              <span>{ppResult.total.toFixed(1)}</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
