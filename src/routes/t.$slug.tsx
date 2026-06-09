import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Minus, ChevronUp, ChevronDown, Users } from "lucide-react";
import { tendencyOf } from "@/lib/scoring";

import { SiteHeader } from "@/components/app/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamLabel } from "@/components/app/team-label";
import { fmtMatchTime, teamMap } from "@/lib/format";
import { themeStyleVars } from "@/lib/theme";
import { getPublicLeague, getLeagueLeaderboard } from "@/lib/api/public.functions";

export const Route = createFileRoute("/t/$slug")({
  head: () => ({ meta: [{ title: "League · Predictor League" }] }),
  component: PublicLeague,
});

function PublicLeague() {
  const { slug } = Route.useParams();
  const fetchLeague = useServerFn(getPublicLeague);
  const fetchBoard = useServerFn(getLeagueLeaderboard);
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsAuthed(!!data.user));
  }, []);
  const { data } = useQuery({
    queryKey: ["public-league", slug],
    queryFn: () => fetchLeague({ data: { slug } }),
  });
  const { data: board } = useQuery({
    queryKey: ["public-board", slug],
    queryFn: () => fetchBoard({ data: { slug } }),
  });

  if (data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">League not found</h1>
          <p className="mt-2 text-muted-foreground">This league link is not valid.</p>
          <Button asChild className="mt-6">
            {isAuthed ? (
              <Link to="/dashboard">Back to dashboard</Link>
            ) : (
              <Link to="/">Back home</Link>
            )}
          </Button>
        </main>
      </div>
    );
  }

  const league = data.league as any;
  const base = data.base as any;
  const tm = teamMap(data.teams as any);
  const resByMatch = new Map(data.results.map((r: any) => [r.match_id, r]));

  const prevRank = new Map((board?.previous ?? []).map((r: any) => [r.participantId, r.rank]));
  const rows = board?.rows ?? [];
  const standings = computeGroupStandings(data.teams, data.matches, data.results);

  return (
    <div className="min-h-screen" style={themeStyleVars(base?.themes)}>
      <SiteHeader
        right={
          <Badge variant="outline" className="capitalize">
            {base?.sport_type}
          </Badge>
        }
      />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" /> {data.participantCount} players
        </Badge>
        <h1 className="mt-2 font-display text-3xl font-bold">{league.name}</h1>
        <p className="mt-1 text-muted-foreground">{base?.name}</p>

        <Tabs defaultValue="leaderboard" className="mt-6">
          <TabsList>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
            <TabsTrigger value="standings">Standings</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="mt-4 space-y-2">
            {rows.length === 0 ? (
              <Card className="glass-card p-8 text-center text-muted-foreground">
                No standings yet. Check back after the first matches.
              </Card>
            ) : (
              rows.map((r: any) => {
                const prev = prevRank.get(r.participantId);
                const move = prev ? prev - r.rank : 0;
                return (
                  <Card
                    key={r.participantId}
                    className="glass-card flex items-center gap-4 p-4"
                  >
                    <RankBadge rank={r.rank} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.exact} exact · {r.tendency} tendency · {r.played} played
                      </p>
                    </div>
                    <Movement move={move} />
                    <span className="font-display text-xl font-bold text-primary">
                      {r.points}
                    </span>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="fixtures" className="mt-4 space-y-3">
            {data.matches.length === 0 && (
              <p className="text-sm text-muted-foreground">No fixtures yet.</p>
            )}
            {(data.matches as any[]).map((m) => {
              const res = resByMatch.get(m.id) as any;
              const isKnockout = !m.home_team_id && !m.away_team_id;
              return (
                <Card key={m.id} className="glass-card p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{fmtMatchTime(m.match_time)}</span>
                    <span className="capitalize">
                      {m.group_name ? `Group ${m.group_name}` : m.stage}
                    </span>
                  </div>
                  {isKnockout ? (
                    <div className="text-center font-display text-lg font-bold">
                      {m.label || "TBD"}
                    </div>
                  ) : (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <TeamLabel team={tm[m.home_team_id]} />
                      <div className="font-display text-lg font-bold">
                        {res ? `${res.home_score} - ${res.away_score}` : "vs"}
                      </div>
                      <TeamLabel team={tm[m.away_team_id]} align="right" />
                    </div>
                  )}
                  {m.venue && (
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      {m.venue}{m.city ? ` · ${m.city}` : ""}
                    </p>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="standings" className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Tournament Standings</h2>
            </div>
            {standings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No results yet — standings will appear once matches are played.
              </p>
            ) : (
              <GroupTables standings={standings} />
            )}
          </TabsContent>
        </Tabs>

        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Trophy className="h-4 w-4" /> Friendly pool — no betting, just bragging rights.
        </p>
      </main>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const color =
      rank === 1 ? "text-primary" : rank === 2 ? "text-muted-foreground" : "text-accent";
    return (
      <div className="flex h-9 w-9 items-center justify-center">
        <Medal className={`h-6 w-6 ${color}`} />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center font-display font-bold text-muted-foreground">
      {rank}
    </div>
  );
}

function Movement({ move }: { move: number }) {
  if (move > 0)
    return (
      <span className="flex items-center text-xs text-accent">
        <ChevronUp className="h-4 w-4" />
        {move}
      </span>
    );
  if (move < 0)
    return (
      <span className="flex items-center text-xs text-destructive">
        <ChevronDown className="h-4 w-4" />
        {-move}
      </span>
    );
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function computeGroupStandings(teams: any[], matches: any[], results: any[]) {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const resMap = new Map(results.map((r) => [r.match_id, r]));

  type Standing = {
    group: string;
    teamId: string;
    team: string;
    flagEmoji?: string | null;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
  };

  const standingMap = new Map<string, Standing>();

  function ensureStanding(group: string, teamId: string): Standing | null {
    const t = teamById.get(teamId);
    if (!t) return null;
    const key = `${group}::${teamId}`;
    let s = standingMap.get(key);
    if (!s) {
      s = {
        group,
        teamId,
        team: t.name,
        flagEmoji: t.flag_emoji,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      };
      standingMap.set(key, s);
    }
    return s;
  }

  // Seed all teams first so every group/team shows from day 1 (0 results).
  for (const t of teams) {
    ensureStanding(t.group_name ?? "Other", t.id);
  }

  for (const m of matches) {
    const res = resMap.get(m.id);
    if (!res || !m.home_team_id || !m.away_team_id) continue;
    const group =
      m.group_name ?? teamById.get(m.home_team_id)?.group_name ?? "Other";
    const home = ensureStanding(group, m.home_team_id);
    const away = ensureStanding(group, m.away_team_id);
    if (!home || !away) continue;
    home.played += 1;
    away.played += 1;
    home.goalsFor += res.home_score;
    home.goalsAgainst += res.away_score;
    away.goalsFor += res.away_score;
    away.goalsAgainst += res.home_score;
    const t = tendencyOf(res.home_score, res.away_score);
    if (t === "home") {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (t === "away") {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return Array.from(standingMap.values())
    .map((s) => ({ ...s, goalDiff: s.goalsFor - s.goalsAgainst }))
    .sort(
      (a, b) =>
        a.group.localeCompare(b.group) ||
        b.points - a.points ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor ||
        a.team.localeCompare(b.team),
    );
}

function GroupTables({
  standings,
}: {
  standings: Array<{
    group: string;
    team: string;
    flagEmoji?: string | null;
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
    <>
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
                    <td className="px-3 py-2">
                      {s.flagEmoji ? `${s.flagEmoji} ` : ""}
                      {s.team}
                    </td>
                    <td className="px-2 py-2 text-center">{s.played}</td>
                    <td className="px-2 py-2 text-center">{s.wins}</td>
                    <td className="px-2 py-2 text-center">{s.draws}</td>
                    <td className="px-2 py-2 text-center">{s.losses}</td>
                    <td className="px-2 py-2 text-center">{s.goalsFor}</td>
                    <td className="px-2 py-2 text-center">{s.goalsAgainst}</td>
                    <td className="px-2 py-2 text-center">{s.goalDiff}</td>
                    <td className="px-2 py-2 text-center font-display font-bold">
                      {s.points}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      ))}
    </>
  );
}
