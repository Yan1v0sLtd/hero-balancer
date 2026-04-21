-- =====================================================================
-- Row Level Security
-- =====================================================================
-- Role model:
--   admin     -> full read/write on everything, incl. config
--   designer  -> read everything, write content (heroes/cards/abilities)
--                but NOT global config (coefficients, budgets, factors)
--   viewer    -> read-only
--
-- All tables require authentication.
-- =====================================================================

-- Helper: get current user's role
create or replace function auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from user_roles where user_id = auth.uid()
$$;

-- Enable RLS
alter table environments       enable row level security;
alter table user_roles         enable row level security;
alter table stat_coefficients  enable row level security;
alter table pp_budgets         enable row level security;
alter table ability_factors    enable row level security;
alter table abilities          enable row level security;
alter table heroes             enable row level security;
alter table cards              enable row level security;
alter table archetypes         enable row level security;
alter table synergy_flags      enable row level security;

-- ---- READ: any authenticated user ----------------------------------
create policy read_auth on environments       for select using (auth.uid() is not null);
create policy read_auth on user_roles         for select using (auth.uid() is not null);
create policy read_auth on stat_coefficients  for select using (auth.uid() is not null);
create policy read_auth on pp_budgets         for select using (auth.uid() is not null);
create policy read_auth on ability_factors    for select using (auth.uid() is not null);
create policy read_auth on abilities          for select using (auth.uid() is not null);
create policy read_auth on heroes             for select using (auth.uid() is not null);
create policy read_auth on cards              for select using (auth.uid() is not null);
create policy read_auth on archetypes         for select using (auth.uid() is not null);
create policy read_auth on synergy_flags      for select using (auth.uid() is not null);

-- ---- WRITE: admin-only for global config ---------------------------
create policy write_admin on environments       for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy write_admin on user_roles         for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy write_admin on stat_coefficients  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy write_admin on pp_budgets         for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy write_admin on ability_factors    for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---- WRITE: admin OR designer for content --------------------------
create policy write_content on abilities for all
  using (auth_role() in ('admin','designer'))
  with check (auth_role() in ('admin','designer'));

create policy write_content on heroes for all
  using (auth_role() in ('admin','designer'))
  with check (auth_role() in ('admin','designer'));

create policy write_content on cards for all
  using (auth_role() in ('admin','designer'))
  with check (auth_role() in ('admin','designer'));

create policy write_content on archetypes for all
  using (auth_role() in ('admin','designer'))
  with check (auth_role() in ('admin','designer'));

create policy write_content on synergy_flags for all
  using (auth_role() in ('admin','designer'))
  with check (auth_role() in ('admin','designer'));
