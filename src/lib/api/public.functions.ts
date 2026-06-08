import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public + player-facing server functions. Players authenticate only via their
// unique private link token — no password for MVP.

export const listPublicTournaments = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tournaments")
    .select("id, name, slug, sport_type, description, status, deadline, predictions_locked, theme_id, themes(name, colors, logo_url)")
    .neq("status", "draft")
    .order("created_at", { ascending: false });
  return data ?? [];
});

async function loadTournamentBySlug(slug: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: tournament } = await supabaseAdmin
    .from("tournaments")
    .select("*, themes(name, colors, logo_url, background_url)")
    .eq("slug", slug)
    .maybeSingle();
  return tournament;
}

export const getPublicTournament = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().max(80) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tournament = await loadTournamentBySlug(data.slug);
    if (!tournament) return null;
    const [teams, matches, results, participants] = await Promise.all([
      supabaseAdmin.from("teams").select("*").eq("tournament_id", tournament.id),
      supabaseAdmin
        .from("matches")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("match_time", { nullsFirst: false }),
      supabaseAdmin.from("results").select("match_id, home_score, away_score").eq("match_id", "00000000-0000-0000-0000-000000000000"),
      supabaseAdmin.from("participants").select("id").eq("tournament_id", tournament.id),
    ]);
    const matchIds = (matches.data ?? []).map((m) => m.id);
    const { data: realResults } = matchIds.length
      ? await supabaseAdmin.from("results").select("match_id, home_score, away_score").in("match_id", matchIds)
      : { data: [] as any[] };
    return {
      tournament,
      teams: teams.data ?? [],
      matches: matches.data ?? [],
      results: realResults ?? [],
      participantCount: participants.data?.length ?? 0,
    };
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().max(80) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rebuildLeaderboard } = await import("./scoring-engine.server");
    const tournament = await loadTournamentBySlug(data.slug);
    if (!tournament) return { rows: [], previous: [] };

    const rows = await rebuildLeaderboard(supabaseAdmin, tournament.id);

    // previous snapshot for rank movement (second most recent)
    const { data: snaps } = await supabaseAdmin
      .from("leaderboard_snapshots")
      .select("data")
      .eq("tournament_id", tournament.id)
      .order("created_at", { ascending: false })
      .range(1, 1);
    const previous = (snaps?.[0]?.data as any[]) ?? [];
    return { rows, previous };
  });

export const getMatchDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ matchId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: match } = await supabaseAdmin
      .from("matches")
      .select("*, tournaments(name, slug), home:home_team_id(name, flag_emoji, short_code), away:away_team_id(name, flag_emoji, short_code)")
      .eq("id", data.matchId)
      .maybeSingle();
    if (!match) return null;
    const { data: result } = await supabaseAdmin
      .from("results")
      .select("home_score, away_score")
      .eq("match_id", data.matchId)
      .maybeSingle();
    const { data: preds } = await supabaseAdmin
      .from("match_predictions")
      .select("home_score, away_score, points, participants(name)")
      .eq("match_id", data.matchId);
    return { match, result, predictions: preds ?? [] };
  });

/* ------------------------------- PLAYER ------------------------------- */
export const getPlayerBoard = createServerFn({ method: "GET" })
  .inputValidator(z.object({ token: z.string().max(60) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("prediction_links")
      .select("*, participants(*), tournaments(*, themes(name, colors, logo_url, background_url))")
      .eq("token", data.token)
      .maybeSingle();
    if (!link) return null;

    const tournament = (link as any).tournaments;
    const participant = (link as any).participants;

    const [teams, matches, mpreds, bpreds] = await Promise.all([
      supabaseAdmin.from("teams").select("*").eq("tournament_id", tournament.id),
      supabaseAdmin
        .from("matches")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("match_time", { nullsFirst: false }),
      supabaseAdmin.from("match_predictions").select("*").eq("participant_id", participant.id),
      supabaseAdmin.from("bonus_predictions").select("*").eq("participant_id", participant.id),
    ]);
    const matchIds = (matches.data ?? []).map((m) => m.id);
    const { data: results } = matchIds.length
      ? await supabaseAdmin.from("results").select("match_id, home_score, away_score").in("match_id", matchIds)
      : { data: [] as any[] };

    return {
      tournament,
      participant,
      teams: teams.data ?? [],
      matches: matches.data ?? [],
      predictions: mpreds.data ?? [],
      bonusPredictions: bpreds.data ?? [],
      results: results ?? [],
    };
  });

export const savePlayerPrediction = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().max(60),
      matchId: z.string().uuid(),
      homeScore: z.number().int().min(0).max(99),
      awayScore: z.number().int().min(0).max(99),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("prediction_links")
      .select("participant_id, tournament_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!link) throw new Error("Invalid link");

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("predictions_locked, deadline")
      .eq("id", link.tournament_id)
      .maybeSingle();
    const { data: match } = await supabaseAdmin
      .from("matches")
      .select("locked, match_time")
      .eq("id", data.matchId)
      .maybeSingle();

    const now = Date.now();
    const deadlinePassed = tournament?.deadline ? new Date(tournament.deadline).getTime() < now : false;
    const matchStarted = match?.match_time ? new Date(match.match_time).getTime() < now : false;
    if (tournament?.predictions_locked || match?.locked || deadlinePassed || matchStarted) {
      throw new Error("Predictions are locked for this match.");
    }

    await supabaseAdmin.from("match_predictions").upsert(
      {
        participant_id: link.participant_id,
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
      token: z.string().max(60),
      bonusKey: z.string().max(60),
      value: z.string().max(120),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("prediction_links")
      .select("participant_id, tournament_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!link) throw new Error("Invalid link");

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("predictions_locked, deadline")
      .eq("id", link.tournament_id)
      .maybeSingle();
    const deadlinePassed = tournament?.deadline ? new Date(tournament.deadline).getTime() < Date.now() : false;
    if (tournament?.predictions_locked || deadlinePassed) {
      throw new Error("Bonus predictions are locked.");
    }

    await supabaseAdmin.from("bonus_predictions").upsert(
      {
        participant_id: link.participant_id,
        tournament_id: link.tournament_id,
        bonus_key: data.bonusKey,
        value: data.value,
      },
      { onConflict: "participant_id,bonus_key" },
    );
    return { ok: true };
  });
