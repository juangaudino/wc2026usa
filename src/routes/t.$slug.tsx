import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
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
            <Link to="/">Back home</Link>
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

        const standings = computeGroupStandings(data.teams, data.matches, data.results);

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
              return (
                <Card key={m.id} className="glass-card p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{fmtMatchTime(m.match_time)}</span>
                    <span className="capitalize">
                      {m.group_name ? `Group ${m.group_name}` : m.stage}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <TeamLabel team={tm[m.home_team_id]} />
                    <div className="font-display text-lg font-bold">
                      {res ? `${res.home_score} - ${res.away_score}` : "vs"}
                    </div>
                    <TeamLabel team={tm[m.away_team_id]} align="right" />
                  </div>
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
