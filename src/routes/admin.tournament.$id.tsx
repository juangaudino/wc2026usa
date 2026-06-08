import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, Unlock, Plus, Trash2, Copy, Link2 } from "lucide-react";

import { SiteHeader } from "@/components/app/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMatchTime, teamMap } from "@/lib/format";
import {
  getTournamentAdmin, saveTeam, deleteTeam, saveMatch, deleteMatch, addParticipant,
  deleteParticipant, enterResult, updateTournament, previewImport, commitImport, setMatchLock,
  setBonusAnswers,
} from "@/lib/api/admin.functions";

export const Route = createFileRoute("/admin/tournament/$id")({
  head: () => ({ meta: [{ title: "Manage Tournament · Predictor League" }] }),
  component: ManageTournament,
});

function ManageTournament() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getTournamentAdmin);
  const { data } = useQuery({ queryKey: ["admin-t", id], queryFn: () => load({ data: { id } }) });
  const refetch = () => qc.invalidateQueries({ queryKey: ["admin-t", id] });

  if (!data?.tournament) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  const t = data.tournament;
  const tm = teamMap(data.teams as any);
  const resultByMatch = new Map(data.results.map((r: any) => [r.match_id, r]));
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen">
      <SiteHeader right={<Button asChild variant="ghost" size="sm"><Link to="/admin">Back</Link></Button>} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">{t.name}</h1>
            <Badge variant="outline" className="mt-1 capitalize">{t.sport_type}</Badge>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/t/$slug" params={{ slug: t.slug }}>Public page</Link></Button>
            <LockToggle id={id} locked={t.predictions_locked} onDone={refetch} />
          </div>
        </div>

        <Tabs defaultValue="matches" className="mt-6">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* MATCHES + RESULTS */}
          <TabsContent value="matches" className="mt-4 space-y-3">
            <AddMatch id={id} teams={data.teams as any} onDone={refetch} />
            {(data.matches as any[]).map((m) => (
              <Card key={m.id} className="glass-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-semibold">{tm[m.home_team_id]?.name ?? "TBD"}</span>
                    <span className="mx-2 text-muted-foreground">vs</span>
                    <span className="font-semibold">{tm[m.away_team_id]?.name ?? "TBD"}</span>
                    <div className="text-xs text-muted-foreground">{fmtMatchTime(m.match_time)} · {m.stage}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.locked ? <Badge variant="secondary"><Lock className="mr-1 h-3 w-3" />Locked</Badge> : <Badge className="bg-accent text-accent-foreground">Open</Badge>}
                    <Button size="icon" variant="ghost" onClick={async () => { await deleteMatch({ data: { id: m.id } }); refetch(); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <ResultEntry matchId={m.id} existing={resultByMatch.get(m.id)} onDone={refetch} />
              </Card>
            ))}
          </TabsContent>

          {/* TEAMS */}
          <TabsContent value="teams" className="mt-4 space-y-3">
            <AddTeam id={id} onDone={refetch} />
            <div className="grid gap-2 sm:grid-cols-2">
              {(data.teams as any[]).map((tt) => (
                <Card key={tt.id} className="glass-card flex items-center justify-between p-3">
                  <span className="flex items-center gap-2"><span className="text-xl">{tt.flag_emoji || "🏳️"}</span>{tt.name} {tt.group_name && <Badge variant="outline">{tt.group_name}</Badge>}</span>
                  <Button size="icon" variant="ghost" onClick={async () => { await deleteTeam({ data: { id: tt.id } }); refetch(); }}><Trash2 className="h-4 w-4" /></Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* PLAYERS */}
          <TabsContent value="players" className="mt-4 space-y-3">
            <AddPlayer id={id} onDone={refetch} />
            {(data.participants as any[]).map((p) => {
              const link = (data.links as any[]).find((l) => l.participant_id === p.id);
              const url = link ? `${origin}/play/${link.token}` : "";
              return (
                <Card key={p.id} className="glass-card flex flex-wrap items-center justify-between gap-2 p-3">
                  <span className="font-medium">{p.name}</span>
                  <div className="flex items-center gap-2">
                    {url && (
                      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied"); }}>
                        <Copy className="mr-1 h-3 w-3" /> Copy link
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={async () => { await deleteParticipant({ data: { id: p.id } }); refetch(); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* IMPORT */}
          <TabsContent value="import" className="mt-4">
            <ImportPanel id={id} onDone={refetch} />
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="mt-4">
            <SettingsPanel id={id} tournament={t} onDone={refetch} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function LockToggle({ id, locked, onDone }: { id: string; locked: boolean; onDone: () => void }) {
  return (
    <Button size="sm" variant={locked ? "secondary" : "default"} onClick={async () => { await updateTournament({ data: { id, predictions_locked: !locked } }); toast.success(locked ? "Predictions opened" : "Predictions locked"); onDone(); }}>
      {locked ? <><Unlock className="mr-1 h-4 w-4" /> Unlock all</> : <><Lock className="mr-1 h-4 w-4" /> Lock all</>}
    </Button>
  );
}

function AddTeam({ id, onDone }: { id: string; onDone: () => void }) {
  const [name, setName] = useState(""); const [flag, setFlag] = useState(""); const [group, setGroup] = useState("");
  return (
    <Card className="glass-card flex flex-wrap gap-2 p-3">
      <Input className="w-40" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input className="w-24" placeholder="Flag 🇦🇷" value={flag} onChange={(e) => setFlag(e.target.value)} />
      <Input className="w-24" placeholder="Group" value={group} onChange={(e) => setGroup(e.target.value)} />
      <Button disabled={!name} onClick={async () => { await saveTeam({ data: { tournament_id: id, name, flag_emoji: flag || null, group_name: group || null } }); setName(""); setFlag(""); setGroup(""); onDone(); }}><Plus className="h-4 w-4" /></Button>
    </Card>
  );
}

function AddMatch({ id, teams, onDone }: { id: string; teams: any[]; onDone: () => void }) {
  const [home, setHome] = useState(""); const [away, setAway] = useState(""); const [stage, setStage] = useState("group"); const [time, setTime] = useState("");
  return (
    <Card className="glass-card flex flex-wrap items-end gap-2 p-3">
      <TeamSelect teams={teams} value={home} onChange={setHome} placeholder="Home" />
      <TeamSelect teams={teams} value={away} onChange={setAway} placeholder="Away" />
      <Input className="w-28" placeholder="Stage" value={stage} onChange={(e) => setStage(e.target.value)} />
      <Input className="w-44" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
      <Button disabled={!home || !away} onClick={async () => { await saveMatch({ data: { tournament_id: id, home_team_id: home, away_team_id: away, stage, match_time: time ? new Date(time).toISOString() : null } }); setHome(""); setAway(""); setTime(""); onDone(); }}><Plus className="h-4 w-4" /> Add match</Button>
    </Card>
  );
}

function TeamSelect({ teams, value, onChange, placeholder }: { teams: any[]; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-36"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.flag_emoji} {t.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function ResultEntry({ matchId, existing, onDone }: { matchId: string; existing: any; onDone: () => void }) {
  const [h, setH] = useState(existing?.home_score ?? ""); const [a, setA] = useState(existing?.away_score ?? "");
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
      <span className="text-xs text-muted-foreground">Result</span>
      <Input className="w-16" type="number" min={0} value={h} onChange={(e) => setH(e.target.value)} />
      <span>-</span>
      <Input className="w-16" type="number" min={0} value={a} onChange={(e) => setA(e.target.value)} />
      <Button size="sm" disabled={h === "" || a === ""} onClick={async () => {
        await enterResult({ data: { match_id: matchId, home_score: Number(h), away_score: Number(a), source: "manual" } });
        toast.success("Result saved & scores updated"); onDone();
      }}>{existing ? "Update" : "Save"}</Button>
    </div>
  );
}

function AddPlayer({ id, onDone }: { id: string; onDone: () => void }) {
  const [name, setName] = useState("");
  return (
    <Card className="glass-card flex gap-2 p-3">
      <Input placeholder="Participant name" value={name} onChange={(e) => setName(e.target.value)} />
      <Button disabled={!name} onClick={async () => { await addParticipant({ data: { tournament_id: id, name } }); toast.success("Player added with private link"); setName(""); onDone(); }}>
        <Link2 className="mr-1 h-4 w-4" /> Add
      </Button>
    </Card>
  );
}

function ImportPanel({ id, onDone }: { id: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<any[] | null>(null);
  const doPreview = async () => setPreview(await previewImport({ data: { tournament_id: id, text } }));
  const doCommit = async () => {
    const entries = (preview ?? []).map((p) => ({
      name: p.name,
      predictions: p.predictions.filter((x: any) => x.matched).map((x: any) => ({ matchId: x.matchId, homeScore: x.homeScore, awayScore: x.awayScore })),
    })).filter((e) => e.predictions.length);
    const res = await commitImport({ data: { tournament_id: id, entries } });
    toast.success(`Imported ${res.savedPredictions} predictions for ${entries.length} players`);
    setPreview(null); setText(""); onDone();
  };
  return (
    <Card className="glass-card p-5">
      <h3 className="font-display font-semibold">Import predictions from text</h3>
      <p className="mt-1 text-sm text-muted-foreground">Paste a name followed by lines like "Argentina 2-0 Japan". Blank line separates players.</p>
      <Textarea className="mt-3 min-h-40 font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder={"Juan\nArgentina 2-0 Japan\nBrazil 1-1 Spain"} />
      <div className="mt-3 flex gap-2">
        <Button variant="outline" disabled={!text} onClick={doPreview}>Preview</Button>
        {preview && <Button onClick={doCommit}>Confirm & save</Button>}
      </div>
      {preview && (
        <div className="mt-4 space-y-3">
          {preview.map((p, i) => (
            <Card key={i} className="p-3">
              <div className="font-semibold">{p.name}</div>
              <ul className="mt-1 text-sm">
                {p.predictions.map((x: any, j: number) => (
                  <li key={j} className={x.matched ? "text-foreground" : "text-destructive"}>
                    {x.raw} {x.matched ? "✓" : "— no matching fixture"}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}

function SettingsPanel({ id, tournament, onDone }: { id: string; tournament: any; onDone: () => void }) {
  const [deadline, setDeadline] = useState(tournament.deadline ? tournament.deadline.slice(0, 16) : "");
  const bonus = (tournament.bonus_config ?? []) as any[];
  return (
    <Card className="glass-card space-y-4 p-5">
      <div>
        <label className="text-sm text-muted-foreground">Global prediction deadline</label>
        <div className="mt-1 flex gap-2">
          <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <Button onClick={async () => { await updateTournament({ data: { id, deadline: deadline ? new Date(deadline).toISOString() : null } }); toast.success("Deadline saved"); onDone(); }}>Save</Button>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium">Bonus fields & correct answers</div>
        <p className="text-xs text-muted-foreground">Set the correct value to award bonus points after the tournament.</p>
        <BonusEditor id={id} fields={bonus} onDone={onDone} />
      </div>
    </Card>
  );
}

function BonusEditor({ id, fields, onDone }: { id: string; fields: any[]; onDone: () => void }) {
  const [rows, setRows] = useState(fields.length ? fields : []);
  const update = (i: number, key: string, val: any) => setRows((r: any[]) => r.map((x, j) => (j === i ? { ...x, [key]: val } : x)));
  return (
    <div className="mt-2 space-y-2">
      {rows.map((f: any, i: number) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <Input className="w-40" value={f.label} onChange={(e) => update(i, "label", e.target.value)} />
          <Input className="w-20" type="number" value={f.points} onChange={(e) => update(i, "points", Number(e.target.value))} />
          <Input className="w-44" placeholder="Correct answer" value={f.correctValue ?? ""} onChange={(e) => update(i, "correctValue", e.target.value)} />
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => setRows((r: any[]) => [...r, { key: `custom_${r.length}`, label: "Custom", points: 2 }])}>Add bonus field</Button>
      <Button size="sm" className="ml-2" onClick={async () => { await setBonusAnswers({ data: { tournament_id: id, bonus_config: rows } }); toast.success("Bonus saved & scored"); onDone(); }}>Save bonus</Button>
    </div>
  );
}
