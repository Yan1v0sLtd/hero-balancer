import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { useAuth, canWriteContent } from '../contexts/AuthContext';
import { PageHeader, Panel } from '../components/UI';
import type { ArchetypeRule } from '../types/database';

export default function Archetypes() {
  const { currentEnv } = useEnvironment();
  const { role } = useAuth();
  const canEdit = canWriteContent(role);
  const [rows, setRows] = useState<ArchetypeRule[]>([]);

  async function load() {
    if (!currentEnv) return;
    const { data } = await supabase
      .from('archetypes')
      .select('*')
      .eq('env_id', currentEnv.id)
      .order('name');
    setRows((data ?? []) as ArchetypeRule[]);
  }
  useEffect(() => {
    load();
  }, [currentEnv?.id]);

  async function save(id: string, patch: Partial<ArchetypeRule>) {
    await supabase.from('archetypes').update(patch).eq('id', id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Archetypes"
        description="Phase 2 scaffold. Offense/Defense PP % constraints per archetype. Displayed on hero editor."
      />
      <Panel>
        <table>
          <thead>
            <tr>
              <th>Archetype</th>
              <th className="text-right">Min Offense %</th>
              <th className="text-right">Max Offense %</th>
              <th className="text-right">Min Defense %</th>
              <th className="text-right">Max Defense %</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-mono">{r.name}</td>
                {(
                  [
                    'min_offense_pct',
                    'max_offense_pct',
                    'min_defense_pct',
                    'max_defense_pct',
                  ] as const
                ).map((field) => (
                  <td key={field} className="text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!canEdit}
                      defaultValue={r[field]}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== r[field]) save(r.id, { [field]: v });
                      }}
                      className="w-20 text-right font-mono"
                    />
                  </td>
                ))}
                <td>
                  <input
                    type="text"
                    disabled={!canEdit}
                    defaultValue={r.notes ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (r.notes ?? ''))
                        save(r.id, { notes: e.target.value });
                    }}
                    className="w-full"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
