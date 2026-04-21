import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useAuth, canWriteContent } from '../contexts/AuthContext';
import { useConfigBundle } from '../lib/useConfigBundle';
import { calculateAbilityPP } from '../lib/pp-calculator';
import { Button, PageHeader, Panel, EmptyState } from '../components/UI';
import type { Ability } from '../types/database';

export default function Abilities() {
  const { currentEnv } = useEnvironment();
  const { role } = useAuth();
  const canEdit = canWriteContent(role);
  const navigate = useNavigate();
  const { factors } = useConfigBundle();
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!currentEnv) return;
    setLoading(true);
    const { data } = await supabase
      .from('abilities')
      .select('*')
      .eq('env_id', currentEnv.id)
      .order('name');
    setAbilities((data ?? []) as Ability[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [currentEnv?.id]);

  async function remove(id: string) {
    if (!confirm('Delete this ability? It will be unlinked from any heroes/cards using it.')) return;
    await supabase.from('abilities').delete().eq('id', id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Abilities"
        description="Reusable ability definitions. Used by hero passives and cards."
        actions={
          canEdit && (
            <Button onClick={() => navigate('/abilities/new')}>+ New ability</Button>
          )
        }
      />

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : abilities.length === 0 ? (
        <EmptyState
          message="No abilities yet."
          action={canEdit && <Button onClick={() => navigate('/abilities/new')}>Create one</Button>}
        />
      ) : (
        <Panel>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Effect</th>
                <th>Target</th>
                <th>Duration</th>
                <th className="text-right">Base Power</th>
                <th className="text-right">CD (s)</th>
                <th className="text-right">PP</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {abilities.map((a) => {
                const pp = calculateAbilityPP(a, factors).total;
                return (
                  <tr key={a.id}>
                    <td>
                      <Link to={`/abilities/${a.id}`} className="text-accent hover:underline">
                        {a.name}
                      </Link>
                    </td>
                    <td className="font-mono text-xs">{a.effect_type}</td>
                    <td className="font-mono text-xs">{a.target_type}</td>
                    <td className="font-mono text-xs">{a.duration_type}</td>
                    <td className="text-right font-mono">{a.base_power}</td>
                    <td className="text-right font-mono">{a.cooldown_sec}</td>
                    <td className="text-right font-mono font-semibold">{pp.toFixed(1)}</td>
                    <td>
                      {canEdit && (
                        <Button variant="ghost" onClick={() => remove(a.id)}>
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
