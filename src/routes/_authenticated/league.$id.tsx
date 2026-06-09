import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2,
  Plus,
  Copy,
  Lock,
  Unlock,
  Trash2,
  ArrowLeft,
  Crown,
  Check,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/app/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamLabel } from "@/components/app/team-label";
import { fmtMatchTime, teamMap } from "@/lib/format";
import { parsePredictionText, type ParsedParticipant } from "@/lib/import-parser";
import {
  getLeagueManage,
  addParticipant,
  removeParticipant,
  setLeagueLock,
  setMatchResult,
  setBonusCorrect,
  importPredictionsForLeague,
} from "@/lib/api/admin.functions";

export const Route = createFileRoute("/_authenticated/league/$id")({
  head: () => ({ meta: [{ title: "Manage League · Predictor League" }] }),
  component: ManageLeague,
});

function ManageLeague() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchManage = useServerFn(getLeagueManage);
  const { data, isLoading } = useQuery({
    queryKey: ["league-manage", id],
    queryFn: () => fetchManage({ data: { leagueId: id } }),
  });

  const lockFn = useServerFn(setLeagueLock);
  const lock = useMutation({
    mutationFn: (locked: boolean) => lockFn({ data: { leagueId: id, locked } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["league-manage", id] });
      toast.success("Updated");
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const league = data.league as any;

  return (
    <div className="min-h-screen">
      <SiteHeader
        right={
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
            </Link>
          </Button>
        }
      />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="outline">{data.base?.name}</Badge>
            <h1 className="mt-2 font-display text-3xl font-bold">{league.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {league.is_public && (
              <Button asChild variant="outline" size="sm">
                <Link to="/t/$slug" params={{ slug: league.slug }}>
                  Public page
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              variant={league.predictions_locked ? "outline" : "default"}
              onClick={() => lock.mutate(!league.predictions_locked)}
            >
              {league.predictions_locked ? (
                <Unlock className="mr-1 h-4 w-4" />
              ) : (
                <Lock className="mr-1 h-4 w-4" />
              )}
              {league.predictions_locked ? "Unlock" : "Lock"} predictions
            </Button>
          </div>
        </div>

        <Tabs defaultValue="players" className="mt-6">
          <TabsList>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="bonus">Bonus answers</TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="mt-4">
            <PlayersPanel leagueId={id} data={data} />
          </TabsContent>
          <TabsContent value="results" className="mt-4">
            <ResultsPanel leagueId={id} data={data} />
          </TabsContent>
          <TabsContent value="bonus" className="mt-4">
            <BonusPanel leagueId={id} data={data} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PlayersPanel({ leagueId, data }: { leagueId: string; data: any }) {
  const qc = useQueryClient();
  const addFn = useServerFn(addParticipant);
  const removeFn = useServerFn(removeParticipant);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const linkByPart = new Map(data.links.map((l: any) => [l.participant_id, l.token]));

  const add = useMutation({
    mutationFn: () => addFn({ data: { leagueId, name, email: email || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["league-manage", leagueId] });
      setName("");
      setEmail("");
      toast.success("Player added — share their link.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const remove = useMutation({
    mutationFn: (participantId: string) => removeFn({ data: { leagueId, participantId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["league-manage", leagueId] });
      toast.success("Player removed");
    },
  });

  function copyLink(token: string) {
    const url = `${window.location.origin}/play/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Player link copied");
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email (optional)</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button onClick={() => add.mutate()} disabled={add.isPending || !name}>
            {add.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Add
          </Button>
        </div>
      </Card>

      {data.participants.length === 0 ? (
        <p className="text-sm text-muted-foreground">No players yet.</p>
      ) : (
        data.participants.map((p: any) => (
          <Card key={p.id} className="glass-card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{p.name}</p>
              {p.email && <p className="text-sm text-muted-foreground">{p.email}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyLink(linkByPart.get(p.id) as string)}
              >
                <Copy className="mr-1 h-4 w-4" /> Link
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function ResultsPanel({ leagueId, data }: { leagueId: string; data: any }) {
  const tm = teamMap(data.teams);
  const resByMatch = new Map(data.results.map((r: any) => [r.match_id, r]));
  return (
    <div className="space-y-3">
      {data.matches.length === 0 && (
        <p className="text-sm text-muted-foreground">No matches scheduled.</p>
      )}
      {data.matches.map((m: any) => (
        <ResultRow
          key={m.id}
          leagueId={leagueId}
          match={m}
          tm={tm}
          result={resByMatch.get(m.id)}
        />
      ))}
    </div>
  );
}

function ResultRow({
  leagueId,
  match,
  tm,
  result,
}: {
  leagueId: string;
  match: any;
  tm: Record<string, any>;
  result?: any;
}) {
  const qc = useQueryClient();
  const saveFn = useServerFn(setMatchResult);
  const [home, setHome] = useState(result?.home_score?.toString() ?? "");
  const [away, setAway] = useState(result?.away_score?.toString() ?? "");
  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          leagueId,
          matchId: match.id,
          homeScore: parseInt(home, 10),
          awayScore: parseInt(away, 10),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["league-manage", leagueId] });
      toast.success("Result saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Card className="glass-card p-4">
      <div className="mb-2 text-xs text-muted-foreground">{fmtMatchTime(match.match_time)}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamLabel team={tm[match.home_team_id]} />
        <div className="flex items-center gap-1">
          <Input
            inputMode="numeric"
            className="h-11 w-12 text-center font-display text-lg font-bold"
            value={home}
            onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            inputMode="numeric"
            className="h-11 w-12 text-center font-display text-lg font-bold"
            value={away}
            onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
          />
        </div>
        <TeamLabel team={tm[match.away_team_id]} align="right" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        {result ? (
          <Badge variant="outline">
            Recorded {result.home_score}-{result.away_score}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No result yet</span>
        )}
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || home === "" || away === ""}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save
        </Button>
      </div>
    </Card>
  );
}

function BonusPanel({ leagueId, data }: { leagueId: string; data: any }) {
  return (
    <div className="space-y-3">
      {data.bonusRules.length === 0 && (
        <p className="text-sm text-muted-foreground">No bonus questions for this tournament.</p>
      )}
      {data.bonusRules.map((b: any) => (
        <BonusRow key={b.bonus_key} leagueId={leagueId} rule={b} />
      ))}
    </div>
  );
}

function BonusRow({ leagueId, rule }: { leagueId: string; rule: any }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(setBonusCorrect);
  const [val, setVal] = useState(rule.correct_value ?? "");
  const save = useMutation({
    mutationFn: () => saveFn({ data: { leagueId, bonusKey: rule.bonus_key, value: val.trim() } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["league-manage", leagueId] });
      toast.success("Bonus answer saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Card className="glass-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <span className="font-semibold">{rule.label}</span>
        </div>
        <Badge variant="outline">+{rule.points} pts</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Correct answer" />
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}
