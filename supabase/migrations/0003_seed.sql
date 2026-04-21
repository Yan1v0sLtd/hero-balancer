-- =====================================================================
-- Seed data: environments, stat coefficients, PP budgets, ability factors
-- =====================================================================

-- Environments
insert into environments (name) values ('dev'), ('staging'), ('prod')
  on conflict (name) do nothing;

-- Seed default stat coefficients for each env
do $$
declare e record;
begin
  for e in select id from environments loop
    insert into stat_coefficients (env_id, stat_name, pp_per_unit, notes) values
      (e.id, 'hp',          0.05, 'Foundational health points'),
      (e.id, 'atk',         1.00, 'Attack damage — benchmark stat'),
      (e.id, 'def',         0.80, 'Damage reduction stat'),
      (e.id, 'spd',         3.00, 'Speed — expensive, systemic value'),
      (e.id, 'crit_pct',    2.50, 'Crit chance % — non-linear value'),
      (e.id, 'crit_dmg_pct',1.50, 'Crit damage % — only valuable with crit')
    on conflict (env_id, stat_name) do nothing;

    -- PP Budgets (heroes)
    insert into pp_budgets (env_id, tier, entity_type, budget) values
      (e.id, 'common',    'hero', 100),
      (e.id, 'rare',      'hero', 130),
      (e.id, 'epic',      'hero', 165),
      (e.id, 'legendary', 'hero', 210)
    on conflict (env_id, tier, entity_type) do nothing;

    -- PP Budgets (cards)
    insert into pp_budgets (env_id, tier, entity_type, budget) values
      (e.id, 'common',    'card', 40),
      (e.id, 'rare',      'card', 55),
      (e.id, 'epic',      'card', 70),
      (e.id, 'legendary', 'card', 90)
    on conflict (env_id, tier, entity_type) do nothing;

    -- Ability factors: duration
    insert into ability_factors (env_id, factor_type, factor_key, factor_value) values
      (e.id, 'duration', 'instant',    1.0),
      (e.id, 'duration', '2s',         1.3),
      (e.id, 'duration', '5s',         1.8),
      (e.id, 'duration', 'permanent',  3.0)
    on conflict (env_id, factor_type, factor_key) do nothing;

    -- Ability factors: target
    insert into ability_factors (env_id, factor_type, factor_key, factor_value) values
      (e.id, 'target', 'single', 1.0),
      (e.id, 'target', 'cone',   1.4),
      (e.id, 'target', 'aoe',    2.0),
      (e.id, 'target', 'global', 3.0)
    on conflict (env_id, factor_type, factor_key) do nothing;

    -- Ability factors: effect_type
    insert into ability_factors (env_id, factor_type, factor_key, factor_value) values
      (e.id, 'effect_type', 'damage',  1.0),
      (e.id, 'effect_type', 'heal',    1.1),
      (e.id, 'effect_type', 'shield',  1.3),
      (e.id, 'effect_type', 'stun',    2.0),
      (e.id, 'effect_type', 'buff',    1.2),
      (e.id, 'effect_type', 'debuff',  1.4)
    on conflict (env_id, factor_type, factor_key) do nothing;

    -- Default archetypes (Phase 2 scaffold — data present so UI has something to show)
    insert into archetypes (env_id, name, min_offense_pct, max_offense_pct, min_defense_pct, max_defense_pct, notes) values
      (e.id, 'tank',     0,  30, 50, 100, 'Forces HP/DEF investment'),
      (e.id, 'assassin', 50, 90, 0,  20,  'Glass cannon — high ATK, low DEF'),
      (e.id, 'support',  0,  20, 20, 50,  'Utility/ability-focused'),
      (e.id, 'mage',     40, 80, 10, 40,  'Ability-heavy offense'),
      (e.id, 'ranger',   40, 70, 10, 40,  'Balanced ranged DPS')
    on conflict (env_id, name) do nothing;
  end loop;
end $$;
