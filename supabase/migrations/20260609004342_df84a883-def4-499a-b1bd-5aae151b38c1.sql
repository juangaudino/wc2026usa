DO $$
DECLARE
  v_tournament uuid := '06ec1250-122e-45ef-b9df-4748f30bd46f';
  t_arg uuid; t_bra uuid; t_fra uuid; t_esp uuid; t_eng uuid; t_ger uuid; t_por uuid; t_ned uuid;
  t_usa uuid; t_mex uuid; t_can uuid; t_jpn uuid; t_kor uuid; t_uru uuid; t_cro uuid; t_mar uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.teams WHERE tournament_id = v_tournament) THEN
    RETURN;
  END IF;

  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Argentina','ARG','🇦🇷','A') RETURNING id INTO t_arg;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Mexico','MEX','🇲🇽','A') RETURNING id INTO t_mex;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Brazil','BRA','🇧🇷','B') RETURNING id INTO t_bra;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Croatia','CRO','🇭🇷','B') RETURNING id INTO t_cro;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'France','FRA','🇫🇷','C') RETURNING id INTO t_fra;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Morocco','MAR','🇲🇦','C') RETURNING id INTO t_mar;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Spain','ESP','🇪🇸','D') RETURNING id INTO t_esp;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Japan','JPN','🇯🇵','D') RETURNING id INTO t_jpn;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'England','ENG','🏴','E') RETURNING id INTO t_eng;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'South Korea','KOR','🇰🇷','E') RETURNING id INTO t_kor;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Germany','GER','🇩🇪','F') RETURNING id INTO t_ger;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'USA','USA','🇺🇸','F') RETURNING id INTO t_usa;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Portugal','POR','🇵🇹','G') RETURNING id INTO t_por;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Uruguay','URU','🇺🇾','G') RETURNING id INTO t_uru;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Netherlands','NED','🇳🇱','H') RETURNING id INTO t_ned;
  INSERT INTO public.teams (tournament_id, name, short_code, flag_emoji, group_name) VALUES (v_tournament,'Canada','CAN','🇨🇦','H') RETURNING id INTO t_can;

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