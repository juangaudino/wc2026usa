
-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- THEMES
CREATE TABLE public.themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport_type text NOT NULL DEFAULT 'football',
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  logo_url text,
  background_url text,
  typography jsonb NOT NULL DEFAULT '{}'::jsonb,
  button_style jsonb NOT NULL DEFAULT '{}'::jsonb,
  asset_urls jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.themes TO service_role;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_themes_updated BEFORE UPDATE ON public.themes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SCORING RULES (presets + per tournament)
CREATE TABLE public.scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  exact_score_points integer NOT NULL DEFAULT 3,
  tendency_points integer NOT NULL DEFAULT 1,
  incorrect_points integer NOT NULL DEFAULT 0,
  bonus_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_preset boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.scoring_rules TO service_role;
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_scoring_updated BEFORE UPDATE ON public.scoring_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TOURNAMENTS
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sport_type text NOT NULL DEFAULT 'football',
  description text,
  theme_id uuid REFERENCES public.themes(id) ON DELETE SET NULL,
  scoring_rules_id uuid REFERENCES public.scoring_rules(id) ON DELETE SET NULL,
  bonus_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  predictions_locked boolean NOT NULL DEFAULT false,
  deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tournaments_updated BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TEAMS
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_code text,
  flag_emoji text,
  flag_url text,
  group_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- MATCHES
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  home_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'group',
  match_time timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PARTICIPANTS
CREATE TABLE public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.participants TO service_role;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- PREDICTION LINKS
CREATE TABLE public.prediction_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.prediction_links TO service_role;
ALTER TABLE public.prediction_links ENABLE ROW LEVEL SECURITY;

-- MATCH PREDICTIONS
CREATE TABLE public.match_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score integer NOT NULL,
  away_score integer NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, match_id)
);
GRANT ALL ON public.match_predictions TO service_role;
ALTER TABLE public.match_predictions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_mpred_updated BEFORE UPDATE ON public.match_predictions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BONUS PREDICTIONS
CREATE TABLE public.bonus_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  bonus_key text NOT NULL,
  value text,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, bonus_key)
);
GRANT ALL ON public.bonus_predictions TO service_role;
ALTER TABLE public.bonus_predictions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bpred_updated BEFORE UPDATE ON public.bonus_predictions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RESULTS
CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score integer NOT NULL,
  away_score integer NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  entered_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.results TO service_role;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_results_updated BEFORE UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RESULT CHANGE LOG (audit)
CREATE TABLE public.result_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  old_home integer,
  old_away integer,
  new_home integer,
  new_away integer,
  source text,
  note text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.result_change_log TO service_role;
ALTER TABLE public.result_change_log ENABLE ROW LEVEL SECURITY;

-- LEADERBOARD SNAPSHOTS
CREATE TABLE public.leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.leaderboard_snapshots TO service_role;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_teams_tournament ON public.teams(tournament_id);
CREATE INDEX idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX idx_participants_tournament ON public.participants(tournament_id);
CREATE INDEX idx_mpred_participant ON public.match_predictions(participant_id);
CREATE INDEX idx_mpred_match ON public.match_predictions(match_id);
CREATE INDEX idx_bpred_participant ON public.bonus_predictions(participant_id);
