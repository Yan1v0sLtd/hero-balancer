import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useAuth, canWriteContent } from '../contexts/AuthContext';
import { useConfigBundle, budgetFor } from '../lib/useConfigBundle';
import {
  calculateStatPP,
  calculateAbilityPP,
  budgetStatus,
  checkArchetypeConstraints,
} from '../lib/pp-calculator';
import { Button, PageHeader, Panel, PPBar } from '../components/UI';
import { ARCHETYPES, TIERS } from '../types/database';
import type { Hero, Tier, Archetype, ArchetypeRule } from '../types/database';

type Draft = Omit<Hero, 'id' | 'env_id'>;

const EMPTY: Draft = {
  name: '',
  tier: 'common',
  archetype: 'tank',
  base_stats: { hp: 100, atk: 10, def: 10, spd: 5, crit_pct: 5, crit_dmg_pct: 50 },
  passive_ability_id: null,
  notes: '',
};

export default function HeroEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { currentEnv } = useEnvironment();
  const { role } = useAuth();
  const canEdit = canWriteContent(role);
  const { coefficients, factors, budgets, abilities, abilityById } = useConfigBundle();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [archetypeRules, setArchetypeRules] = useState<ArchetypeRule[]>([]);

  useEffect(() => {
    if (isNew) {
      setDraft(EMPTY);
      return;
    }
    supabase
      .from('heroes')
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

  useEffect(() => {
    if (!currentEnv) return;
    supabase
      .from('archetypes')
      .select('*')
      .eq('env_id', currentEnv.id)
      .then(({ data }) => setArchetypeRules((data ?? []) as ArchetypeRule[]));
  }, [currentEnv?.id]);

  // ----- Derived PP -----
  const statResult = useMemo(
    () => calculateStatPP(draft.base_stats, coefficients),
    [draft.base_stats, coefficients]
  );
  const passiveAbility = draft.passive_ability_id ? abilityById.get(draft.passive_ability_id) : null;
  const passivePP = passiveAbility ? calculateAbilityPP(passiveAbility, factors).total : 0;
  const totalPP = statResult.total + passivePP;
  const budget = budgetFor(budgets, draft.tier, 'hero');
  const status = budgetStatus(totalPP, budget);

  const currentRule = archetypeRules.find((r) => r.name === draft.archetype);
  const archCheck = currentRule
    ? checkArchetypeConstraints(statResult.breakdown, currentRule)
    : null;

  function setStat(stat: string, value: number) {
    setDraft({ ...draft, base_stats: { ...draft.base_stats, [stat]: value } });
  }

  async function save() {
    if (!currentEnv) return;
    setSaving(true);
    if (isNew) {
      const { data } = await supabase
        .from('heroes')
        .insert({ ...draft, env_id: currentEnv.id })
        .select()
        .single();
      setSaving(false);
      if (data) navigate(`/heroes/${data.id}`);
    } else {
      await supabase.from('heroes').update(draft).eq('id', id);
      setSaving(false);
    }
  }

  // Ensure all coefficient stats have an input row
  const allStatNames = Array.from(
    new Set([...coefficients.map((c) => c.stat_name), ...Object.keys(draft.base_stats)])
  );

  return (
    <div>
      <PageHeader
        title={isNew ? 'New hero' : draft.name || 'Edit hero'}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/heroes')}>
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
                <label>Archetype</label>
                <select
                  value={draft.archetype}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setDraft({ ...draft, archetype: e.target.value as Archetype })
                  }
                >
                  {ARCHETYPES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label>Passive ability</label>
                <select
                  value={draft.passive_ability_id ?? ''}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setDraft({ ...draft, passive_ability_id: e.target.value || null })
                  }
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

          <Panel>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Base stats</h3>
            <table>
              <thead>
                <tr>
                  <th>Stat</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">× Coef</th>
                  <th className="text-right">PP</th>
                </tr>
              </thead>
              <tbody>
                {allStatNames.map((stat) => {
                  const coef = coefficients.find((c) => c.stat_name === stat)?.pp_per_unit ?? 0;
                  const value = Number(draft.base_stats[stat] ?? 0);
                  const pp = value * coef;
                  return (
                    <tr key={stat}>
                      <td className="font-mono">{stat}</td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="1"
                          disabled={!canEdit}
                          value={value}
                          onChange={(e) => setStat(stat, Number(e.target.value))}
                          className="w-24 text-right font-mono"
                        />
                      </td>
                      <td className="text-right font-mono text-slate-500">{coef.toFixed(2)}</td>
                      <td className="text-right font-mono">{pp.toFixed(1)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={3} className="text-right font-semibold text-slate-400">
                    Stat PP subtotal
                  </td>
                  <td className="text-right font-mono font-semibold text-emerald-400">
                    {statResult.total.toFixed(1)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right font-semibold text-slate-400">
                    Passive ability PP
                  </td>
                  <td className="text-right font-mono font-semibold text-emerald-400">
                    {passivePP.toFixed(1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Right column — live budget tracker + archetype check */}
        <div className="space-y-4">
          <Panel>
            <PPBar used={totalPP} budget={budget} status={status} />
            <div className="text-xs text-slate-400 mt-3">
              Tier budget for <span className="font-mono uppercase">{draft.tier}</span> hero: {budget} PP.
            </div>
          </Panel>

          {currentRule && archCheck && (
            <Panel>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                Archetype check: <span className="font-mono">{currentRule.name}</span>
              </h3>
              <div className="text-xs space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span>Offense %</span>
                  <span className="font-mono">
                    {archCheck.offensePct.toFixed(0)}%{' '}
                    <span className="text-slate-500">
                      (allowed {currentRule.min_offense_pct}–{currentRule.max_offense_pct})
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Defense %</span>
                  <span className="font-mono">
                    {archCheck.defensePct.toFixed(0)}%{' '}
                    <span className="text-slate-500">
                      (allowed {currentRule.min_defense_pct}–{currentRule.max_defense_pct})
                    </span>
                  </span>
                </div>
                {archCheck.violations.length > 0 ? (
                  <div className="mt-2 p-2 bg-amber-950/40 border border-amber-900/60 rounded text-amber-300">
                    <div className="font-semibold mb-1">Violations:</div>
                    <ul className="list-disc pl-4">
                      {archCheck.violations.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-emerald-400 text-xs">Within archetype rules ✓</div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
