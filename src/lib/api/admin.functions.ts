import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// All admin/manager server functions. Authorization is enforced in-code via the
// helpers in authz.server.ts because every table is locked to the service role.

async function ctx() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function emailFromClaims(claims: any): string | null {
  return claims?.email ?? null;
}

/* ----------------------------- ACCOUNT ----------------------------- */
export const getMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await ctx();
    const { provisionAccount } = await import("./authz.server");
    return provisionAccount(admin, context.userId, emailFromClaims(context.claims));
  });

/* ------------------------------ OWNER ------------------------------ */
export const ownerListManagers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);
    const { data: approvals } = await admin
      .from("manager_approval")
      .select("user_id, status, note, created_at")
      .order("created_at", { ascending: false });
    const ids = (approvals ?? []).map((a) => a.user_id);
    const { data: profiles } = ids.length
      ? await admin.from("profiles").select("id, email, display_name").in("id", ids)
      : { data: [] as any[] };
    const pm = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (approvals ?? []).map((a) => ({
      userId: a.user_id,
      status: a.status,
      note: a.note,
      email: pm.get(a.user_id)?.email ?? null,
      displayName: pm.get(a.user_id)?.display_name ?? null,
    }));
  });

export const ownerReviewManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      decision: z.enum(["approved", "rejected", "pending"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);
    await admin
      .from("manager_approval")
      .update({
        status: data.decision,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("user_id", data.userId);
    return { ok: true };
  });

export const ownerListBaseTournaments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);
    const { data } = await admin
      .from("base_tournaments")
      .select("*, themes(name, colors)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const ownerGenerateWorldCup2026 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z
      .object({
        defaultExactPoints: z.number().int().min(0).max(1000).optional(),
        defaultTendencyPoints: z.number().int().min(0).max(1000).optional(),
        defaultIncorrectPoints: z.number().int().min(-1000).max(1000).optional(),
      })
      .optional(),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);
    const { WC2026_BONUS } = await import("@/lib/wc2026-fixtures");

    const slug = "world-cup-2026";
    const { data: existing } = await admin
      .from("base_tournaments")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    // Attach the WC2026 theme if present.
    const { data: theme } = await admin
      .from("themes")
      .select("id")
      .eq("name", "World Cup 2026")
      .maybeSingle();

    const baseFields = {
      name: "World Cup 2026",
      slug,
      sport_type: "football",
      season: "2026",
      description: "FIFA World Cup 2026 empty template — upload teams and fixtures to build the tournament.",
      status: "published",
      theme_id: theme?.id ?? null,
      default_exact_points: data?.defaultExactPoints ?? 3,
      default_tendency_points: data?.defaultTendencyPoints ?? 1,
      default_incorrect_points: data?.defaultIncorrectPoints ?? 0,
      default_bonus: WC2026_BONUS,
      starts_at: "2026-06-11T16:00:00.000Z",
      created_by: context.userId,
    };

    let base: { id: string };
    if (existing) {
      // Regenerate cleanly: wipe old fixtures, results and predictions for this
      // tournament (FK cascade removes match_results / match_predictions), then
      // rebuild from scratch while keeping any existing leagues attached.
      const { error: matchDeleteErr } = await admin
        .from("matches")
        .delete()
        .eq("base_tournament_id", existing.id);
      if (matchDeleteErr) throw new Error(matchDeleteErr.message);
      const { error: teamDeleteErr } = await admin
        .from("teams")
        .delete()
        .eq("base_tournament_id", existing.id);
      if (teamDeleteErr) throw new Error(teamDeleteErr.message);
      const { error: updErr } = await admin
        .from("base_tournaments")
        .update(baseFields)
        .eq("id", existing.id);
      if (updErr) throw new Error(updErr.message);
      base = { id: existing.id };
    } else {
      const { data: created, error: baseErr } = await admin
        .from("base_tournaments")
        .insert(baseFields)
        .select("id")
        .single();
      if (baseErr) throw new Error(baseErr.message);
      base = created;
    }

    return { ok: true, baseTournamentId: base.id, teams: 0, matches: 0 };
  });

