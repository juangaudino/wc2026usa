import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { DEFAULT_BONUS_FIELDS } from "@/lib/scoring";
import { parsePredictionText } from "@/lib/import-parser";

// NOTE: All admin functions use the service-role admin client (RLS bypassed).
// Tables are locked to clients; the app only reaches them through these
// trusted server functions. Auth gating for admins is a future enhancement.

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function token() {
  return (
    Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
  );
}

/* ------------------------------- THEMES ------------------------------- */
export const listThemes = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("themes").select("*").order("created_at", { ascending: false });
  return data ?? [];
});

export const saveTheme = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(80),
      sport_type: z.string().min(1).max(40),
      colors: z.record(z.string()).default({}),
      logo_url: z.string().max(500).optional().nullable(),
      background_url: z.string().max(500).optional().nullable(),
      typography: z.record(z.string()).default({}),
      button_style: z.record(z.string()).default({}),
      asset_urls: z.record(z.string()).default({}),
      is_active: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("themes")
        .update(data)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabaseAdmin.from("themes").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTheme = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("themes").delete().eq("id", data.id);
    return { ok: true };
  });

/* --------------------------- SCORING PRESETS -------------------------- */
export const listScoringRules = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("scoring_rules").select("*").order("created_at");
  return data ?? [];
});

export const saveScoringRule = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(80),
      exact_score_points: z.number().int().min(0).max(100),
      tendency_points: z.number().int().min(0).max(100),
      incorrect_points: z.number().int().min(0).max(100),
      is_preset: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("scoring_rules")
        .update(data)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabaseAdmin.from("scoring_rules").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ----------------------------- TOURNAMENTS ---------------------------- */
export const listTournamentsAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tournaments")
    .select("*, themes(name)")
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const createTournament = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(120),
      sport_type: z.string().min(1).max(40).default("football"),
      description: z.string().max(2000).optional().nullable(),
      theme_id: z.string().uuid().optional().nullable(),
      scoring_rules_id: z.string().uuid().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let slug = slugify(data.name);
    const { data: existing } = await supabaseAdmin.from("tournaments").select("id").eq("slug", slug).maybeSingle();
    if (existing) slug = `${slug}-${token().slice(0, 4)}`;
    const { data: row, error } = await supabaseAdmin
      .from("tournaments")
      .insert({
        ...data,
        slug,
        bonus_config: DEFAULT_BONUS_FIELDS as any,
        status: "active",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTournament = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(120).optional(),
      description: z.string().max(2000).optional().nullable(),
      theme_id: z.string().uuid().optional().nullable(),
      scoring_rules_id: z.string().uuid().optional().nullable(),
      status: z.string().optional(),
      predictions_locked: z.boolean().optional(),
      deadline: z.string().optional().nullable(),
      bonus_config: z.array(z.any()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const { data: row, error } = await supabaseAdmin
      .from("tournaments")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// Full admin data bundle for a tournament.
export const getTournamentAdmin = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.id;
    const [tournament, teams, matches, participants, links, results] = await Promise.all([
      supabaseAdmin.from("tournaments").select("*").eq("id", id).maybeSingle(),
      supabaseAdmin.from("teams").select("*").eq("tournament_id", id).order("name"),
      supabaseAdmin.from("matches").select("*").eq("tournament_id", id).order("match_time", { nullsFirst: false }),
      supabaseAdmin.from("participants").select("*").eq("tournament_id", id).order("name"),
      supabaseAdmin.from("prediction_links").select("*").eq("tournament_id", id),
      supabaseAdmin
        .from("results")
        .select("*, matches!inner(tournament_id)")
        .eq("matches.tournament_id", id),
    ]);
    return {
      tournament: tournament.data,
      teams: teams.data ?? [],
      matches: matches.data ?? [],
      participants: participants.data ?? [],
      links: links.data ?? [],
      results: results.data ?? [],
    };
  });

/* -------------------------------- TEAMS ------------------------------- */
export const saveTeam = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      tournament_id: z.string().uuid(),
      name: z.string().min(1).max(80),
      short_code: z.string().max(6).optional().nullable(),
      flag_emoji: z.string().max(12).optional().nullable(),
      group_name: z.string().max(20).optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { data: row, error } = await supabaseAdmin.from("teams").update(data).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabaseAdmin.from("teams").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("teams").delete().eq("id", data.id);
    return { ok: true };
  });

/* ------------------------------- MATCHES ------------------------------ */
export const saveMatch = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      tournament_id: z.string().uuid(),
      home_team_id: z.string().uuid().nullable().optional(),
      away_team_id: z.string().uuid().nullable().optional(),
      stage: z.string().max(40).default("group"),
      match_time: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { data: row, error } = await supabaseAdmin.from("matches").update(data).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabaseAdmin.from("matches").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMatch = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("matches").delete().eq("id", data.id);
    return { ok: true };
  });

export const setMatchLock = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), locked: z.boolean() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("matches").update({ locked: data.locked }).eq("id", data.id);
    return { ok: true };
  });

