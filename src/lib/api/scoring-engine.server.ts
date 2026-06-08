// Server-only scoring orchestration. Recomputes points after results change
// and rebuilds leaderboard snapshots. Deterministic and auditable.
import { scorePrediction, scoreBonus, type ScoringConfig, type BonusField } from "@/lib/scoring";

type Admin = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

async function getScoringConfig(admin: Admin, tournamentId: string): Promise<ScoringConfig> {
  const { data: t } = await admin
    .from("tournaments")
    .select("scoring_rules_id")
    .eq("id", tournamentId)
    .maybeSingle();
  if (t?.scoring_rules_id) {
    const { data: r } = await admin
      .from("scoring_rules")
      .select("exact_score_points, tendency_points, incorrect_points")
      .eq("id", t.scoring_rules_id)
      .maybeSingle();
    if (r) {
      return {
        exactScorePoints: r.exact_score_points,
        tendencyPoints: r.tendency_points,
        incorrectPoints: r.incorrect_points,
      };
    }
  }
  return { exactScorePoints: 3, tendencyPoints: 1, incorrectPoints: 0 };
}

// Recompute all match prediction points for a single match.
export async function recomputeMatch(admin: Admin, matchId: string) {
  const { data: match } = await admin
    .from("matches")
    .select("id, tournament_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return;

  const { data: result } = await admin
    .from("results")
    .select("home_score, away_score")
    .eq("match_id", matchId)
    .maybeSingle();
  if (!result) return;

  const cfg = await getScoringConfig(admin, match.tournament_id);
  const { data: preds } = await admin
    .from("match_predictions")
    .select("id, home_score, away_score")
    .eq("match_id", matchId);

  for (const p of preds ?? []) {
    const { points } = scorePrediction(
      p.home_score,
      p.away_score,
      result.home_score,
      result.away_score,
      cfg,
    );
    await admin.from("match_predictions").update({ points }).eq("id", p.id);
  }
}

// Recompute bonus prediction points for a tournament using bonus_config.
export async function recomputeBonus(admin: Admin, tournamentId: string) {
  const { data: t } = await admin
    .from("tournaments")
    .select("bonus_config")
    .eq("id", tournamentId)
    .maybeSingle();
  const fields = (t?.bonus_config ?? []) as BonusField[];
  const byKey = new Map(fields.map((f) => [f.key, f]));

  const { data: preds } = await admin
    .from("bonus_predictions")
    .select("id, bonus_key, value")
    .eq("tournament_id", tournamentId);

  for (const p of preds ?? []) {
    const field = byKey.get(p.bonus_key);
    const points = field ? scoreBonus(p.value, field) : 0;
    await admin.from("bonus_predictions").update({ points }).eq("id", p.id);
  }
}

export interface LeaderboardRow {
  participantId: string;
  name: string;
  matchPoints: number;
  bonusPoints: number;
  total: number;
  exactCount: number;
  predictionCount: number;
  rank: number;
}

// Build leaderboard from current points, store a snapshot for rank movement.
export async function rebuildLeaderboard(admin: Admin, tournamentId: string): Promise<LeaderboardRow[]> {
  const { data: participants } = await admin
    .from("participants")
    .select("id, name")
    .eq("tournament_id", tournamentId);

  const { data: matches } = await admin
    .from("matches")
    .select("id")
    .eq("tournament_id", tournamentId);
  const matchIds = (matches ?? []).map((m) => m.id);

  const { data: mpreds } = matchIds.length
    ? await admin
        .from("match_predictions")
        .select("participant_id, points, home_score, away_score, match_id")
        .in("match_id", matchIds)
    : { data: [] as any[] };

  // exact = points === 3-ish; instead recompute exact flag from results
  const { data: results } = matchIds.length
    ? await admin.from("results").select("match_id, home_score, away_score").in("match_id", matchIds)
    : { data: [] as any[] };
  const resultMap = new Map((results ?? []).map((r) => [r.match_id, r]));

  const { data: bpreds } = await admin
    .from("bonus_predictions")
    .select("participant_id, points")
    .eq("tournament_id", tournamentId);

  const rows = (participants ?? []).map((p) => {
    const mine = (mpreds ?? []).filter((m) => m.participant_id === p.id);
    const matchPoints = mine.reduce((s, m) => s + (m.points ?? 0), 0);
    const exactCount = mine.filter((m) => {
      const r = resultMap.get(m.match_id);
      return r && r.home_score === m.home_score && r.away_score === m.away_score;
    }).length;
    const bonusPoints = (bpreds ?? [])
      .filter((b) => b.participant_id === p.id)
      .reduce((s, b) => s + (b.points ?? 0), 0);
    return {
      participantId: p.id,
      name: p.name,
      matchPoints,
      bonusPoints,
      total: matchPoints + bonusPoints,
      exactCount,
      predictionCount: mine.length,
      rank: 0,
    };
  });

  rows.sort((a, b) => b.total - a.total || b.exactCount - a.exactCount || a.name.localeCompare(b.name));
  rows.forEach((r, i) => (r.rank = i + 1));

  await admin.from("leaderboard_snapshots").insert({ tournament_id: tournamentId, data: rows as any });
  return rows;
}
