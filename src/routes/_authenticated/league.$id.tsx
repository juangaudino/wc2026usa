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
  saveScoringRules,
  upsertBonusRule,
  deleteBonusRule,
  clearBonusRules,
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
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="bonus">Bonus answers</TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="mt-4">
            <PlayersPanel leagueId={id} data={data} />
          </TabsContent>
          <TabsContent value="import" className="mt-4">
            <ImportPanel leagueId={id} />
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

function ImportPanel({ leagueId }: { leagueId: string }) {
  const qc = useQueryClient();
  const importFn = useServerFn(importPredictionsForLeague);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedParticipant[] | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  function rowKey(pi: number, pri: number) {
    return `${pi}:${pri}`;
  }

  function preview() {
    const result = parsePredictionText(text);
    setParsed(result);
    setSkipped(new Set());
    if (result.length === 0) toast.error("No predictions found in the pasted text.");
  }

  function toggleSkip(key: string) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Build the payload, honoring manual skips.
  function buildPayload(): ParsedParticipant[] {
    if (!parsed) return [];
    return parsed
      .map((p, pi) => ({
        name: p.name,
        predictions: p.predictions.filter((_, pri) => !skipped.has(rowKey(pi, pri))),
      }))
      .filter((p) => p.predictions.length > 0);
  }

  const doImport = useMutation({
    mutationFn: () => importFn({ data: { leagueId, participants: buildPayload() } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["league-manage", leagueId] });
      toast.success(
        `Imported ${res.importedPredictions} predictions for ${res.importedPlayers} players`,
      );
      setText("");
      setParsed(null);
      setSkipped(new Set());
    },
    onError: (e: any) => toast.error(e?.message ?? "Import failed"),
  });

  return (
    <div className="space-y-4">
      <Card className="glass-card space-y-3 p-4">
        <Label className="text-xs">Paste predictions</Label>
        <Textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Juan\nArgentina 2-0 Japan\nBrazil 1-1 Spain\n\nMaria\nFrance vs Mexico\n3-1"}
          className="font-mono text-sm"
        />
        <div className="flex justify-end">
          <Button onClick={preview} disabled={!text.trim()}>
            <Upload className="mr-1 h-4 w-4" /> Preview
          </Button>
        </div>
      </Card>

      {parsed && parsed.length > 0 && (
        <div className="space-y-4">
          {parsed.map((p, pi) => (
            <Card key={pi} className="glass-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">{p.name}</p>
                <Badge variant="outline">{p.predictions.length} predictions</Badge>
              </div>
              <div className="space-y-2">
                {p.predictions.map((pred, pri) => {
                  const key = rowKey(pi, pri);
                  const isSkipped = skipped.has(key);
                  const warn = pred.needsReview;
                  return (
                    <div
                      key={pri}
                      className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${
                        isSkipped
                          ? "border-muted bg-muted/30 opacity-60"
                          : warn
                            ? "border-yellow-500/40 bg-yellow-500/10"
                            : "border-green-500/40 bg-green-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {warn && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        <span>
                          {pred.homeTeam}{" "}
                          <span className="font-display font-bold">
                            {pred.homeScore ?? "?"}-{pred.awayScore ?? "?"}
                          </span>{" "}
                          {pred.awayTeam}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {pred.confidence}
                        </Badge>
                      </div>
                      {warn ? (
                        <Badge variant="outline" className="text-[10px] text-yellow-500">
                          Needs review — skipped
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleSkip(key)}
                        >
                          {isSkipped ? "Include" : "Skip"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button onClick={() => doImport.mutate()} disabled={doImport.isPending}>
              {doImport.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              Confirm Import
            </Button>
          </div>
        </div>
      )}
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