export const ownerListThemes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);
    const { data } = await admin.from("themes").select("*").order("name");
    return data ?? [];
  });

const themeInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  sport_type: z.string().min(1).max(40),
  colors: z.object({
    background: z.string().max(40),
    card: z.string().max(40),
    primary: z.string().max(40),
    accent: z.string().max(40),
    ring: z.string().max(40),
  }),
  typography: z.object({
    display: z.string().max(60),
    body: z.string().max(60),
  }),
  is_published: z.boolean(),
});

export const ownerSaveTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(themeInput)
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);
    const row = {
      name: data.name,
      sport_type: data.sport_type,
      colors: data.colors,
      typography: data.typography,
      is_published: data.is_published,
      created_by: context.userId,
    };
    if (data.id) {
      await admin.from("themes").update(row).eq("id", data.id);
      return { ok: true, id: data.id };
    }
    const { data: created, error } = await admin
      .from("themes")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: created.id };
  });

export const ownerAssignTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ baseTournamentId: z.string().uuid(), themeId: z.string().uuid() }),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);
    await admin
      .from("base_tournaments")
      .update({ theme_id: data.themeId })
      .eq("id", data.baseTournamentId);
    await admin.from("tournament_theme_assignments").insert({
      base_tournament_id: data.baseTournamentId,
      theme_id: data.themeId,
      assigned_by: context.userId,
    });
    return { ok: true };
  });

/* ----------------------------- MANAGER ----------------------------- */
export const listBaseTournamentsForManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await ctx();
    const { assertApprovedManager } = await import("./authz.server");
    await assertApprovedManager(admin, context.userId);
    const { data } = await admin
      .from("base_tournaments")
      .select("id, name, sport_type, season, default_bonus, default_exact_points, default_tendency_points, default_incorrect_points")
      .eq("status", "published")
      .order("name");
    return data ?? [];
  });

export const listMyLeagues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await ctx();
    const { assertApprovedManager } = await import("./authz.server");
    await assertApprovedManager(admin, context.userId);
    const { data } = await admin
      .from("private_leagues")
      .select("*, base_tournaments(name, sport_type)")
      .eq("manager_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const createLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      baseTournamentId: z.string().uuid(),
      name: z.string().min(1).max(80),
      isPublic: z.boolean(),
    }),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertApprovedManager, slugify, makeToken } = await import("./authz.server");
    await assertApprovedManager(admin, context.userId);

    const { data: base } = await admin
      .from("base_tournaments")
      .select("*")
      .eq("id", data.baseTournamentId)
      .maybeSingle();
    if (!base) throw new Error("Tournament not found.");

    const slug = `${slugify(data.name)}-${makeToken().slice(0, 6)}`;
    const { data: league, error } = await admin
      .from("private_leagues")
      .insert({
        base_tournament_id: base.id,
        manager_id: context.userId,
        name: data.name,
        slug,
        is_public: data.isPublic,
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);

    await admin.from("scoring_rules").insert({
      league_id: league.id,
      name: "Default",
      exact_score_points: base.default_exact_points ?? 3,
      tendency_points: base.default_tendency_points ?? 1,
      incorrect_points: base.default_incorrect_points ?? 0,
      created_by: context.userId,
    });

    const bonus = (base.default_bonus ?? []) as any[];
    if (bonus.length) {
      await admin.from("bonus_rules").insert(
        bonus.map((b, i) => ({
          league_id: league.id,
          bonus_key: b.bonus_key,
          label: b.label,
          input_type: b.input_type ?? "text",
          points: b.points ?? 1,
          sort_order: b.sort_order ?? i,
        })),
      );
    }
    return { ok: true, leagueId: league.id, slug: league.slug };
  });

