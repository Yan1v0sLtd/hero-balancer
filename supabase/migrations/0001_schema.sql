-- =====================================================================
-- Hero Balancer: Initial Schema
-- =====================================================================
-- All content is scoped by environment (dev / staging / prod).
-- Phase 1: environments, user_roles, stat_coefficients, pp_budgets,
--          ability_factors, abilities, heroes, cards.
-- Phase 2-4 scaffolds: archetypes, synergy_flags.
-- =====================================================================

-- ---- ENVIRONMENTS --------------------------------------------------
create table environments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (name in ('dev', 'staging', 'prod')),
  created_at timestamptz not null default now()
);

-- ---- USER ROLES ----------------------------------------------------
create table user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'designer', 'viewer')),
  created_at timestamptz not null default now()
);

-- ---- STAT COEFFICIENTS ---------------------------------------------
-- PP cost per unit of each stat. Tunable per environment.
create table stat_coefficients (
  id           uuid primary key default gen_random_uuid(),
  env_id       uuid not null references environments(id) on delete cascade,
  stat_name    text not null,
  pp_per_unit  numeric not null check (pp_per_unit >= 0),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(env_id, stat_name)
);

-- ---- PP BUDGETS ----------------------------------------------------
-- The PP ceiling for a given tier + entity type, per environment.
create table pp_budgets (
  id           uuid primary key default gen_random_uuid(),
  env_id       uuid not null references environments(id) on delete cascade,
  tier         text not null check (tier in ('common', 'rare', 'epic', 'legendary')),
  entity_type  text not null check (entity_type in ('hero', 'card')),
  budget       numeric not null check (budget >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(env_id, tier, entity_type)
);

-- ---- ABILITY FACTORS -----------------------------------------------
-- Multipliers applied in the ability PP formula. Used by Phase 1 basic
-- abilities; extended further in Phase 3.
create table ability_factors (
  id            uuid primary key default gen_random_uuid(),
  env_id        uuid not null references environments(id) on delete cascade,
  factor_type   text not null check (factor_type in ('duration', 'target', 'effect_type')),
  factor_key    text not null,
  factor_value  numeric not null check (factor_value >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(env_id, factor_type, factor_key)
);

-- ---- ABILITIES -----------------------------------------------------
create table abilities (
  id              uuid primary key default gen_random_uuid(),
  env_id          uuid not null references environments(id) on delete cascade,
  name            text not null,
  description     text,
  base_power      numeric not null default 0 check (base_power >= 0),
  duration_type   text not null default 'instant',
  cooldown_sec    numeric not null default 0 check (cooldown_sec >= 0),
  target_type     text not null default 'single',
  effect_type     text not null default 'damage',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index abilities_env_idx on abilities(env_id);

-- ---- HEROES --------------------------------------------------------
create table heroes (
  id                 uuid primary key default gen_random_uuid(),
  env_id             uuid not null references environments(id) on delete cascade,
  name               text not null,
  tier               text not null check (tier in ('common', 'rare', 'epic', 'legendary')),
  archetype          text not null check (archetype in ('tank', 'assassin', 'support', 'mage', 'ranger')),
  base_stats         jsonb not null default '{}'::jsonb,
  passive_ability_id uuid references abilities(id) on delete set null,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index heroes_env_idx on heroes(env_id);
create index heroes_tier_idx on heroes(tier);
create index heroes_archetype_idx on heroes(archetype);

-- ---- CARDS ---------------------------------------------------------
create table cards (
  id           uuid primary key default gen_random_uuid(),
  env_id       uuid not null references environments(id) on delete cascade,
  name         text not null,
  tier         text not null check (tier in ('common', 'rare', 'epic', 'legendary')),
  card_type    text not null check (card_type in ('attack', 'defense', 'buff', 'debuff', 'utility')),
  ability_id   uuid references abilities(id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index cards_env_idx on cards(env_id);
create index cards_tier_idx on cards(tier);

-- ---- ARCHETYPES (Phase 2 scaffold) ---------------------------------
-- Constraint rules per archetype. Enforced client-side for now.
create table archetypes (
  id                uuid primary key default gen_random_uuid(),
  env_id            uuid not null references environments(id) on delete cascade,
  name              text not null,
  min_offense_pct   numeric not null default 0  check (min_offense_pct between 0 and 100),
  max_offense_pct   numeric not null default 100 check (max_offense_pct between 0 and 100),
  min_defense_pct   numeric not null default 0  check (min_defense_pct between 0 and 100),
  max_defense_pct   numeric not null default 100 check (max_defense_pct between 0 and 100),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(env_id, name)
);

-- ---- SYNERGY FLAGS (Phase 4 scaffold) ------------------------------
create table synergy_flags (
  id          uuid primary key default gen_random_uuid(),
  env_id      uuid not null references environments(id) on delete cascade,
  combo       jsonb not null,
  risk_level  text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  note        text,
  created_at  timestamptz not null default now()
);

-- ---- UPDATED_AT TRIGGER --------------------------------------------
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger t_stat_coefficients_updated before update on stat_coefficients
  for each row execute procedure touch_updated_at();
create trigger t_pp_budgets_updated before update on pp_budgets
  for each row execute procedure touch_updated_at();
create trigger t_ability_factors_updated before update on ability_factors
  for each row execute procedure touch_updated_at();
create trigger t_abilities_updated before update on abilities
  for each row execute procedure touch_updated_at();
create trigger t_heroes_updated before update on heroes
  for each row execute procedure touch_updated_at();
create trigger t_cards_updated before update on cards
  for each row execute procedure touch_updated_at();
create trigger t_archetypes_updated before update on archetypes
  for each row execute procedure touch_updated_at();
