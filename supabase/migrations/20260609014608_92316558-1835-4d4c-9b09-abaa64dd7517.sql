
-- ============ CLEAN SLATE ============
DROP TABLE IF EXISTS public.leaderboard_snapshots CASCADE;
DROP TABLE IF EXISTS public.bonus_predictions CASCADE;
DROP TABLE IF EXISTS public.match_predictions CASCADE;
DROP TABLE IF EXISTS public.result_change_log CASCADE;
DROP TABLE IF EXISTS public.results CASCADE;
DROP TABLE IF EXISTS public.prediction_links CASCADE;
DROP TABLE IF EXISTS public.participants CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.tournaments CASCADE;
DROP TABLE IF EXISTS public.scoring_rules CASCADE;
DROP TABLE IF EXISTS public.themes CASCADE;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('platform_owner', 'league_manager');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ IDENTITY ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.manager_approval (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.approval_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.manager_approval TO service_role;
ALTER TABLE public.manager_approval ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_mgr_approval_updated BEFORE UPDATE ON public.manager_approval FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ THEMES ============
CREATE TABLE public.themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport_type text NOT NULL DEFAULT 'football',
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  typography jsonb NOT NULL DEFAULT '{}'::jsonb,
  button_style jsonb NOT NULL DEFAULT '{}'::jsonb,
  logo_url text,
  background_url text,
  asset_urls jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.themes TO service_role;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_themes_updated BEFORE UPDATE ON public.themes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BASE TOURNAMENTS ============
CREATE TABLE public.base_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sport_type text NOT NULL DEFAULT 'football',
  description text,
  season text,
  theme_id uuid REFERENCES public.themes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  external_provider text,
  external_ref text,
  default_exact_points integer NOT NULL DEFAULT 3,
  default_tendency_points integer NOT NULL DEFAULT 1,
  default_incorrect_points integer NOT NULL DEFAULT 0,
  default_bonus jsonb NOT NULL DEFAULT '[]'::jsonb,
  starts_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.base_tournaments TO service_role;
ALTER TABLE public.base_tournaments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_base_tourn_updated BEFORE UPDATE ON public.base_tournaments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tournament_theme_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_tournament_id uuid NOT NULL UNIQUE REFERENCES public.base_tournaments(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tournament_theme_assignments TO service_role;
ALTER TABLE public.tournament_theme_assignments ENABLE ROW LEVEL SECURITY;

-- ============ TEAMS / MATCHES / RESULTS ============
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_tournament_id uuid NOT NULL REFERENCES public.base_tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_code text,
  flag_emoji text,
  flag_url text,
  group_name text,
  external_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_tournament_id uuid NOT NULL REFERENCES public.base_tournaments(id) ON DELETE CASCADE,
  home_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'group',
  group_name text,
  match_time timestamptz,
  venue text,
  city text,
  status text NOT NULL DEFAULT 'scheduled',
  external_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score integer NOT NULL,
  away_score integer NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'finished',
  entered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.match_results TO service_role;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_match_results_updated BEFORE UPDATE ON public.match_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.result_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  old_home integer,
  old_away integer,
  new_home integer,
  new_away integer,
  source text,
  note text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.result_change_log TO service_role;
ALTER TABLE public.result_change_log ENABLE ROW LEVEL SECURITY;

-- ============ PRIVATE LEAGUES ============
CREATE TABLE public.private_leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_tournament_id uuid NOT NULL REFERENCES public.base_tournaments(id) ON DELETE RESTRICT,
  manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  predictions_locked boolean NOT NULL DEFAULT false,
  deadline timestamptz,
  auto_sync_enabled boolean NOT NULL DEFAULT false,
  result_override_allowed boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.private_leagues TO service_role;
ALTER TABLE public.private_leagues ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_leagues_updated BEFORE UPDATE ON public.private_leagues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.league_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.private_leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);
GRANT ALL ON public.league_managers TO service_role;
ALTER TABLE public.league_managers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.league_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.private_leagues(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.league_participants TO service_role;
ALTER TABLE public.league_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.player_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.league_participants(id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.private_leagues(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.player_links TO service_role;
ALTER TABLE public.player_links ENABLE ROW LEVEL SECURITY;

-- ============ RULES ============
CREATE TABLE public.scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid UNIQUE REFERENCES public.private_leagues(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Scoring',
  exact_score_points integer NOT NULL DEFAULT 3,
  tendency_points integer NOT NULL DEFAULT 1,
  incorrect_points integer NOT NULL DEFAULT 0,
  is_preset boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.scoring_rules TO service_role;
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_scoring_updated BEFORE UPDATE ON public.scoring_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bonus_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.private_leagues(id) ON DELETE CASCADE,
  bonus_key text NOT NULL,
  label text NOT NULL,
  input_type text NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  points integer NOT NULL DEFAULT 3,
  correct_value text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, bonus_key)
);
GRANT ALL ON public.bonus_rules TO service_role;
ALTER TABLE public.bonus_rules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bonus_rules_updated BEFORE UPDATE ON public.bonus_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PREDICTIONS ============
CREATE TABLE public.match_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.league_participants(id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.private_leagues(id) ON DELETE CASCADE,
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

CREATE TABLE public.bonus_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.league_participants(id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.private_leagues(id) ON DELETE CASCADE,
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

CREATE TABLE public.leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.private_leagues(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.leaderboard_snapshots TO service_role;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- ============ PLATFORM ADMIN ============
CREATE TABLE public.platform_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  allow_result_override_default boolean NOT NULL DEFAULT false,
  registration_open boolean NOT NULL DEFAULT true,
  active_provider text NOT NULL DEFAULT 'manual',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id = 1)
);
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_platform_settings_updated BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.api_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  base_url text,
  api_key_set boolean NOT NULL DEFAULT false,
  sport_type text NOT NULL DEFAULT 'football',
  is_active boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.api_providers TO service_role;
ALTER TABLE public.api_providers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_api_providers_updated BEFORE UPDATE ON public.api_providers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ INDEXES ============
CREATE INDEX idx_teams_base ON public.teams(base_tournament_id);
CREATE INDEX idx_matches_base ON public.matches(base_tournament_id);
CREATE INDEX idx_leagues_manager ON public.private_leagues(manager_id);
CREATE INDEX idx_leagues_base ON public.private_leagues(base_tournament_id);
CREATE INDEX idx_participants_league ON public.league_participants(league_id);
CREATE INDEX idx_mpred_participant ON public.match_predictions(participant_id);
CREATE INDEX idx_mpred_match ON public.match_predictions(match_id);
CREATE INDEX idx_mpred_league ON public.match_predictions(league_id);
CREATE INDEX idx_bpred_participant ON public.bonus_predictions(participant_id);
CREATE INDEX idx_bonus_rules_league ON public.bonus_rules(league_id);
CREATE INDEX idx_snapshots_league ON public.leaderboard_snapshots(league_id);

-- ============ SEED THEMES ============
INSERT INTO public.themes (name, sport_type, colors, typography, is_published)
VALUES
  ('World Cup 2026', 'football',
   '{"primary":"#F5C518","accent":"#10B981","background":"#0E1422","card":"#16203A","ring":"#F5C518"}'::jsonb,
   '{"display":"Space Grotesk","body":"Inter"}'::jsonb, true),
  ('Formula 1', 'motorsport',
   '{"primary":"#E10600","accent":"#FFFFFF","background":"#0A0A0F","card":"#15151E","ring":"#E10600"}'::jsonb,
   '{"display":"Space Grotesk","body":"Inter"}'::jsonb, true),
  ('NBA Hardwood', 'basketball',
   '{"primary":"#C8102E","accent":"#1D428A","background":"#101418","card":"#1B2027","ring":"#C8102E"}'::jsonb,
   '{"display":"Space Grotesk","body":"Inter"}'::jsonb, true);