export const getLeagueManage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ leagueId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertLeagueAccess } = await import("./authz.server");
    const league = await assertLeagueAccess(admin, context.userId, data.leagueId);
    const { data: base } = await admin
      .from("base_tournaments")
      .select("*")
      .eq("id", (league as any).base_tournament_id)
      .maybeSingle();
    if (!base) throw new Error("Tournament not found.");
    const [participants, teams, matches, bonusRules, scoring] = await Promise.all([
      admin.from("league_participants").select("*").eq("league_id", league.id),
      admin.from("teams").select("*").eq("base_tournament_id", base.id),
      admin.from("matches").select("*").eq("base_tournament_id", base.id).order("match_time", { nullsFirst: false }),
      admin.from("bonus_rules").select("*").eq("league_id", league.id).order("sort_order"),
      admin.from("scoring_rules").select("*").eq("league_id", league.id).maybeSingle(),
    ]);
    const partIds = (participants.data ?? []).map((p: any) => p.id);
    const { data: links } = partIds.length
      ? await admin.from("player_links").select("participant_id, token").in("participant_id", partIds)
      : { data: [] as any[] };
    const matchIds = (matches.data ?? []).map((m: any) => m.id);
    const { data: results } = matchIds.length
      ? await admin.from("match_results").select("match_id, home_score, away_score").in("match_id", matchIds)
      : { data: [] as any[] };
    return {
      league,
      base,
      participants: participants.data ?? [],
      links: links ?? [],
      teams: teams.data ?? [],
      matches: matches.data ?? [],
      bonusRules: bonusRules.data ?? [],
      scoring: scoring.data ?? null,
      results: results ?? [],
    };
  });

export const addParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      leagueId: z.string().uuid(),
      name: z.string().min(1).max(80),
      email: z.string().email().max(120).optional().or(z.literal("")),
    }),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertLeagueAccess, makeToken } = await import("./authz.server");
    await assertLeagueAccess(admin, context.userId, data.leagueId);
    const { data: part, error } = await admin
      .from("league_participants")
      .insert({ league_id: data.leagueId, name: data.name, email: data.email || null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const token = makeToken();
    await admin
      .from("player_links")
      .insert({ participant_id: part.id, league_id: data.leagueId, token });
    return { ok: true, token };
  });

export const removeParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ leagueId: z.string().uuid(), participantId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertLeagueAccess } = await import("./authz.server");
    await assertLeagueAccess(admin, context.userId, data.leagueId);
    await admin.from("player_links").delete().eq("participant_id", data.participantId);
    await admin.from("match_predictions").delete().eq("participant_id", data.participantId);
    await admin.from("bonus_predictions").delete().eq("participant_id", data.participantId);
    await admin.from("league_participants").delete().eq("id", data.participantId);
    return { ok: true };
  });

export const setLeagueLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ leagueId: z.string().uuid(), locked: z.boolean() }))
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertLeagueAccess } = await import("./authz.server");
    await assertLeagueAccess(admin, context.userId, data.leagueId);
    await admin
      .from("private_leagues")
      .update({ predictions_locked: data.locked })
      .eq("id", data.leagueId);
    return { ok: true };
  });

export const setMatchResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      leagueId: z.string().uuid(),
      matchId: z.string().uuid(),
      homeScore: z.number().int().min(0).max(99),
      awayScore: z.number().int().min(0).max(99),
    }),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertLeagueAccess } = await import("./authz.server");
    const league = await assertLeagueAccess(admin, context.userId, data.leagueId);
    await admin.from("match_results").upsert(
      {
        match_id: data.matchId,
        home_score: data.homeScore,
        away_score: data.awayScore,
        source: "manual",
        status: "final",
        entered_by: context.userId,
      },
      { onConflict: "match_id" },
    );
    const { recomputeBaseTournament } = await import("./scoring-engine.server");
    await recomputeBaseTournament(admin, (league as any).base_tournament_id);
    return { ok: true };
  });

/* -------------------------- BULK IMPORT --------------------------- */
const importInput = z.object({
  leagueId: z.string().uuid(),
  participants: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        predictions: z
          .array(
            z.object({
              homeTeam: z.string().min(1).max(80),
              awayTeam: z.string().min(1).max(80),
              homeScore: z.number().int().min(0).max(99).nullable(),
              awayScore: z.number().int().min(0).max(99).nullable(),
              raw: z.string().max(400).optional(),
              confidence: z.enum(["high", "medium", "low"]).optional(),
              needsReview: z.boolean(),
            }),
          )
          .max(500),
      }),
    )
    .min(1)
    .max(200),
});

