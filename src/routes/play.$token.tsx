import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trophy, Crown, Lock, Check, Loader2, Target, Users } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/app/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamLabel } from "@/components/app/team-label";
import { fmtMatchTime, teamMap } from "@/lib/format";
import { themeStyleVars } from "@/lib/theme";
import { scorePrediction } from "@/lib/scoring";
import {
  getPlayerBoard,
  savePlayerPrediction,
  savePlayerBonus,
} from "@/lib/api/public.functions";

export const Route = createFileRoute("/play/$token")({
  head: () => ({ meta: [{ title: "Your Predictions · Predictor League" }] }),
  component: PlayerBoard,
});

function isLocked(tournament: any, match: any): boolean {
  const now = Date.now();
  const deadlinePassed = tournament?.deadline
    ? new Date(tournament.deadline).getTime() < now
    : false;
  const matchStarted = match?.match_time
    ? new Date(match.match_time).getTime() < now
    : false;
  return Boolean(
    tournament?.predictions_locked || match?.locked || deadlinePassed || matchStarted,
  );
}

function PlayerBoard() {
  const { token } = Route.useParams();
  const fetchBoard = useServerFn(getPlayerBoard);
  const { data, isLoading } = useQuery({
    queryKey: ["player-board", token],
    queryFn: () => fetchBoard({ data: { token } }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your board…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">Invalid link</h1>
          <p className="mt-2 text-muted-foreground">
            This prediction link is not valid. Please ask the organizer for a new one.
          </p>
        </main>
      </div>
    );
  }

  const league = data.league as any;
  const base = data.base as any;
  const tm = teamMap(data.teams as any);
  const resByMatch = new Map(data.results.map((r: any) => [r.match_id, r]));
  const predByMatch = new Map(data.predictions.map((p: any) => [p.match_id, p]));
  const bonusByKey = new Map(
    data.bonusPredictions.map((b: any) => [b.bonus_key, b.value]),
  );
  const bonusConfig = ((data.bonusRules ?? []) as any[]).map((b) => ({
    key: b.bonus_key,
    label: b.label,
    points: b.points,
  }));

  return (
    <div className="min-h-screen" style={themeStyleVars(base?.themes)}>
      <SiteHeader
        right={
          <Badge variant="outline" className="capitalize">
            {base?.sport_type}
          </Badge>
        }
      />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Badge variant="secondary">Player board</Badge>
        <h1 className="mt-2 font-display text-3xl font-bold">
          Hi, {data.participant.name} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          {league?.name} · {base?.name}
        </p>
        {league?.predictions_locked && (
          <Badge variant="secondary" className="mt-3">
            <Lock className="mr-1 h-3 w-3" /> Predictions locked
          </Badge>
        )}

        <Tabs defaultValue="matches" className="mt-6">
          <TabsList>
            <TabsTrigger value="matches">My Predictions</TabsTrigger>
            {bonusConfig.length > 0 && (
              <TabsTrigger value="bonus">Bonus</TabsTrigger>
            )}
            <TabsTrigger value="league">Prediction League</TabsTrigger>
            <TabsTrigger value="tournament">Tournament</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="mt-4">
            <MatchesPanel
              token={token}
              matches={data.matches as any[]}
              tm={tm}
              league={league}
              predByMatch={predByMatch}
              resByMatch={resByMatch}
            />
          </TabsContent>

          {bonusConfig.length > 0 && (
            <TabsContent value="bonus" className="mt-4 space-y-3">
              <Card className="glass-card flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Crown className="h-4 w-4 text-primary" /> Predict the tournament
                outcomes for bonus points.
              </Card>
              {bonusConfig.map((b: any) => (
                <BonusCard
                  key={b.key}
                  token={token}
                  field={b}
                  locked={Boolean(league?.predictions_locked)}
                  value={bonusByKey.get(b.key) ?? ""}
                />
              ))}
            </TabsContent>
          )}

          <TabsContent value="league" className="mt-4">
            <PredictionLeaguePanel
              playerName={data.participant.name}
              stats={(data as any).currentParticipantStats}
              leaderboard={(data as any).leaderboard ?? []}
            />
          </TabsContent>

          <TabsContent value="tournament" className="mt-4">
            <TournamentPanel standings={(data as any).groupStandings ?? []} />
          </TabsContent>
        </Tabs>

        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Trophy className="h-4 w-4" /> Friendly pool — no betting, just bragging
          rights.
        </p>
      </main>
    </div>
  );
}

function MatchesPanel({
  token,
  matches,
  tm,
  league,
  predByMatch,
  resByMatch,
}: {
  token: string;
  matches: any[];
  tm: Record<string, any>;
  league: any;
  predByMatch: Map<any, any>;
  resByMatch: Map<any, any>;
}) {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(savePlayerPrediction);

  const initial = useMemo(() => {
    const obj: Record<string, { home: string; away: string }> = {};
    for (const m of matches) {
      const p = predByMatch.get(m.id);
      obj[m.id] = {
        home: p?.home_score?.toString() ?? "",
        away: p?.away_score?.toString() ?? "",
      };
    }
    return obj;
  }, [matches, predByMatch]);

  const [localScores, setLocalScores] = useState<
    Record<string, { home: string; away: string }>
  >(initial);
  const [saving, setSaving] = useState(false);

  function onChange(matchId: string, home: string, away: string) {
    setLocalScores((prev) => ({ ...prev, [matchId]: { home, away } }));
  }

  const boardLocked = Boolean(league?.predictions_locked);

  const total = matches.length;
  const filled = matches.filter((m) => {
    const s = localScores[m.id];
    return s && s.home !== "" && s.away !== "";
  }).length;

  const dirty = matches.some((m) => {
    const s = localScores[m.id] ?? { home: "", away: "" };
    const i = initial[m.id] ?? { home: "", away: "" };
    return s.home !== i.home || s.away !== i.away;
  });

  async function saveAll() {
    setSaving(true);
    let count = 0;
    try {
      for (const m of matches) {
        if (isLocked(league, m)) continue;
        const s = localScores[m.id];
        if (!s) continue;
        const h = parseInt(s.home, 10);
        const a = parseInt(s.away, 10);
        if (Number.isNaN(h) || Number.isNaN(a)) continue;
        await saveFn({
          data: { token, matchId: m.id, homeScore: h, awayScore: a },
        });
        count += 1;
      }
      await queryClient.invalidateQueries({ queryKey: ["player-board", token] });
      toast.success("Predictions saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save predictions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="space-y-3 pb-24">
        {matches.length === 0 && (
          <p className="text-sm text-muted-foreground">No matches scheduled yet.</p>
        )}
        {matches.map((m) => {
          const s = localScores[m.id] ?? { home: "", away: "" };
          return (
            <MatchPredictionCard
              key={m.id}
              match={m}
              tm={tm}
              locked={isLocked(league, m)}
              prediction={predByMatch.get(m.id)}
              result={resByMatch.get(m.id)}
              localHome={s.home}
              localAway={s.away}
              onChange={onChange}
            />
          );
        })}
      </div>

      {!boardLocked && matches.length > 0 && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {filled} of {total} predictions filled
            </span>
            <Button
              className="w-full sm:w-auto"
              onClick={saveAll}
              disabled={saving || !dirty}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save all predictions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchPredictionCard({
  match,
  tm,
  locked,
  prediction,
  result,
  localHome,
  localAway,
  onChange,
}: {
  match: any;
  tm: Record<string, any>;
  locked: boolean;
  prediction?: any;
  result?: any;
  localHome: string;
  localAway: string;
  onChange: (matchId: string, home: string, away: string) => void;
}) {
  const hasResult = result != null;
  const breakdown =
    hasResult && prediction
      ? scorePrediction(
          prediction.home_score,
          prediction.away_score,
          result.home_score,
          result.away_score,
        )
      : null;

  return (
    <Card className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{fmtMatchTime(match.match_time)}</span>
        <span className="flex items-center gap-2">
          {match.group_name
            ? `Group ${match.group_name}`
            : match.stage
              ? <span className="capitalize">{match.stage}</span>
              : null}
          {locked && <Lock className="h-3 w-3" />}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamLabel team={tm[match.home_team_id]} />
        <div className="flex items-center gap-1">
          <Input
            inputMode="numeric"
            className="h-11 w-12 text-center font-display text-lg font-bold"
            value={localHome}
            disabled={locked}
            onChange={(e) =>
              onChange(
                match.id,
                e.target.value.replace(/\D/g, "").slice(0, 2),
                localAway,
              )
            }
          />
          <span className="text-muted-foreground">-</span>
          <Input
            inputMode="numeric"
            className="h-11 w-12 text-center font-display text-lg font-bold"
            value={localAway}
            disabled={locked}
            onChange={(e) =>
              onChange(
                match.id,
                localHome,
                e.target.value.replace(/\D/g, "").slice(0, 2),
              )
            }
          />
        </div>
        <TeamLabel team={tm[match.away_team_id]} align="right" />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          {hasResult && (
            <Badge variant="outline">
              Result {result.home_score}-{result.away_score}
            </Badge>
          )}
          {breakdown && (
            <Badge
              className={
                breakdown.outcome === "perfect"
                  ? "bg-primary text-primary-foreground"
                  : breakdown.outcome === "result"
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary"
              }
            >
              {breakdown.outcome === "perfect"
                ? "Perfect score"
                : breakdown.outcome === "result"
                  ? "Correct result"
                  : "Missed"}{" "}
              +{breakdown.points}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

function BonusCard({
  token,
  field,
  locked,
  value,
}: {
  token: string;
  field: any;
  locked: boolean;
  value: string;
}) {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(savePlayerBonus);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!val.trim()) {
      toast.error("Enter your pick.");
      return;
    }
    setSaving(true);
    try {
      await saveFn({ data: { token, bonusKey: field.key, value: val.trim() } });
      await queryClient.invalidateQueries({ queryKey: ["player-board", token] });
      toast.success("Bonus pick saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save bonus pick");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="font-semibold">{field.label}</span>
        </div>
        <Badge variant="outline">+{field.points} pts</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={val}
          disabled={locked}
          placeholder="Your pick"
          onChange={(e) => setVal(e.target.value)}
        />
        {!locked && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}

function PredictionLeaguePanel({
  playerName,
  stats,
  leaderboard,
}: {
  playerName: string;
  stats?: { totalPoints: number; exactHits: number; tendencyHits: number; rank: number; pendingMatches: number };
  leaderboard: Array<{ name: string; totalPoints: number; exactHits: number; tendencyHits: number; rank: number; isCurrent?: boolean }>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Prediction League Standings</h2>
      </div>

      {stats && (
        <Card className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Your standing</p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="font-display text-2xl font-bold">#{stats.rank}</p>
              <p className="text-xs text-muted-foreground">Rank</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{stats.totalPoints}</p>
              <p className="text-xs text-muted-foreground">Points</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{stats.exactHits}</p>
              <p className="text-xs text-muted-foreground">Perfect</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{stats.tendencyHits}</p>
              <p className="text-xs text-muted-foreground">Results</p>
            </div>
          </div>
          {stats.pendingMatches > 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {stats.pendingMatches} match{stats.pendingMatches === 1 ? "" : "es"} still to predict
            </p>
          )}
        </Card>
      )}

      <Card className="glass-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2 text-center">Points</th>
              <th className="px-3 py-2 text-center">Perfect</th>
              <th className="px-3 py-2 text-center">Result</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                  No standings yet.
                </td>
              </tr>
            )}
            {leaderboard.map((row) => {
              const mine = row.isCurrent ?? row.name === playerName;
              return (
                <tr
                  key={`${row.rank}-${row.name}`}
                  className={`border-b last:border-0 ${mine ? "bg-primary/10 font-semibold" : ""}`}
                >
                  <td className="px-3 py-2">{row.rank}</td>
                  <td className="px-3 py-2">{row.name}{mine && " (you)"}</td>
                  <td className="px-3 py-2 text-center font-display font-bold">{row.totalPoints}</td>
                  <td className="px-3 py-2 text-center">{row.exactHits}</td>
                  <td className="px-3 py-2 text-center">{row.tendencyHits}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function TournamentPanel({
  standings,
}: {
  standings: Array<{
    group: string;
    team: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
  }>;
}) {
  const groups = Array.from(new Set(standings.map((s) => s.group)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Tournament Standings</h2>
      </div>

      {standings.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No results yet — standings will appear once matches are played.
        </p>
      )}

      {groups.map((g) => (
        <Card key={g} className="glass-card overflow-x-auto p-0">
          <div className="border-b px-3 py-2 text-sm font-semibold">{g}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">Team</th>
                <th className="px-2 py-2 text-center">P</th>
                <th className="px-2 py-2 text-center">W</th>
                <th className="px-2 py-2 text-center">D</th>
                <th className="px-2 py-2 text-center">L</th>
                <th className="px-2 py-2 text-center">GF</th>
                <th className="px-2 py-2 text-center">GA</th>
                <th className="px-2 py-2 text-center">GD</th>
                <th className="px-2 py-2 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings
                .filter((s) => s.group === g)
                .map((s) => (
                  <tr key={s.team} className="border-b last:border-0">
                    <td className="px-3 py-2">{s.team}</td>
                    <td className="px-2 py-2 text-center">{s.played}</td>
                    <td className="px-2 py-2 text-center">{s.wins}</td>
                    <td className="px-2 py-2 text-center">{s.draws}</td>
                    <td className="px-2 py-2 text-center">{s.losses}</td>
                    <td className="px-2 py-2 text-center">{s.goalsFor}</td>
                    <td className="px-2 py-2 text-center">{s.goalsAgainst}</td>
                    <td className="px-2 py-2 text-center">{s.goalDiff}</td>
                    <td className="px-2 py-2 text-center font-display font-bold">{s.points}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}
