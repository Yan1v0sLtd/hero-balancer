# Hero Balancer

Configuration and balancing tool for a mobile real-time RPG. Manage heroes, ability cards, and the Power Point (PP) budget system that keeps them balanced across rarity tiers.

**Stack:** React + Vite + TypeScript · Supabase (Postgres + Auth + RLS) · Tailwind CSS · Vercel

---

## What this is

A budget-based balancing system. Every stat and ability has a PP cost; every hero/card has a PP budget determined by its rarity tier. The UI shows live PP calculation as you build content, so you can't accidentally ship an overpowered Common or an underpowered Legendary.

All content is scoped to an **environment** — `dev`, `staging`, `prod` — so you can tune coefficients independently without touching live values.

### Phase status

| Phase | Feature                          | Status                                         |
| ----- | -------------------------------- | ---------------------------------------------- |
| 1     | Stat coefficients (per env)      | ✅ Full                                         |
| 1     | PP budgets (per tier × env)      | ✅ Full                                         |
| 1     | Hero CRUD + live PP              | ✅ Full                                         |
| 1     | Card CRUD + live PP              | ✅ Full                                         |
| 1     | Abilities + cost formula         | ✅ Full                                         |
| 1     | Power ledger (sortable)          | ✅ Full                                         |
| 2     | Archetype constraints            | ✅ Seeded + editor; enforced live in editor    |
| 3     | Ability factors (duration/etc.)  | ✅ Editable per environment                    |
| 4     | Synergy flags                    | 🟡 Scaffold (CRUD works; auto-scan is TODO)    |
| 4     | Balance report                   | 🟡 Scaffold (aggregates + outliers; sim is TODO) |

---

## Quick start

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → new project.
2. In the SQL editor, run the migrations **in order**:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_seed.sql`
3. Grab the project URL and anon key from Settings → API.

### 2. Create your first user

1. In Supabase, Authentication → Users → Add user (email + password).
2. In the SQL editor, promote yourself to admin:
   ```sql
   insert into user_roles (user_id, role)
   values ('<paste-your-auth-user-id-here>', 'admin');
   ```

For your designers: create them the same way, but use `'designer'` (read-write on content, read-only on config) or `'viewer'` (read-only everywhere).

### 3. Wire up the app

```bash
cp .env.example .env
# edit .env:
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...

npm install
npm run dev
```

Open http://localhost:5173 and sign in.

### 4. Deploy to Vercel

```bash
gh repo create Yan1v0sLtd/hero-balancer --private --source=. --remote=origin --push
```

Then in Vercel:

1. Import the repo.
2. Framework preset: **Vite**.
3. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy.

---

## How PP is calculated

### Stat PP

```
statPP = Σ (stat_value × pp_per_unit)
```

`pp_per_unit` is editable per environment on the **Stat Coefficients** page. Defaults (copied from your design doc):

| Stat           | PP per unit |
| -------------- | ----------- |
| `hp`           | 0.05        |
| `atk`          | 1.00        |
| `def`          | 0.80        |
| `spd`          | 3.00        |
| `crit_pct`     | 2.50        |
| `crit_dmg_pct` | 1.50        |

### Ability PP

```
abilityPP = base_power × duration × (10 / (cooldown_sec + 1)) × target × effect_type
```

Every multiplier is editable per environment on the **Ability Factors** page. Defaults:

- **Duration**: `instant` 1.0, `2s` 1.3, `5s` 1.8, `permanent` 3.0
- **Target**: `single` 1.0, `cone` 1.4, `aoe` 2.0, `global` 3.0
- **Effect**: `damage` 1.0, `heal` 1.1, `shield` 1.3, `stun` 2.0, `buff` 1.2, `debuff` 1.4

### Hero PP and Card PP

```
heroPP  = statPP + (passive ability PP, if any)
cardPP  = ability PP
```

### Budget

Each tier has a PP ceiling per entity type. Editable per environment on the **PP Budgets** page. Defaults:

| Tier      | Hero | Card |
| --------- | ---- | ---- |
| Common    | 100  | 40   |
| Rare      | 130  | 55   |
| Epic      | 165  | 70   |
| Legendary | 210  | 90   |

Status color in the UI:

- `under` (<50% of budget) — slate
- `ok` — green
- `warn` (>95%) — amber
- `over` (>100%) — red

---

## Role model

| Role       | Read | Write content (heroes/cards/abilities) | Write config (coefficients, budgets, factors) |
| ---------- | ---- | -------------------------------------- | --------------------------------------------- |
| `admin`    | ✅   | ✅                                     | ✅                                            |
| `designer` | ✅   | ✅                                     | ❌                                            |
| `viewer`   | ✅   | ❌                                     | ❌                                            |

Enforced by Postgres RLS — not just client-side. See `supabase/migrations/0002_rls.sql`.

---

## Project structure

```
hero-balancer/
├── src/
│   ├── App.tsx                       # Router
│   ├── main.tsx
│   ├── index.css
│   ├── types/database.ts             # All domain types
│   ├── lib/
│   │   ├── supabase.ts               # Client
│   │   ├── pp-calculator.ts          # Core PP formulas — single source of truth
│   │   └── useConfigBundle.ts        # Hook: fetches coefficients/factors/budgets/abilities
│   ├── contexts/
│   │   ├── AuthContext.tsx           # Session + role
│   │   └── EnvironmentContext.tsx    # Current env (dev/staging/prod)
│   ├── components/
│   │   ├── Layout.tsx                # Sidebar + env switcher
│   │   ├── ProtectedRoute.tsx
│   │   └── UI.tsx                    # Button, Panel, PPBar, TierBadge, PageHeader, EmptyState
│   └── pages/
│       ├── Login.tsx
│       ├── Dashboard.tsx
│       ├── Heroes.tsx · HeroEditor.tsx
│       ├── Cards.tsx · CardEditor.tsx
│       ├── Abilities.tsx · AbilityEditor.tsx
│       ├── PowerLedger.tsx           # Sortable list of all heroes + cards
│       ├── Coefficients.tsx
│       ├── Budgets.tsx
│       ├── Factors.tsx
│       ├── Archetypes.tsx            # Phase 2
│       ├── SynergyFlags.tsx          # Phase 4 scaffold
│       └── BalanceReport.tsx         # Phase 4 scaffold (aggregates work)
└── supabase/migrations/
    ├── 0001_schema.sql
    ├── 0002_rls.sql
    └── 0003_seed.sql
```

---

## What's still TODO (honest list)

The scaffolded pages work but the intelligence isn't there yet:

- **Synergy flags** — the CRUD works, but there's no auto-scan yet that matches ability tags against flagged combos. Need to first add a `tags text[]` column to `abilities` and update the editor to support tag input.
- **Balance report** — aggregates and z-score outliers work. The combat simulator hook doesn't. You'll want to define what "simulating a fight" means before building this — turn-based abstraction vs real-time approximation.
- **Environment promotion** — no UI yet for copying content from `dev` → `staging` → `prod`. For now, use SQL (see `supabase/migrations/0003_seed.sql` as a template).
- **Audit log** — no tracking of who changed what. Probably want this before many designers are using it.

---

## One thing to keep in mind

The default coefficients are reasonable starting points, **not calibrated truth**. Expect to tune them after you've entered 20–30 heroes and can see real distributions in the Balance Report. That's why coefficients are per-environment — tune freely in `dev`, promote to `prod` when you're confident.