function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export const importPredictionsForLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(importInput)
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertApprovedManager, assertLeagueAccess } = await import("./authz.server");
    await assertApprovedManager(admin, context.userId);
    const league = await assertLeagueAccess(admin, context.userId, data.leagueId);
    const baseTournamentId = (league as any).base_tournament_id;

    // Teams lookup: normalized name + short_code -> team id.
    const { data: teams } = await admin
      .from("teams")
      .select("id, name, short_code")
      .eq("base_tournament_id", baseTournamentId);
    const teamByKey = new Map<string, string>();
    for (const t of teams ?? []) {
      if (t.name) teamByKey.set(normName(t.name), t.id);
      if (t.short_code) teamByKey.set(normName(t.short_code), t.id);
    }

    // Matches lookup: unordered team pair -> { matchId, homeTeamId }.
    const { data: matches } = await admin
      .from("matches")
      .select("id, home_team_id, away_team_id")
      .eq("base_tournament_id", baseTournamentId);
    const matchByPair = new Map<string, { matchId: string; homeTeamId: string }>();
    for (const m of matches ?? []) {
      if (!m.home_team_id || !m.away_team_id) continue;
      const key = [m.home_team_id, m.away_team_id].sort().join("|");
      matchByPair.set(key, { matchId: m.id, homeTeamId: m.home_team_id });
    }

    // Existing participants by normalized name.
    const { data: existingParts } = await admin
      .from("league_participants")
      .select("id, name")
      .eq("league_id", data.leagueId);
    const partByName = new Map<string, string>();
    for (const p of existingParts ?? []) partByName.set(normName(p.name), p.id);

    const { makeToken } = await import("./authz.server");

    let importedPredictions = 0;
    let importedPlayers = 0;
    const rows: {
      participant_id: string;
      league_id: string;
      match_id: string;
      home_score: number;
      away_score: number;
    }[] = [];

    for (const participant of data.participants) {
      const usable = participant.predictions.filter(
        (p) => !p.needsReview && p.homeScore !== null && p.awayScore !== null,
      );
      if (usable.length === 0) continue;

      // Find or create participant.
      let participantId = partByName.get(normName(participant.name));
      if (!participantId) {
        const { data: created, error } = await admin
          .from("league_participants")
          .insert({ league_id: data.leagueId, name: participant.name })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        participantId = created.id;
        partByName.set(normName(participant.name), participantId);
        await admin.from("player_links").insert({
          participant_id: participantId,
          league_id: data.leagueId,
          token: makeToken(),
        });
      }
      importedPlayers++;

      for (const pred of usable) {
        const homeId = teamByKey.get(normName(pred.homeTeam));
        const awayId = teamByKey.get(normName(pred.awayTeam));
        if (!homeId || !awayId) continue;
        const found = matchByPair.get([homeId, awayId].sort().join("|"));
        if (!found) continue;
        // Orient scores to the match's actual home team.
        const homeScore = found.homeTeamId === homeId ? pred.homeScore! : pred.awayScore!;
        const awayScore = found.homeTeamId === homeId ? pred.awayScore! : pred.homeScore!;
        rows.push({
          participant_id: participantId,
          league_id: data.leagueId,
          match_id: found.matchId,
          home_score: homeScore,
          away_score: awayScore,
        });
        importedPredictions++;
      }
    }

    if (rows.length) {
      const { error } = await admin
        .from("match_predictions")
        .upsert(rows, { onConflict: "participant_id,match_id" });
      if (error) throw new Error(error.message);
    }

    return { ok: true, importedPredictions, importedPlayers };
  });

export const setBonusCorrect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      leagueId: z.string().uuid(),
      bonusKey: z.string().max(60),
      value: z.string().max(120),
    }),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertLeagueAccess } = await import("./authz.server");
    await assertLeagueAccess(admin, context.userId, data.leagueId);
    await admin
      .from("bonus_rules")
      .update({ correct_value: data.value })
      .eq("league_id", data.leagueId)
      .eq("bonus_key", data.bonusKey);
    const { recomputeLeague, rebuildLeaderboard } = await import("./scoring-engine.server");
    await recomputeLeague(admin, data.leagueId);
    await rebuildLeaderboard(admin, data.leagueId);
    return { ok: true };
  });

