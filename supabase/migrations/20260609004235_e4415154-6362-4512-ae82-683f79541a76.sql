DO $$
DECLARE
  v_theme uuid;
  v_rules uuid;
  v_tournament uuid;
  v_bonus jsonb := '[{"key":"champion","label":"Champion","points":5},{"key":"top_scorer","label":"Top Scorer","points":3}]'::jsonb;
  t_arg uuid; t_bra uuid; t_fra uuid; t_esp uuid; t_eng uuid; t_ger uuid; t_por uuid; t_ned uuid;
  t_usa uuid; t_mex uuid; t_can uuid; t_jpn uuid; t_kor uuid; t_uru uuid; t_cro uuid; t_mar uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.tournaments WHERE slug = 'world-cup-2026') THEN
    RETURN;
  END IF;

  INSERT INTO public.themes (name, sport_type, colors, is_active)
  VALUES ('World Cup 2026', 'football',
    '{"primary":"#F5C518","accent":"#10B981","background":"#0B0F19"}'::jsonb, true)
  RETURNING id INTO v_theme;

  INSERT INTO public.scoring_rules (name, exact_score_points, tendency_points, incorrect_points, bonus_config, is_preset)
  VALUES ('Standard 3-1-0', 3, 1, 0, v_bonus, true)
  RETURNING id INTO v_rules;

  INSERT INTO public.tournaments (name, slug, sport_type, description, theme_id, scoring_rules_id, bonus_config, status, predictions_locked)
  VALUES ('World Cup 2026', 'world-cup-2026', 'football',
    'Predict every match of the 2026 FIFA World Cup and climb the friendly leaderboard.',
    v_theme, v_rules, v_bonus, 'active', false)
  RETURNING id INTO v_tournament;

  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Argentina','ARG','🇦🇷','A') RETURNING id INTO t_arg;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Mexico','MEX','🇲🇽','A') RETURNING id INTO t_mex;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Brazil','BRA','🇧🇷','B') RETURNING id INTO t_bra;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Croatia','CRO','🇭🇷','B') RETURNING id INTO t_cro;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'France','FRA','🇫🇷','C') RETURNING id INTO t_fra;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Morocco','MAR','🇲🇦','C') RETURNING id INTO t_mar;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Spain','ESP','🇪🇸','D') RETURNING id INTO t_esp;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Japan','JPN','🇯🇵','D') RETURNING id INTO t_jpn;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'England','ENG','🏴','E') RETURNING id INTO t_eng;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'South Korea','KOR','🇰🇷','E') RETURNING id INTO t_kor;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Germany','GER','🇩🇪','F') RETURNING id INTO t_ger;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'USA','USA','🇺🇸','F') RETURNING id INTO t_usa;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Portugal','POR','🇵🇹','G') RETURNING id INTO t_por;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Uruguay','URU','🇺🇾','G') RETURNING id INTO t_uru;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Netherlands','NED','🇳🇱','H') RETURNING id INTO t_ned;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES
    (v_tournament,'Canada','CAN','🇨🇦','H') RETURNING id INTO t_can;

  INSERT INTO public.matches (tournament_id, home_team_id, away_team_id, stage, match_time, status) VALUES
    (v_tournament, t_arg, t_mex, 'Group A', now() + interval '7 days', 'scheduled'),
    (v_tournament, t_bra, t_cro, 'Group B', now() + interval '7 days 3 hours', 'scheduled'),
    (v_tournament, t_fra, t_mar, 'Group C', now() + interval '8 days', 'scheduled'),
    (v_tournament, t_esp, t_jpn, 'Group D', now() + interval '8 days 3 hours', 'scheduled'),
    (v_tournament, t_eng, t_kor, 'Group E', now() + interval '9 days', 'scheduled'),
    (v_tournament, t_ger, t_usa, 'Group F', now() + interval '9 days 3 hours', 'scheduled'),
    (v_tournament, t_por, t_uru, 'Group G', now() + interval '10 days', 'scheduled'),
    (v_tournament, t_ned, t_can, 'Group H', now() + interval '10 days 3 hours', 'scheduled');
END $$;