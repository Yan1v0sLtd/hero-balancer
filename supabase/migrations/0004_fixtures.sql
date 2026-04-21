-- =====================================================================
-- Fixtures: realistic calibration data for `dev` only
-- =====================================================================
-- Adds 15 abilities, 20 heroes (5 archetypes × 4 tiers), 31 cards
-- (30 calibrated + 1 deliberate over-budget outlier).
-- Also relaxes the support archetype rule, which was unsatisfiable as
-- seeded (offense 0-20% AND defense 20-50% is impossible since every
-- stat lives in either offense or defense → they sum to 100%).
--
-- dev only: staging/prod remain empty. PP numbers in the comments were
-- pre-computed against the default coefficients/factors seeded in 0003.
-- If coefficients change, the absolute PP shifts but the *ratios* and
-- tier-relative calibration remain valid.
-- =====================================================================

do $fixtures$
declare
  dev_env_id uuid;
begin
  select id into dev_env_id from environments where name = 'dev';
  if dev_env_id is null then
    raise exception 'dev environment not found — run 0003_seed first';
  end if;

  -- ------------------------------------------------------------------
  -- Archetype rule fix (dev scope): support was unsatisfiable.
  -- Relax to offense 0-30%, defense 40-90% — still defense-leaning but
  -- feasible. A proper long-term fix is adding neutral stat categories
  -- (ability_power, resist) so support can lean on utility stats.
  -- ------------------------------------------------------------------
  update archetypes
    set min_offense_pct = 0,
        max_offense_pct = 30,
        min_defense_pct = 40,
        max_defense_pct = 90,
        notes = 'Utility/ability-focused. Relaxed from impossible seed — see 0004.'
    where env_id = dev_env_id and name = 'support';

  -- ------------------------------------------------------------------
  -- ABILITIES (15) — spans all duration/target/effect combinations
  -- so Phase 4 synergy scan has variety; PP values chosen to sit
  -- inside card tier budgets (common 40 / rare 55 / epic 70 / leg 90).
  -- ------------------------------------------------------------------
  insert into abilities (env_id, name, description, base_power, duration_type, cooldown_sec, target_type, effect_type) values
    -- common tier (~25-40 PP)
    (dev_env_id, 'Quick Slash',     'A fast single-target strike.',           24, 'instant',    5, 'single', 'damage'),  -- 40.0
    (dev_env_id, 'Minor Heal',      'A small single-target heal.',            22, 'instant',    8, 'single', 'heal'),    -- 26.9
    (dev_env_id, 'Guard',           'Short shield on self.',                  16, '5s',        10, 'single', 'shield'),  -- 34.0
    (dev_env_id, 'Hamstring',       'Brief slow on one target.',              14, '2s',         6, 'single', 'debuff'),  -- 36.4
    -- rare tier (~45-55 PP)
    (dev_env_id, 'Cleaving Strike', 'Cone attack hitting multiple foes.',     26, 'instant',    6, 'cone',   'damage'),  -- 52.0
    (dev_env_id, 'Fortify',         'Stronger shield on self.',               25, '5s',        10, 'single', 'shield'),  -- 53.2
    (dev_env_id, 'Heal Pulse',      'Cone heal that sweeps allies.',          22, 'instant',    6, 'cone',   'heal'),    -- 48.4
    (dev_env_id, 'Mark Prey',       'Mark a foe for bonus damage.',           18, '5s',         8, 'single', 'debuff'),  -- 50.4
    -- epic tier (~55-70 PP)
    (dev_env_id, 'Whirlwind',       'Spin attack hitting all nearby.',        25, 'instant',    8, 'aoe',    'damage'),  -- 55.6
    (dev_env_id, 'Bulwark',         'Cone shield for nearby allies.',         26, '5s',        12, 'cone',   'shield'),  -- 65.5
    (dev_env_id, 'Healing Wave',    'Area heal in a burst.',                  25, 'instant',    8, 'aoe',    'heal'),    -- 61.1
    (dev_env_id, 'Curse',           'Permanent debuff on one target.',        22, 'permanent', 15, 'single', 'debuff'),  -- 57.8
    -- legendary tier (~85-90 PP)
    (dev_env_id, 'Meteor',          'Devastating AoE damage from above.',     48, 'instant',   10, 'aoe',    'damage'),  -- 87.3
    (dev_env_id, 'Sanctuary',       'Long AoE shield for all allies.',        30, '5s',        15, 'aoe',    'shield'),  -- 87.8
    (dev_env_id, 'Time Stop',       'Brief global stun on all enemies.',      25, '2s',        22, 'global', 'stun');    -- 84.8

  -- ------------------------------------------------------------------
  -- HEROES (20) — 5 archetypes × 4 tiers. Stats tuned to 83-99% of tier
  -- budget, respecting archetype offense/defense ratios.
  -- `Juggernaut` is a DELIBERATE over-budget outlier.
  -- ------------------------------------------------------------------
  insert into heroes (env_id, name, tier, archetype, base_stats, passive_ability_id, notes) values
    -- TANK (tier offense 0-30%, defense 50-100%)
    (dev_env_id, 'Stone Guard',   'common',    'tank',
     '{"hp":1000,"def":35,"atk":5}'::jsonb,
     null,
     'T1 tank — statPP 83/100 (83%), def 94%'),
    (dev_env_id, 'Bulwarker',     'rare',      'tank',
     '{"hp":1400,"def":55,"atk":8}'::jsonb,
     null,
     'T2 tank — statPP 122/130 (94%), def 93%'),
    (dev_env_id, 'Aegis',         'epic',      'tank',
     '{"hp":1400,"def":48,"atk":8}'::jsonb,
     (select id from abilities where env_id = dev_env_id and name = 'Guard'),
     'T3 tank — statPP 116 + passive 34 = 150/165 (91%), def 93%'),
    (dev_env_id, 'Juggernaut',    'legendary', 'tank',
     '{"hp":1700,"def":70,"atk":15,"spd":2}'::jsonb,
     (select id from abilities where env_id = dev_env_id and name = 'Bulwark'),
     'T4 tank — DELIBERATE over-budget outlier: 162 + 65 = 227/210 (108%)'),

    -- ASSASSIN (tier offense 80-90%, defense 10-20%)
    (dev_env_id, 'Cutthroat',     'common',    'assassin',
     '{"atk":50,"crit_pct":8,"hp":200,"def":6}'::jsonb,
     null,
     'T1 assassin — statPP 85/100 (85%), off 82%'),
    (dev_env_id, 'Shadow Blade',  'rare',      'assassin',
     '{"atk":55,"crit_pct":10,"crit_dmg_pct":15,"hp":300,"def":8}'::jsonb,
     null,
     'T2 assassin — statPP 124/130 (95%), off 83%'),
    (dev_env_id, 'Nightstalker',  'epic',      'assassin',
     '{"atk":40,"crit_pct":10,"crit_dmg_pct":15,"hp":250,"def":8}'::jsonb,
     (select id from abilities where env_id = dev_env_id and name = 'Quick Slash'),
     'T3 assassin — statPP 106 + passive 40 = 146/165 (89%), off 82%'),
    (dev_env_id, 'Ghost Reaper',  'legendary', 'assassin',
     '{"atk":50,"crit_pct":14,"crit_dmg_pct":18,"spd":3,"hp":350,"def":10}'::jsonb,
     (select id from abilities where env_id = dev_env_id and name = 'Whirlwind'),
     'T4 assassin — statPP 147 + passive 56 = 202/210 (96%), off 83%'),

    -- SUPPORT (tier offense 0-30%, defense 40-90% — relaxed in this migration)
    (dev_env_id, 'Acolyte',       'common',    'support',
     '{"hp":1000,"def":25,"atk":12,"spd":1}'::jsonb,
     null,
     'T1 support — statPP 85/100 (85%), def 82%'),
    (dev_env_id, 'Cleric',        'rare',      'support',
     '{"hp":1100,"def":30,"atk":12}'::jsonb,
     (select id from abilities where env_id = dev_env_id and name = 'Minor Heal'),
     'T2 support — statPP 91 + passive 27 = 118/130 (91%), def 87%'),
    (dev_env_id, 'Shaman',        'epic',      'support',
     '{"hp":1300,"def":40,"atk":14}'::jsonb,
     (select id from abilities where env_id = dev_env_id and name = 'Heal Pulse'),
     'T3 support — statPP 111 + passive 48 = 159/165 (96%), def 87%'),
    (dev_env_id, 'Oracle',        'legendary', 'support',
     '{"hp":1500,"def":60,"atk":20,"spd":1}'::jsonb,
     (select id from abilities where env_id = dev_env_id and name = 'Healing Wave'),
     'T4 support — statPP 146 + passive 61 = 207/210 (99%), def 84%'),

    -- MAGE (tier offense 60-80%, defense 20-40%)
    (dev_env_id, 'Apprentice',    'common',    'mage',
     '{"atk":48,"crit_pct":5,"hp":400,"def":12}'::jsonb,
     null,
     'T1 mage — statPP 90/100 (90%), off 67%'),
    (dev_env_id, 'Wizard',        'rare',      'mage',
     '{"atk":60,"crit_pct":8,"hp":500,"def":20}'::jsonb,
     null,
     'T2 mage — statPP 121/130 (93%), off 66%'),
    (dev_env_id, 'Mystic',        'epic',      'mage',
     '{"atk":45,"crit_pct":7,"hp":500,"def":20}'::jsonb,
     (select id from abilities where env_id = dev_env_id and name = 'Curse'),
     'T3 mage — statPP 104 + passive 58 = 162/165 (98%), off 60%'),
    (dev_env_id, 'Archmage',      'legendary', 'mage',
     '{"atk":45,"crit_pct":8,"crit_dmg_pct":10,"hp":500,"def":20}'::jsonb,
     (select id from abilities where env_id = dev_env_id and name = 'Meteor'),
     'T4 mage — statPP 121 + passive 87 = 208/210 (99%), off 66%'),

    -- RANGER (tier offense 60-70%, defense 30-40%)
    (dev_env_id, 'Scout',         'common',    'ranger',
     '{"atk":30,"spd":3,"crit_pct":4,"hp":400,"def":15}'::jsonb,
     null,
     'T1 ranger — statPP 81/100 (81%), off 60%'),
    (dev_env_id, 'Archer',        'rare',      'ranger',
     '{"atk":40,"spd":4,"crit_pct":8,"hp":550,"def":22}'::jsonb,
     null,
     'T2 ranger — statPP 117/130 (90%), off 62%'),
    (dev_env_id, 'Marksman',      'epic',      'ranger',
     '{"atk":36,"spd":4,"crit_pct":8,"hp":550,"def":22}'::jsonb,
     (select id from abilities where env_id = dev_env_id and name = 'Mark Prey'),
     'T3 ranger — statPP 113 + passive 50 = 163/165 (99%), off 60%'),
    (dev_env_id, 'Sharpshooter',  'legendary', 'ranger',
     '{"atk":55,"spd":6,"crit_pct":12,"crit_dmg_pct":15,"hp":750,"def":35}'::jsonb,
     null,
     'T4 ranger — statPP 191/210 (91%), off 66%');

  -- ------------------------------------------------------------------
  -- CARDS (31) — 30 calibrated + 1 deliberate over-budget outlier.
  -- Card PP is 100% derived from the attached ability.
  -- ------------------------------------------------------------------
  insert into cards (env_id, name, tier, card_type, ability_id, notes) values
    -- COMMON (budget 40)
    (dev_env_id, 'Slash Card',       'common',    'attack',
     (select id from abilities where env_id = dev_env_id and name = 'Quick Slash'), null),
    (dev_env_id, 'Bandage',          'common',    'buff',
     (select id from abilities where env_id = dev_env_id and name = 'Minor Heal'), null),
    (dev_env_id, 'Buckler',          'common',    'defense',
     (select id from abilities where env_id = dev_env_id and name = 'Guard'), null),
    (dev_env_id, 'Trip',             'common',    'debuff',
     (select id from abilities where env_id = dev_env_id and name = 'Hamstring'), null),
    (dev_env_id, 'Stab',             'common',    'attack',
     (select id from abilities where env_id = dev_env_id and name = 'Quick Slash'), null),
    (dev_env_id, 'First Aid',        'common',    'buff',
     (select id from abilities where env_id = dev_env_id and name = 'Minor Heal'), null),
    (dev_env_id, 'Ward',             'common',    'defense',
     (select id from abilities where env_id = dev_env_id and name = 'Guard'), null),
    (dev_env_id, 'Distract',         'common',    'debuff',
     (select id from abilities where env_id = dev_env_id and name = 'Hamstring'), null),

    -- RARE (budget 55)
    (dev_env_id, 'Cleaver',          'rare',      'attack',
     (select id from abilities where env_id = dev_env_id and name = 'Cleaving Strike'), null),
    (dev_env_id, 'Shield Wall',      'rare',      'defense',
     (select id from abilities where env_id = dev_env_id and name = 'Fortify'), null),
    (dev_env_id, 'Rally Cry',        'rare',      'buff',
     (select id from abilities where env_id = dev_env_id and name = 'Heal Pulse'), null),
    (dev_env_id, 'Hunter''s Mark',   'rare',      'debuff',
     (select id from abilities where env_id = dev_env_id and name = 'Mark Prey'), null),
    (dev_env_id, 'Glaive Sweep',     'rare',      'attack',
     (select id from abilities where env_id = dev_env_id and name = 'Cleaving Strike'), null),
    (dev_env_id, 'Aegis Band',       'rare',      'defense',
     (select id from abilities where env_id = dev_env_id and name = 'Fortify'), null),
    (dev_env_id, 'Mending Wind',     'rare',      'buff',
     (select id from abilities where env_id = dev_env_id and name = 'Heal Pulse'), null),
    (dev_env_id, 'Curse Dart',       'rare',      'debuff',
     (select id from abilities where env_id = dev_env_id and name = 'Mark Prey'), null),

    -- EPIC (budget 70)
    (dev_env_id, 'Tempest',          'epic',      'attack',
     (select id from abilities where env_id = dev_env_id and name = 'Whirlwind'), null),
    (dev_env_id, 'Ironbark',         'epic',      'defense',
     (select id from abilities where env_id = dev_env_id and name = 'Bulwark'), null),
    (dev_env_id, 'Rejuvenation',     'epic',      'buff',
     (select id from abilities where env_id = dev_env_id and name = 'Healing Wave'), null),
    (dev_env_id, 'Hex',              'epic',      'debuff',
     (select id from abilities where env_id = dev_env_id and name = 'Curse'), null),
    (dev_env_id, 'Storm Dance',      'epic',      'attack',
     (select id from abilities where env_id = dev_env_id and name = 'Whirlwind'), null),
    (dev_env_id, 'Citadel',          'epic',      'defense',
     (select id from abilities where env_id = dev_env_id and name = 'Bulwark'), null),
    (dev_env_id, 'Overflow',         'epic',      'buff',
     (select id from abilities where env_id = dev_env_id and name = 'Healing Wave'), null),
    (dev_env_id, 'Wither',           'epic',      'debuff',
     (select id from abilities where env_id = dev_env_id and name = 'Curse'), null),

    -- LEGENDARY (budget 90)
    (dev_env_id, 'Cataclysm',        'legendary', 'attack',
     (select id from abilities where env_id = dev_env_id and name = 'Meteor'), null),
    (dev_env_id, 'Divine Shield',    'legendary', 'defense',
     (select id from abilities where env_id = dev_env_id and name = 'Sanctuary'), null),
    (dev_env_id, 'Chronolock',       'legendary', 'utility',
     (select id from abilities where env_id = dev_env_id and name = 'Time Stop'), null),
    (dev_env_id, 'Starfall',         'legendary', 'attack',
     (select id from abilities where env_id = dev_env_id and name = 'Meteor'), null),
    (dev_env_id, 'Sanctified',       'legendary', 'defense',
     (select id from abilities where env_id = dev_env_id and name = 'Sanctuary'), null),
    (dev_env_id, 'Temporal Rift',    'legendary', 'utility',
     (select id from abilities where env_id = dev_env_id and name = 'Time Stop'), null),

    -- DELIBERATE outlier: epic card carrying a legendary-PP ability
    -- (Time Stop 85 PP vs epic budget 70 → 121% over)
    (dev_env_id, 'Forbidden Ritual', 'epic',      'utility',
     (select id from abilities where env_id = dev_env_id and name = 'Time Stop'),
     'DELIBERATE over-budget outlier (Time Stop on epic card)');
end
$fixtures$;
