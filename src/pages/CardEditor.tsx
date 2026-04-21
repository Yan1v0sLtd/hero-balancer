import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useAuth, canWriteContent } from '../contexts/AuthContext';
import { useConfigBundle, budgetFor } from '../lib/useConfigBundle';
import { calculateCardPP, budgetStatus } from '../lib/pp-calculator';
import { Button, PageHeader, Panel, PPBar } from '../components/UI';
import { CARD_TYPES, TIERS } from '../types/database';
import type { Card, CardType, Tier } from '../types/database';

type Draft = Omit<Card, 'id' | 'env_id'>;

const EMPTY: Draft = {
  name: '',
  tier: 'common',
  card_type: 'attack',
  ability_id: null,
  notes: '',
};

export default function CardEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { currentEnv } = useEnvironment();
  const { role } = useAuth();
  const canEdit = canWriteContent(role);
  const { factors, budgets, abilities, abilityById } = useConfigBundle();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      setDraft(EMPTY);
      return;
    }
    supabase
      .from('cards')
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

  const pp = calculateCardPP(draft, factors, abilityById);
  const budget = budgetFor(budgets, draft.tier, 'card');
  const status = budgetStatus(pp, budget);
  const ability = draft.ability_id ? abilityById.get(draft.ability_id) : null;

  async function save() {
    if (!currentEnv) return;
    setSaving(true);
    if (isNew) {
      const { data } = await supabase
        .from('cards')
        .insert({ ...draft, env_id: currentEnv.id })
        .select()
        .single();
      setSaving(false);
      if (data) navigate(`/cards/${data.id}`);
    } else {
      await supabase.from('cards').update(draft).eq('id', id);
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'New card' : draft.name || 'Edit card'}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/cards')}>
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
              <div>
                <label>Tier</label>
                <select
                  value={draft.tier}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, tier: e.target.value as Tier })}
                >
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Card type</label>
                <select
                  value={draft.card_type}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, card_type: e.target.value as CardType })}
                >
                  {CARD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label>Ability</label>
                <select
                  value={draft.ability_id ?? ''}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, ability_id: e.target.value || null })}
                >
                  <option value="">— None —</option>
                  {abilities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label>Notes</label>
                <textarea
                  value={draft.notes ?? ''}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="w-full"
                  rows={2}
                />
              </div>
            </div>
          </Panel>

          {ability && (
            <Panel>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                Linked ability: {ability.name}
              </h3>
              <div className="grid grid-cols-4 gap-3 font-mono text-xs text-slate-300">
                <div>
                  <div className="text-slate-500">Effect</div>
                  {ability.effect_type}
                </div>
                <div>
                  <div className="text-slate-500">Target</div>
                  {ability.target_type}
                </div>
                <div>
                  <div className="text-slate-500">Duration</div>
                  {ability.duration_type}
                </div>
                <div>
                  <div className="text-slate-500">CD</div>
                  {ability.cooldown_sec}s
                </div>
              </div>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/abilities/${ability.id}`)}
                >
                  Edit ability
                </Button>
              </div>
            </Panel>
          )}
        </div>

        <Panel>
          <PPBar used={pp} budget={budget} status={status} />
          <div className="text-xs text-slate-400 mt-3">
            Tier budget for <span className="font-mono uppercase">{draft.tier}</span> card: {budget} PP.
          </div>
        </Panel>
      </div>
    </div>
  );
}
