import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public + player-facing server functions. Players authenticate only via their
// unique private link token — no account, no password.

/** Public landing: active base tournaments + their public leagues. */
export const listPublicTournaments = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: bases } = await supabaseAdmin
    .from("base_tournaments")
    .select("id, name, slug, sport_type, description, season, status, theme_id, themes(name, colors, logo_url, background_url)")
    .neq("status", "draft")
    .order("created_at", { ascending: false });
  const ids = (bases ?? []).map((b) => b.id);
  const { data: leagues } = ids.length
    ? await supabaseAdmin
        .from("private_leagues")
        .select("id, name, slug, base_tournament_id, is_public")
        .eq("is_public", true)
        .in("base_tournament_id", ids)
    : { data: [] as any[] };
  return { tournaments: bases ?? [], leagues: leagues ?? [] };
});

async function loadLeagueBySlug(admin: any, slug: string) {
  const { data: league } = await admin
    .from("private_leagues")
    .select("*, base_tournaments(*, themes(name, colors, logo_url, background_url))")
    .eq("slug", slug)
    .maybeSingle();
  return league;
}

/** Public league page data (leaderboard + matches + rules). */
export const getPublicLeague = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().max(80) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const league = await loadLeagueBySlug(supabaseAdmin, data.slug);
    if (!league) return null;
    const base = (league as any).base_tournaments;
    const [teams, matches, rules, bonusRules] = await Promise.all([
      supabaseAdmin.from("teams").select("*").eq("base_tournament_id", base.id),
      supabaseAdmin.from("matches").select("*").eq("base_tournament_id", base.id).order("match_time", { nullsFirst: false }),
      supabaseAdmin.from("scoring_rules").select("*").eq("league_id", league.id).maybeSingle(),
      supabaseAdmin.from("bonus_rules").select("*").eq("league_id", league.id).order("sort_order"),
    ]);
    const matchIds = (matches.data ?? []).map((m) => m.id);
    const { data: results } = matchIds.length
      ? await supabaseAdmin.from("match_results").select("match_id, home_score, away_score").in("match_id", matchIds)
      : { data: [] as any[] };
    const { count } = await supabaseAdmin
      .from("league_participants")
      .select("id", { count: "exact", head: true })
      .eq("league_id", league.id);
    return {
      league,
      base,
      teams: teams.data ?? [],
      matches: matches.data ?? [],
      results: results ?? [],
      scoring: rules.data,
      bonusRules: bonusRules.data ?? [],
      participantCount: count ?? 0,
    };
  });

export const getLeagueLeaderboard = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().max(80) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recomputeLeague, rebuildLeaderboard } = await import("./scoring-engine.server");
    const league = await loadLeagueBySlug(supabaseAdmin, data.slug);
    if (!league) return { rows: [], previous: [] };
    await recomputeLeague(supabaseAdmin, league.id);
    const rows = await rebuildLeaderboard(supabaseAdmin, league.id);
    const { data: snaps } = await supabaseAdmin
      .from("leaderboard_snapshots")
      .select("data")
      .eq("league_id", league.id)
      .order("created_at", { ascending: false })
      .range(1, 1);
    return { rows, previous: (snaps?.[0]?.data as any[]) ?? [] };
  });

/* ------------------------------- PLAYER ------------------------------- */
export const getPlayerBoard = createServerFn({ method: "GET" })
  .inputValidator(z.object({ token: z.string().max(80) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("player_links")
      .select("*, league_participants(*), private_leagues(*, base_tournaments(*, themes(name, colors, logo_url, background_url)))")
      .eq("token", data.token)
      .maybeSingle();
    if (!link) return null;
    const league = (link as any).private_leagues;
    const base = league.base_tournaments;
    const participant = (link as any).league_participants;

    const [teams, matches, mpreds, bpreds, bonusRules] = await Promise.all([
      supabaseAdmin.from("teams").select("*").eq("base_tournament_id", base.id),
      supabaseAdmin.from("matches").select("*").eq("base_tournament_id", base.id).order("match_time", { nullsFirst: false }),
      supabaseAdmin.from("match_predictions").select("*").eq("participant_id", participant.id),
      supabaseAdmin.from("bonus_predictions").select("*").eq("participant_id", participant.id),
      supabaseAdmin.from("bonus_rules").select("*").eq("league_id", league.id).order("sort_order"),
    ]);
    const matchIds = (matches.data ?? []).map((m) => m.id);
    const { data: results } = matchIds.length
      ? await supabaseAdmin.from("match_results").select("match_id, home_score, away_score").in("match_id", matchIds)
      : { data: [] as any[] };
    const { data: scoring } = await supabaseAdmin
      .from("scoring_rules").select("*").eq("league_id", league.id).maybeSingle();

    return {
      league,
      base,
      participant,
      teams: teams.data ?? [],
      matches: matches.data ?? [],
      predictions: mpreds.data ?? [],
      bonusPredictions: bpreds.data ?? [],
      bonusRules: bonusRules.data ?? [],
      results: results ?? [],
      scoring,
    };
  });

function lockedNow(league: any, match?: any) {
  const now = Date.now();
  const deadlinePassed = league?.deadline ? new Date(league.deadline).getTime() < now : false;
  const started = match?.match_time ? new Date(match.match_time).getTime() < now : false;
  return !!league?.predictions_locked || deadlinePassed || started;
}

export const savePlayerPrediction = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().max(80),
      matchId: z.string().uuid(),
      homeScore: z.number().int().min(0).max(99),
      awayScore: z.number().int().min(0).max(99),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("player_links")
      .select("participant_id, league_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!link) throw new Error("Invalid link");
    const { data: league } = await supabaseAdmin
      .from("private_leagues").select("predictions_locked, deadline").eq("id", link.league_id).maybeSingle();
    const { data: match } = await supabaseAdmin
      .from("matches").select("match_time").eq("id", data.matchId).maybeSingle();
    if (lockedNow(league, match)) throw new Error("Predictions are locked for this match.");

    await supabaseAdmin.from("match_predictions").upsert(
      {
        participant_id: link.participant_id,
        league_id: link.league_id,
        match_id: data.matchId,
        home_score: data.homeScore,
        away_score: data.awayScore,
      },
      { onConflict: "participant_id,match_id" },
    );
    return { ok: true };
  });

export const savePlayerBonus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().max(80),
      bonusKey: z.string().max(60),
      value: z.string().max(120),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("player_links")
      .select("participant_id, league_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!link) throw new Error("Invalid link");
    const { data: league } = await supabaseAdmin
      .from("private_leagues").select("predictions_locked, deadline").eq("id", link.league_id).maybeSingle();
    if (lockedNow(league)) throw new Error("Bonus predictions are locked.");

    await supabaseAdmin.from("bonus_predictions").upsert(
      {
        participant_id: link.participant_id,
        league_id: link.league_id,
        bonus_key: data.bonusKey,
        value: data.value,
      },
      { onConflict: "participant_id,bonus_key" },
    );
    return { ok: true };
  });