/* --------------------------- SCORING RULES --------------------------- */
export const saveScoringRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      leagueId: z.string().uuid(),
      exactScorePoints: z.number().int().min(0).max(1000),
      tendencyPoints: z.number().int().min(0).max(1000),
      incorrectPoints: z.number().int().min(-1000).max(1000),
    }),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertLeagueAccess } = await import("./authz.server");
    await assertLeagueAccess(admin, context.userId, data.leagueId);
    const { error } = await admin.from("scoring_rules").upsert(
      {
        league_id: data.leagueId,
        name: "Default",
        exact_score_points: data.exactScorePoints,
        tendency_points: data.tendencyPoints,
        incorrect_points: data.incorrectPoints,
        created_by: context.userId,
      },
      { onConflict: "league_id" },
    );
    if (error) throw new Error(error.message);
    const { recomputeLeague, rebuildLeaderboard } = await import("./scoring-engine.server");
    await recomputeLeague(admin, data.leagueId);
    await rebuildLeaderboard(admin, data.leagueId);
    return { ok: true };
  });

/* --------------------------- BONUS RULES ---------------------------- */
export const upsertBonusRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      leagueId: z.string().uuid(),
      id: z.string().uuid().optional(),
      label: z.string().min(1).max(160),
      points: z.number().int().min(0).max(1000),
      correctValue: z.string().max(120).nullable().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertLeagueAccess } = await import("./authz.server");
    await assertLeagueAccess(admin, context.userId, data.leagueId);
    const correct = data.correctValue && data.correctValue.length ? data.correctValue : null;
    if (data.id) {
      const { error } = await admin
        .from("bonus_rules")
        .update({ label: data.label, points: data.points, correct_value: correct })
        .eq("id", data.id)
        .eq("league_id", data.leagueId);
      if (error) throw new Error(error.message);
    } else {
      const { data: existing } = await admin
        .from("bonus_rules")
        .select("sort_order")
        .eq("league_id", data.leagueId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextSort = ((existing as any)?.sort_order ?? -1) + 1;
      const bonusKey = `bonus_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await admin.from("bonus_rules").insert({
        league_id: data.leagueId,
        bonus_key: bonusKey,
        label: data.label,
        input_type: "text",
        points: data.points,
        correct_value: correct,
        sort_order: nextSort,
      });
      if (error) throw new Error(error.message);
    }
    const { recomputeLeague, rebuildLeaderboard } = await import("./scoring-engine.server");
    await recomputeLeague(admin, data.leagueId);
    await rebuildLeaderboard(admin, data.leagueId);
    return { ok: true };
  });

export const deleteBonusRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ leagueId: z.string().uuid(), id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertLeagueAccess } = await import("./authz.server");
    await assertLeagueAccess(admin, context.userId, data.leagueId);
    const { error } = await admin
      .from("bonus_rules")
      .delete()
      .eq("id", data.id)
      .eq("league_id", data.leagueId);
    if (error) throw new Error(error.message);
    const { recomputeLeague, rebuildLeaderboard } = await import("./scoring-engine.server");
    await recomputeLeague(admin, data.leagueId);
    await rebuildLeaderboard(admin, data.leagueId);
    return { ok: true };
  });

export const clearBonusRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ leagueId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertLeagueAccess } = await import("./authz.server");
    await assertLeagueAccess(admin, context.userId, data.leagueId);
    const { error } = await admin.from("bonus_rules").delete().eq("league_id", data.leagueId);
    if (error) throw new Error(error.message);
    const { recomputeLeague, rebuildLeaderboard } = await import("./scoring-engine.server");
    await recomputeLeague(admin, data.leagueId);
    await rebuildLeaderboard(admin, data.leagueId);
    return { ok: true };
  });

/* ----------------------------- IMPORT TEAMS / MATCHES ----------------------------- */
export const ownerImportTeams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      baseTournamentId: z.string().uuid(),
      teams: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(120),
            short_code: z.string().trim().min(1).max(10),
            flag_emoji: z.string().trim().max(16).optional().nullable(),
            group_name: z.string().trim().max(40).optional().nullable(),
          }),
        )
        .min(1)
        .max(500),
    }),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);

    await admin.from("matches").delete().eq("base_tournament_id", data.baseTournamentId);
    await admin.from("teams").delete().eq("base_tournament_id", data.baseTournamentId);

    const byCode = new Map(
      [] as [string, string][],
    );

    let inserted = 0;
    let updated = 0;
    for (const t of data.teams) {
      const code = t.short_code.trim();
      const row = {
        name: t.name.trim(),
        short_code: code,
        flag_emoji: t.flag_emoji?.trim() || null,
        group_name: t.group_name?.trim() || null,
      };
      const id = byCode.get(code.toLowerCase());
      if (id) {
        const { error } = await admin.from("teams").update(row).eq("id", id);
        if (error) throw new Error(error.message);
        updated += 1;
      } else {
        const { data: ins, error } = await admin
          .from("teams")
          .insert({ ...row, base_tournament_id: data.baseTournamentId })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        byCode.set(code.toLowerCase(), ins.id);
        inserted += 1;
      }
    }
    return { inserted, updated, replaced: true };
  });

export const ownerImportMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      baseTournamentId: z.string().uuid(),
      matches: z
        .array(
          z.object({
            home: z.string().trim().min(1).max(10),
            away: z.string().trim().min(1).max(10),
            group_name: z.string().trim().max(40).optional().nullable(),
            stage: z.string().trim().max(40).optional().nullable(),
            match_time: z.string().trim().max(40).optional().nullable(),
            venue: z.string().trim().max(120).optional().nullable(),
            city: z.string().trim().max(120).optional().nullable(),
          }),
        )
        .min(1)
        .max(500),
    }),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);

    const { data: teams } = await admin
      .from("teams")
      .select("id, short_code")
      .eq("base_tournament_id", data.baseTournamentId);
    const teamByCode = new Map(
      (teams ?? []).map((t: any) => [String(t.short_code).toLowerCase(), t.id]),
    );

    await admin.from("matches").delete().eq("base_tournament_id", data.baseTournamentId);

    const matchKey = (h: string, a: string) => `${h}::${a}`;
    const byPair = new Map(
      [] as [string, string][],
    );

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const m of data.matches) {
      const homeId = teamByCode.get(m.home.trim().toLowerCase());
      const awayId = teamByCode.get(m.away.trim().toLowerCase());
      if (!homeId || !awayId) {
        const missing = [!homeId ? m.home : null, !awayId ? m.away : null]
          .filter(Boolean)
          .join(" / ");
        errors.push(`Could not resolve ${missing} (${m.home} vs ${m.away})`);
        continue;
      }
      const row = {
        match_time: m.match_time?.trim() || null,
        venue: m.venue?.trim() || null,
        city: m.city?.trim() || null,
        stage: m.stage?.trim() || "group",
        group_name: m.group_name?.trim() || null,
      };
      const id = byPair.get(matchKey(homeId, awayId));
      if (id) {
        const { error } = await admin.from("matches").update(row).eq("id", id);
        if (error) throw new Error(error.message);
        updated += 1;
      } else {
        const { data: ins, error } = await admin
          .from("matches")
          .insert({
            ...row,
            base_tournament_id: data.baseTournamentId,
            home_team_id: homeId,
            away_team_id: awayId,
            status: "scheduled",
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        byPair.set(matchKey(homeId, awayId), ins.id);
        inserted += 1;
      }
    }
    return { inserted, updated, errors, replaced: true };
  });

/* ----------------------------- OWNER LEAGUE/TOURNAMENT MGMT ----------------------------- */
export const ownerListAllLeagues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);

    const { data: leagues } = await admin
      .from("private_leagues")
      .select("id, name, slug, manager_id, base_tournament_id")
      .order("created_at", { ascending: false });
    const rows = leagues ?? [];

    const managerIds = [...new Set(rows.map((l: any) => l.manager_id).filter(Boolean))];
    const baseIds = [...new Set(rows.map((l: any) => l.base_tournament_id).filter(Boolean))];

    const { data: profiles } = managerIds.length
      ? await admin.from("profiles").select("id, display_name, email").in("id", managerIds)
      : { data: [] as any[] };
    const { data: bases } = baseIds.length
      ? await admin.from("base_tournaments").select("id, name").in("id", baseIds)
      : { data: [] as any[] };

    const profById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const baseById = new Map((bases ?? []).map((b: any) => [b.id, b]));

    return rows.map((l: any) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      managerName:
        profById.get(l.manager_id)?.display_name ??
        profById.get(l.manager_id)?.email ??
        "Unknown",
      baseTournamentName: baseById.get(l.base_tournament_id)?.name ?? "—",
    }));
  });

export const deleteLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ leagueId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);
    const { error } = await admin
      .from("private_leagues")
      .delete()
      .eq("id", data.leagueId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ownerUpdateBaseTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(120),
      description: z.string().trim().max(2000).optional().nullable(),
      season: z.string().trim().max(40).optional().nullable(),
      sport_type: z.string().trim().min(1).max(40),
      status: z.enum(["draft", "active", "archived", "published"]),
      starts_at: z.string().trim().max(40).optional().nullable(),
      default_exact_points: z.number().int().min(0).max(1000),
      default_tendency_points: z.number().int().min(0).max(1000),
      default_incorrect_points: z.number().int().min(-1000).max(1000),
    }),
  )
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);
    const { data: row, error } = await admin
      .from("base_tournaments")
      .update({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        season: data.season?.trim() || null,
        sport_type: data.sport_type.trim(),
        status: data.status,
        starts_at: data.starts_at?.trim() || null,
        default_exact_points: data.default_exact_points,
        default_tendency_points: data.default_tendency_points,
        default_incorrect_points: data.default_incorrect_points,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const ownerDeleteBaseTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);
    const { count } = await admin
      .from("private_leagues")
      .select("id", { count: "exact", head: true })
      .eq("base_tournament_id", data.id);
    if ((count ?? 0) > 0) {
      throw new Error("Cannot delete: leagues exist for this tournament.");
    }
    const { error } = await admin
      .from("base_tournaments")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ownerCleanOrphanResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await ctx();
    const { assertOwner } = await import("./authz.server");
    await assertOwner(admin, context.userId);

    // Valid sets to compare against.
    const { data: validBases } = await admin.from("base_tournaments").select("id");
    const validBaseIds = new Set((validBases ?? []).map((b: any) => b.id));

    // 1) Remove matches that belong to a tournament that no longer exists.
    const { data: allMatches } = await admin
      .from("matches")
      .select("id, base_tournament_id");
    const orphanMatchIds = (allMatches ?? [])
      .filter((m: any) => !validBaseIds.has(m.base_tournament_id))
      .map((m: any) => m.id);
    if (orphanMatchIds.length > 0) {
      await admin.from("matches").delete().in("id", orphanMatchIds);
    }

    // Recompute valid match ids after the cleanup above.
    const { data: validMatches } = await admin.from("matches").select("id");
    const validIds = new Set((validMatches ?? []).map((m: any) => m.id));

    // 2) Remove results whose match no longer exists.
    const { data: orphans } = await admin
      .from("match_results")
      .select("id, match_id");
    const toDelete = (orphans ?? [])
      .filter((r: any) => !validIds.has(r.match_id))
      .map((r: any) => r.id);
    if (toDelete.length > 0) {
      await admin.from("match_results").delete().in("id", toDelete);
    }

    // 3) Remove predictions pointing to non-existent matches.
    const { data: orphanPreds } = await admin
      .from("match_predictions")
      .select("id, match_id");
    const predsToDelete = (orphanPreds ?? [])
      .filter((p: any) => !validIds.has(p.match_id))
      .map((p: any) => p.id);
    if (predsToDelete.length > 0) {
      await admin.from("match_predictions").delete().in("id", predsToDelete);
    }

    return { deleted: toDelete.length + orphanMatchIds.length + predsToDelete.length };
  });
