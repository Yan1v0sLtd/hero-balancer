# Hero Balancer — Architecture & Working Notes

> Read this before making changes. The system is deliberately budget-based, not rules-based. Don't add rule enforcement logic when a PP coefficient tweak would do the same job.

---

## Core design principle

**Balance is enforced by math, not by rules.** Every stat and ability has a PP cost; every entity has a tier-based PP budget. When designers want to nerf or buff something, they tune coefficients — not write new validation logic.

When adding a new feature, ask: *can this be expressed as a coefficient, factor, or budget change?* If yes, do that instead of adding code.

---

## Phase roadmap — respect the order

Build in this order. Do NOT jump ahead.

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 1 | Stat coefficients, PP budgets, hero/card/ability CRUD, power ledger | ✅ Full |
| 2 | Archetype constraints (live validation in editor) | ✅ Seeded + enforced |
| 3 | Ability factors (duration, target, effect) | ✅ Editable |
| 4 | Synergy flags (auto-scan) + Balance report (sim hook) | 🟡 Scaffolded |

Phase 4 work should not start until there are ~20+ heroes in `dev` to calibrate against. If the user asks to build Phase 4 intelligence before that, push back — the formulas will be miscalibrated without real data.

---

## Non-negotiables

1. **The PP calculator in `src/lib/pp-calculator.ts` is the single source of truth.** No duplication of PP math elsewhere. If a page needs PP, it imports from there.
2. **All content is environment-scoped.** Every table (except `environments` and `user_roles`) has `env_id`. Every query filters by `currentEnv.id`. Never query across environments.
3. **Coefficients are DATA, not code.** Never hardcode `0.05` for HP cost. Read it from `stat_coefficients`. Same for ability factors and budgets.
4. **RLS is authoritative.** Don't add client-side role checks as the only protection. The Postgres policies in `0002_rls.sql` are what actually protect writes.
5. **No premature abstractions.** No TanStack Query, no Redux, no form library. Plain hooks + controlled components. If you feel the urge to add one, ask first.

---

## File structure — where things go

```
src/
├── lib/
│   ├── pp-calculator.ts     → Pure functions. No React, no Supabase. Add formulas here.
│   ├── useConfigBundle.ts   → Hook: fetches all config for current env. Pages use this.
│   └── supabase.ts          → Client only. Don't add queries here.
├── contexts/
│   ├── AuthContext.tsx      → Session + role. canWriteContent() / canWriteConfig() helpers.
│   └── EnvironmentContext.tsx → Current env. Persisted in localStorage.
├── components/
│   └── UI.tsx               → Primitives only: Button, Panel, PPBar, TierBadge, PageHeader, EmptyState.
│                              If you need a new primitive, add it here. Don't scatter them.
├── pages/                   → One file per route. Data fetching + layout live here.
└── types/database.ts        → Domain types matching the Supabase schema. Keep in sync with migrations.
```

**New page checklist:**
- Uses `useEnvironment()` to get `currentEnv` and filters queries by `env_id`
- Uses `useAuth()` + `canWriteContent()` / `canWriteConfig()` to gate buttons
- Uses `useConfigBundle()` if PP calculation is needed
- Uses primitives from `UI.tsx` — no custom buttons/panels
- Added to `App.tsx` routes and `Layout.tsx` nav sections

---

## Database conventions

- All migrations go in `supabase/migrations/NNNN_description.sql`, numbered sequentially.
- Never edit a migration that has been applied to `prod`. Write a new one.
- Every content table has: `id uuid pk`, `env_id uuid fk`, `created_at`, `updated_at` (with touch trigger).
- Every enum-like column uses a `check` constraint, not a lookup table, for Phase 1 simplicity.
- Schema changes require: migration file + matching type update in `src/types/database.ts`.

---

## PP formulas — current

```
statPP     = Σ (stat_value × pp_per_unit)                              [coefficients table]
abilityPP  = base_power × duration × (10 / (cooldown + 1)) × target × effect   [factors table]
heroPP     = statPP + passive_ability_pp
cardPP     = ability_pp
```

If a designer asks to change these, the change is almost always in the coefficients/factors tables — not in this file. Only change the formula itself when adding genuinely new mechanics (e.g., stat interaction terms).

---

## Common pitfalls to avoid

- **Don't fetch the same config multiple times per page.** Use `useConfigBundle()` once at the top.
- **Don't let heroes and cards share an `abilities` reference without thinking.** Today they do, which is fine for Phase 1. Before Phase 4's auto-scan, consider whether card abilities and hero passives should be separate tables.
- **Don't promote dev → prod without a UI.** Right now there's no promotion flow. If the user asks for one, build it properly — not a one-off SQL script.
- **Don't compute PP in a SQL view.** Keep it in TypeScript. Coefficients change often; views would need constant rebuilding.

---

## When pushed to do something that breaks the above

Say so directly. The user (Yaniv) prefers critical pushback over silent compliance. If a request would duplicate PP logic, bypass RLS, or add a heavy dependency, explain the cost and propose the lighter alternative before acting.
