import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/app/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMatchDetail } from "@/lib/api/public.functions";
import { fmtMatchTime } from "@/lib/format";

export const Route = createFileRoute("/t/$slug/match/$matchId")({
  head: () => ({ meta: [{ title: "Match · Predictor League" }] }),
  component: MatchDetail,
});

function MatchDetail() {
  const { slug, matchId } = Route.useParams();
  const fetchM = useServerFn(getMatchDetail);
  const { data } = useQuery({ queryKey: ["match", matchId], queryFn: () => fetchM({ data: { matchId } }) });

  if (!data?.match) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  const m: any = data.match;
  const r = data.result;

  return (
    <div className="min-h-screen">
      <SiteHeader right={<Button asChild variant="ghost" size="sm"><Link to="/t/$slug" params={{ slug }}>Back</Link></Button>} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-xs text-muted-foreground">{fmtMatchTime(m.match_time)} · {m.stage}</p>
        <Card className="glass-card mt-3 p-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <div><div className="text-3xl">{m.home?.flag_emoji || "🏳️"}</div><div className="mt-1 font-semibold">{m.home?.name || "TBD"}</div></div>
            <div className="font-display text-3xl font-bold">{r ? `${r.home_score} - ${r.away_score}` : "vs"}</div>
            <div><div className="text-3xl">{m.away?.flag_emoji || "🏳️"}</div><div className="mt-1 font-semibold">{m.away?.name || "TBD"}</div></div>
          </div>
          {r ? <Badge className="mx-auto mt-4 block w-fit bg-accent text-accent-foreground">Final</Badge> : <Badge variant="secondary" className="mx-auto mt-4 block w-fit">Awaiting result</Badge>}
        </Card>

        <h2 className="mt-6 font-display text-lg font-semibold">Player predictions</h2>
        <div className="mt-3 space-y-2">
          {data.predictions.length === 0 && <p className="text-sm text-muted-foreground">No predictions yet.</p>}
          {data.predictions.map((p: any, i: number) => (
            <Card key={i} className="glass-card flex items-center justify-between p-3">
              <span className="font-medium">{p.participants?.name}</span>
              <span className="flex items-center gap-3">
                <span className="font-display font-bold">{p.home_score} - {p.away_score}</span>
                {r && <Badge variant={p.points >= 3 ? "default" : p.points >= 1 ? "secondary" : "outline"}>{p.points} pts</Badge>}
              </span>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
