import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEnvironment } from '../contexts/EnvironmentContext';
import { Button } from './UI';

const NAV_SECTIONS = [
  {
    heading: 'Content',
    items: [
      { to: '/heroes', label: 'Heroes' },
      { to: '/cards', label: 'Cards' },
      { to: '/abilities', label: 'Abilities' },
      { to: '/ledger', label: 'Power Ledger' },
    ],
  },
  {
    heading: 'Configuration',
    items: [
      { to: '/coefficients', label: 'Stat Coefficients' },
      { to: '/budgets', label: 'PP Budgets' },
      { to: '/factors', label: 'Ability Factors' },
    ],
  },
  {
    heading: 'Phase 2–4',
    items: [
      { to: '/archetypes', label: 'Archetypes' },
      { to: '/synergy', label: 'Synergy Flags' },
      { to: '/report', label: 'Balance Report' },
    ],
  },
];

export default function Layout() {
  const { user, role, signOut } = useAuth();
  const { environments, currentEnv, setCurrentEnvById } = useEnvironment();
  const navigate = useNavigate();

  const envColor =
    currentEnv?.name === 'prod'
      ? 'text-red-400 border-red-500/40'
      : currentEnv?.name === 'staging'
      ? 'text-amber-400 border-amber-500/40'
      : 'text-emerald-400 border-emerald-500/40';

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-60 bg-bg-secondary border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="text-lg font-bold tracking-tight">Hero Balancer</div>
          <div className="text-xs text-slate-400">v0.1 · Phase 1</div>
        </div>

        <div className="p-3 border-b border-border">
          <label>Environment</label>
          <select
            value={currentEnv?.id ?? ''}
            onChange={(e) => setCurrentEnvById(e.target.value)}
            className={`w-full font-mono uppercase text-sm border ${envColor}`}
          >
            {environments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex-1 overflow-auto p-3 space-y-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm ${
                isActive ? 'bg-accent/20 text-accent' : 'text-slate-300 hover:bg-bg-tertiary'
              }`
            }
          >
            Dashboard
          </NavLink>
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading}>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 px-3 mb-1">
                {section.heading}
              </div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-sm ${
                      isActive
                        ? 'bg-accent/20 text-accent'
                        : 'text-slate-300 hover:bg-bg-tertiary'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border text-xs">
          <div className="text-slate-400 truncate">{user?.email}</div>
          <div className="text-slate-500 mb-2">Role: {role ?? '—'}</div>
          <Button
            variant="ghost"
            className="w-full"
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
