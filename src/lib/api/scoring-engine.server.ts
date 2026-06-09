// League-aware scoring engine. Pure DB orchestration around the pure scoring
// rules in src/lib/scoring.ts. Recomputes per private league.
import { scorePrediction } from "@/lib/scoring";

type Admin = any;

async function leagueScoring(admin: Admin, leagueId: string) {
  const { data } = await admin
    .from("scoring_rules")
    .select("exact_score_points, tendency_points, incorrect_points")
    .eq("league_id", leagueId)
    .maybeSingle();
  return {
    exactScorePoints: data?.exact_score_points ?? 3,
    tendencyPoints: data?.tendency_points ?? 1,
    incorrectPoints: data?.incorrect_points ?? 0,
  };
}

async function resultsForLeague(admin: Admin, baseTournamentId: string) {
  const { data: matches } = await admin
    .from("matches")
    .select("id")
    .eq("base_tournament_id", baseTournamentId);
  const ids = (matches ?? []).map((m: any) => m.id);
  if (!ids.length) return new Map<string, { home: number; away: number }>();
  const { data: results } = await admin
    .from("match_results")
    .select("match_id, home_score, away_score")
    .in("match_id", ids);
  const map = new Map<string, { home: number; away: number }>();
  for (const r of results ?? [])
    map.set(r.match_id, { home: r.home_score, away: r.away_score });
  return map;
}

/** Recompute every match + bonus prediction's points for one league. */
export async function recomputeLeague(admin: Admin, leagueId: string) {
  const { data: league } = await admin
    .from("private_leagues")
    .select("base_tournament_id")
    .eq("id", leagueId)
    .maybeSingle();
  if (!league) return;

  const cfg = await leagueScoring(admin, leagueId);
  const results = await resultsForLeague(admin, league.base_tournament_id);

  const { data: preds } = await admin
    .from("match_predictions")
    .select("id, match_id, home_score, away_score, points")
    .eq("league_id", leagueId);
  for (const p of preds ?? []) {
    const r = results.get(p.match_id);
    const pts = r
      ? scorePrediction(p.home_score, p.away_score, r.home, r.away, cfg).points
      : 0;
    if (pts !== p.points)
      await admin.from("match_predictions").update({ points: pts }).eq("id", p.id);
  }

  // Bonus
  const { data: rules } = await admin
    .from("bonus_rules")
    .select("bonus_key, points, correct_value")
    .eq("league_id", leagueId);
  const ruleMap = new Map((rules ?? []).map((r: any) => [r.bonus_key, r]));
  const { data: bpreds } = await admin
    .from("bonus_predictions")
    .select("id, bonus_key, value, points")
    .eq("league_id", leagueId);
  for (const b of bpreds ?? []) {
    const rule: any = ruleMap.get(b.bonus_key);
    let pts = 0;
    if (rule?.correct_value && b.value)
      pts =
        b.value.trim().toLowerCase() === rule.correct_value.trim().toLowerCase()
          ? rule.points
          : 0;
    if (pts !== b.points)
      await admin.from("bonus_predictions").update({ points: pts }).eq("id", b.id);
  }
}

export interface LeaderboardRow {
  participantId: string;
  name: string;
  points: number;
  exact: number;
  tendency: number;
  played: number;
  rank: number;
}

/** Rebuild the leaderboard for a league, snapshot it, and return the rows. */
export async function rebuildLeaderboard(
  admin: Admin,
  leagueId: string,
): Promise<LeaderboardRow[]> {
  const { data: league } = await admin
    .from("private_leagues")
    .select("base_tournament_id")
    .eq("id", leagueId)
    .maybeSingle();
  if (!league) return [];

  const results = await resultsForLeague(admin, league.base_tournament_id);
  const cfg = await leagueScoring(admin, leagueId);

  const { data: participants } = await admin
    .from("league_participants")
    .select("id, name")
    .eq("league_id", leagueId);
  const { data: preds } = await admin
    .from("match_predictions")
    .select("participant_id, match_id, home_score, away_score, points")
    .eq("league_id", leagueId);
  const { data: bpreds } = await admin
    .from("bonus_predictions")
    .select("participant_id, points")
    .eq("league_id", leagueId);

  const agg = new Map<string, LeaderboardRow>();
  for (const p of participants ?? [])
    agg.set(p.id, {
      participantId: p.id,
      name: p.name,
      points: 0,
      exact: 0,
      tendency: 0,
      played: 0,
      rank: 0,
    });

  for (const p of preds ?? []) {
    const row = agg.get(p.participant_id);
    if (!row) continue;
    row.points += p.points ?? 0;
    const r = results.get(p.match_id);
    if (r) {
      row.played++;
      const sb = scorePrediction(p.home_score, p.away_score, r.home, r.away, cfg);
      if (sb.outcome === "exact") row.exact++;
      else if (sb.outcome === "tendency") row.tendency++;
    }
  }
  for (const b of bpreds ?? []) {
    const row = agg.get(b.participant_id);
    if (row) row.points += b.points ?? 0;
  }

  const rows = [...agg.values()].sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name),
  );
  rows.forEach((r, i) => (r.rank = i + 1));

  await admin.from("leaderboard_snapshots").insert({ league_id: leagueId, data: rows });
  // Prune to the last 12 snapshots.
  const { data: snaps } = await admin
    .from("leaderboard_snapshots")
    .select("id")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false });
  const stale = (snaps ?? []).slice(12).map((s: any) => s.id);
  if (stale.length) await admin.from("leaderboard_snapshots").delete().in("id", stale);

  return rows;
}

/** Recompute every league built on a base tournament (e.g. after a result). */
export async function recomputeBaseTournament(admin: Admin, baseTournamentId: string) {
  const { data: leagues } = await admin
    .from("private_leagues")
    .select("id")
    .eq("base_tournament_id", baseTournamentId);
  for (const l of leagues ?? []) {
    await recomputeLeague(admin, l.id);
    await rebuildLeaderboard(admin, l.id);
  }
}
