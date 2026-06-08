import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Crown, Target } from "lucide-react";

import { SiteHeader } from "@/components/app/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamLabel } from "@/components/app/team-label";
import { fmtMatchTime, teamMap } from "@/lib/format";
import { getPublicTournament, getLeaderboard } from "@/lib/api/public.functions";

export const Route = createFileRoute("/t/$slug")({
  head: () => ({ meta: [{ title: "Tournament · Predictor League" }] }),
  component: PublicTournament,
});

function PublicTournament() {
  const { slug } = Route.useParams();
  const fetchT = useServerFn(getPublicTournament);
  const fetchLb = useServerFn(getLeaderboard);
  const { data } = useQuery({ queryKey: ["pub-t", slug], queryFn: () => fetchT({ data: { slug } }) });
  const { data: lb } = useQuery({ queryKey: ["pub-lb", slug], queryFn: () => fetchLb({ data: { slug } }) });

  if (!data?.tournament) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  const t = data.tournament;
  const tm = teamMap(data.teams as any);
  const resByMatch = new Map(data.results.map((r: any) => [r.match_id, r]));
  const prevRank = new Map((lb?.previous ?? []).map((r: any) => [r.participantId, r.rank]));
  const bonus = (t.bonus_config ?? []) as any[];

  return (
    <div className="min-h-screen">
      <SiteHeader right={<Button asChild variant="ghost" size="sm"><Link to="/">Home</Link></Button>} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Badge variant="outline" className="capitalize">{t.sport_type}</Badge>
        <h1 className="mt-2 font-display text-3xl font-bold">{t.name}</h1>
        {t.description && <p className="mt-1 text-muted-foreground">{t.description}</p>}
        <div className="mt-3 flex gap-2">
          <Badge variant="secondary">{data.participantCount} players</Badge>
          {t.predictions_locked ? <Badge variant="secondary">Predictions locked</Badge> : <Badge className="bg-accent text-accent-foreground">Open</Badge>}
        </div>

        <Tabs defaultValue="leaderboard" className="mt-6">
          <TabsList>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="mt-4 space-y-2">
            {(lb?.rows ?? []).length === 0 && <p className="text-sm text-muted-foreground">No scores yet.</p>}
            {(lb?.rows ?? []).map((r: any) => {
              const prev = prevRank.get(r.participantId);
              const move = prev ? prev - r.rank : 0;
              return (
                <Card key={r.participantId} className="glass-card flex items-center gap-3 p-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg font-display font-bold ${r.rank <= 3 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{r.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.exactCount} exact · {r.predictionCount} picks</div>
                  </div>
                  {move !== 0 && <span className={`text-xs ${move > 0 ? "text-accent" : "text-destructive"}`}>{move > 0 ? `▲${move}` : `▼${-move}`}</span>}
                  <span className="font-display text-lg font-bold text-primary">{r.total}</span>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="matches" className="mt-4 space-y-2">
            {(data.matches as any[]).map((m) => {
              const r = resByMatch.get(m.id);
              return (
                <Link key={m.id} to="/t/$slug/match/$matchId" params={{ slug, matchId: m.id }}>
                  <Card className="glass-card p-4 transition-all hover:border-primary/50">
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{fmtMatchTime(m.match_time)}</span>
                      <span className="capitalize">{m.stage}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <TeamLabel team={tm[m.home_team_id]} />
                      <span className="font-display text-lg font-bold">{r ? `${r.home_score} - ${r.away_score}` : "vs"}</span>
                      <TeamLabel team={tm[m.away_team_id]} align="right" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
            <Card className="glass-card space-y-4 p-6">
              <div className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold">Scoring</h2></div>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span>Exact score</span><span className="font-bold text-primary">3 pts</span></li>
                <li className="flex justify-between"><span>Correct winner / draw tendency</span><span className="font-bold text-primary">1 pt</span></li>
                <li className="flex justify-between"><span>Wrong tendency</span><span className="font-bold">0 pts</span></li>
              </ul>
              <p className="text-xs text-muted-foreground">Example — real result Argentina 2-0 Japan: predicting 2-0 = 3 pts, 1-0 = 1 pt, 3-1 = 1 pt, 1-1 = 0 pts.</p>
              {bonus.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-2"><Crown className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold">Bonus picks</h2></div>
                  <ul className="space-y-2 text-sm">
                    {bonus.map((b: any) => <li key={b.key} className="flex justify-between"><span>{b.label}</span><span className="font-bold text-primary">{b.points} pts</span></li>)}
                  </ul>
                </>
              )}
              <p className="flex items-center gap-2 pt-2 text-xs text-muted-foreground"><Trophy className="h-4 w-4" /> Friendly pool — no betting, just bragging rights.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