/* ------------------------- RESULTS (auditable) ------------------------ */
export const enterResult = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      match_id: z.string().uuid(),
      home_score: z.number().int().min(0).max(99),
      away_score: z.number().int().min(0).max(99),
      source: z.string().max(40).default("manual"),
      note: z.string().max(300).optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recomputeMatch, rebuildLeaderboard } = await import("./scoring-engine.server");

    const { data: match } = await supabaseAdmin
      .from("matches")
      .select("tournament_id")
      .eq("id", data.match_id)
      .maybeSingle();
    if (!match) throw new Error("Match not found");

    const { data: prev } = await supabaseAdmin
      .from("results")
      .select("home_score, away_score")
      .eq("match_id", data.match_id)
      .maybeSingle();

    // Audit log of every change/correction.
    await supabaseAdmin.from("result_change_log").insert({
      match_id: data.match_id,
      old_home: prev?.home_score ?? null,
      old_away: prev?.away_score ?? null,
      new_home: data.home_score,
      new_away: data.away_score,
      source: data.source,
      note: data.note ?? null,
    });

    await supabaseAdmin
      .from("results")
      .upsert(
        {
          match_id: data.match_id,
          home_score: data.home_score,
          away_score: data.away_score,
          source: data.source,
        },
        { onConflict: "match_id" },
      );

    await supabaseAdmin.from("matches").update({ status: "finished", locked: true }).eq("id", data.match_id);
    await recomputeMatch(supabaseAdmin, data.match_id);
    await rebuildLeaderboard(supabaseAdmin, match.tournament_id);
    return { ok: true };
  });

export const getResultLog = createServerFn({ method: "GET" })
  .inputValidator(z.object({ tournament_id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("result_change_log")
      .select("*, matches!inner(tournament_id)")
      .eq("matches.tournament_id", data.tournament_id)
      .order("changed_at", { ascending: false })
      .limit(100);
    return rows ?? [];
  });

/* ------------------------------ BONUS RESULTS ------------------------- */
export const setBonusAnswers = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      tournament_id: z.string().uuid(),
      bonus_config: z.array(z.any()),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recomputeBonus, rebuildLeaderboard } = await import("./scoring-engine.server");
    await supabaseAdmin.from("tournaments").update({ bonus_config: data.bonus_config }).eq("id", data.tournament_id);
    await recomputeBonus(supabaseAdmin, data.tournament_id);
    await rebuildLeaderboard(supabaseAdmin, data.tournament_id);
    return { ok: true };
  });

/* ----------------------------- PARTICIPANTS --------------------------- */
export const addParticipant = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      tournament_id: z.string().uuid(),
      name: z.string().min(1).max(80),
      email: z.string().email().max(160).optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("participants")
      .insert({ tournament_id: data.tournament_id, name: data.name, email: data.email ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const { data: link } = await supabaseAdmin
      .from("prediction_links")
      .insert({ participant_id: p.id, tournament_id: data.tournament_id, token: token() })
      .select()
      .single();
    return { participant: p, link };
  });

export const deleteParticipant = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("participants").delete().eq("id", data.id);
    return { ok: true };
  });

/* ------------------------- IMPORT PREDICTIONS ------------------------- */
export const previewImport = createServerFn({ method: "POST" })
  .inputValidator(z.object({ tournament_id: z.string().uuid(), text: z.string().max(20000) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const parsed = parsePredictionText(data.text);

    const { data: teams } = await supabaseAdmin.from("teams").select("id, name").eq("tournament_id", data.tournament_id);
    const { data: matches } = await supabaseAdmin
      .from("matches")
      .select("id, home_team_id, away_team_id")
      .eq("tournament_id", data.tournament_id);

    const norm = (s: string) => s.trim().toLowerCase();
    const teamByName = new Map((teams ?? []).map((t) => [norm(t.name), t.id]));

    const findMatch = (home: string, away: string) => {
      const h = teamByName.get(norm(home));
      const a = teamByName.get(norm(away));
      if (!h || !a) return null;
      return (matches ?? []).find((m) => m.home_team_id === h && m.away_team_id === a) ?? null;
    };

    const result = parsed.map((p) => ({
      name: p.name,
      predictions: p.predictions.map((pr) => {
        const m = findMatch(pr.homeTeam, pr.awayTeam);
        return {
          ...pr,
          matchId: m?.id ?? null,
          matched: !!m,
        };
      }),
    }));
    return result;
  });

export const commitImport = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      tournament_id: z.string().uuid(),
      entries: z.array(
        z.object({
          name: z.string().min(1).max(80),
          predictions: z.array(
            z.object({
              matchId: z.string().uuid(),
              homeScore: z.number().int().min(0).max(99),
              awayScore: z.number().int().min(0).max(99),
            }),
          ),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let savedParticipants = 0;
    let savedPredictions = 0;
    for (const entry of data.entries) {
      // find or create participant
      let { data: p } = await supabaseAdmin
        .from("participants")
        .select("id")
        .eq("tournament_id", data.tournament_id)
        .ilike("name", entry.name)
        .maybeSingle();
      if (!p) {
        const ins = await supabaseAdmin
          .from("participants")
          .insert({ tournament_id: data.tournament_id, name: entry.name })
          .select("id")
          .single();
        p = ins.data;
        await supabaseAdmin
          .from("prediction_links")
          .insert({ participant_id: p!.id, tournament_id: data.tournament_id, token: token() });
        savedParticipants++;
      }
      for (const pr of entry.predictions) {
        await supabaseAdmin.from("match_predictions").upsert(
          {
            participant_id: p!.id,
            match_id: pr.matchId,
            home_score: pr.homeScore,
            away_score: pr.awayScore,
          },
          { onConflict: "participant_id,match_id" },
        );
        savedPredictions++;
      }
    }
    return { savedParticipants, savedPredictions };
  });

/* -------------------------- ALL PREDICTIONS --------------------------- */
export const getAllPredictions = createServerFn({ method: "GET" })
  .inputValidator(z.object({ tournament_id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: matches } = await supabaseAdmin.from("matches").select("id").eq("tournament_id", data.tournament_id);
    const ids = (matches ?? []).map((m) => m.id);
    if (!ids.length) return [];
    const { data: preds } = await supabaseAdmin
      .from("match_predictions")
      .select("*, participants(name)")
      .in("match_id", ids);
    return preds ?? [];
  });
