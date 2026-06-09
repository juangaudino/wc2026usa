import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2,
  ShieldCheck,
  Trophy,
  Users,
  Check,
  X,
  Plus,
  LogOut,
  Palette,
  Wand2,
  Clock,
  ArrowRight,
  Pencil,
  Trash2,

} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/app/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { themeStyleVars } from "@/lib/theme";
import { getMyAccount } from "@/lib/api/admin.functions";
import {
  ownerListManagers,
  ownerReviewManager,
  ownerListBaseTournaments,
  ownerGenerateWorldCup2026,
  ownerListThemes,
  ownerSaveTheme,
  ownerAssignTheme,
  ownerImportTeams,
  ownerImportMatches,
  ownerListAllLeagues,
  deleteLeague,
  ownerUpdateBaseTournament,
  ownerDeleteBaseTournament,
  listBaseTournamentsForManager,
  listMyLeagues,
  createLeague,
} from "@/lib/api/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Predictor League" }] }),
  component: Dashboard,
});

function Dashboard() {
  const router = useRouter();
  const fetchAccount = useServerFn(getMyAccount);
  const { data: account, isLoading } = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader
        right={
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        }
      />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {account?.role === "platform_owner" ? (
          <OwnerDashboard />
        ) : account?.approvalStatus === "approved" ? (
          <ManagerDashboard />
        ) : (
          <PendingScreen status={account?.approvalStatus ?? "pending"} />
        )}
      </main>
    </div>
  );
}

function PendingScreen({ status }: { status: string }) {
  const rejected = status === "rejected";
  return (
    <Card className="glass-card mx-auto mt-10 max-w-md p-10 text-center">
      <Clock className="mx-auto h-10 w-10 text-primary" />
      <h1 className="mt-4 font-display text-2xl font-bold">
        {rejected ? "Account not approved" : "Awaiting approval"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {rejected
          ? "Your manager request was declined. Contact the platform owner for details."
          : "Your manager account is pending approval from the platform owner. You'll get access as soon as it's approved."}
      </p>
    </Card>
  );
}

/* ------------------------------ OWNER ------------------------------ */
function OwnerDashboard() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Badge className="gap-1">
          <ShieldCheck className="h-3 w-3" /> Platform Owner
        </Badge>
        <h1 className="font-display text-2xl font-bold">Control center</h1>
      </div>
      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals">Managers</TabsTrigger>
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="leagues">My leagues</TabsTrigger>
        </TabsList>
        <TabsContent value="approvals" className="mt-5">
          <ManagersPanel />
        </TabsContent>
        <TabsContent value="tournaments" className="mt-5">
          <TournamentsPanel />
        </TabsContent>
        <TabsContent value="themes" className="mt-5">
          <ThemesPanel />
        </TabsContent>
        <TabsContent value="leagues" className="mt-5 space-y-8">
          <OwnerAllLeaguesPanel />
          <ManagerDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ManagersPanel() {
  const qc = useQueryClient();
  const list = useServerFn(ownerListManagers);
  const review = useServerFn(ownerReviewManager);
  const { data } = useQuery({ queryKey: ["owner-managers"], queryFn: () => list() });
  const m = useMutation({
    mutationFn: (v: { userId: string; decision: "approved" | "rejected" }) =>
      review({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-managers"] });
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const rows = data ?? [];
  if (rows.length === 0)
    return <Empty icon={Users} text="No manager registrations yet." />;

  return (
    <div className="space-y-3">
      {rows.map((r: any) => (
        <Card key={r.userId} className="glass-card flex items-center justify-between p-4">
          <div>
            <p className="font-semibold">{r.displayName || r.email || "Unknown"}</p>
            <p className="text-sm text-muted-foreground">{r.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                r.status === "approved"
                  ? "default"
                  : r.status === "rejected"
                    ? "destructive"
                    : "secondary"
              }
              className="capitalize"
            >
              {r.status}
            </Badge>
            {r.status !== "approved" && (
              <Button
                size="sm"
                onClick={() => m.mutate({ userId: r.userId, decision: "approved" })}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            {r.status !== "rejected" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => m.mutate({ userId: r.userId, decision: "rejected" })}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function TournamentsPanel() {
  const qc = useQueryClient();
  const list = useServerFn(ownerListBaseTournaments);
  const gen = useServerFn(ownerGenerateWorldCup2026);
  const listThemes = useServerFn(ownerListThemes);
  const assign = useServerFn(ownerAssignTheme);
  const { data } = useQuery({ queryKey: ["owner-bases"], queryFn: () => list() });
  const { data: themes } = useQuery({ queryKey: ["owner-themes"], queryFn: () => listThemes() });

  const [defExact, setDefExact] = useState("3");
  const [defTendency, setDefTendency] = useState("1");
  const [defIncorrect, setDefIncorrect] = useState("0");
  const generate = useMutation({
    mutationFn: () =>
      gen({
        data: {
          defaultExactPoints: Number(defExact) || 0,
          defaultTendencyPoints: Number(defTendency) || 0,
          defaultIncorrectPoints: Number(defIncorrect) || 0,
        },
      }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["owner-bases"] });
      toast.success(`World Cup 2026 created — ${r.teams} teams, ${r.matches} matches.`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const assignTheme = useMutation({
    mutationFn: (v: { baseTournamentId: string; themeId: string }) => assign({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-bases"] });
      toast.success("Theme assigned");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const rows = data ?? [];
  return (
    <div className="space-y-4">
      <Card className="glass-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-semibold">Generate official tournament</p>
            <p className="text-sm text-muted-foreground">
              Build World Cup 2026 with all 48 teams and group-stage fixtures.
            </p>
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-1 h-4 w-4" />
            )}
            Generate WC 2026
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="def-exact">Default exact pts</Label>
            <Input id="def-exact" type="number" value={defExact} onChange={(e) => setDefExact(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="def-tendency">Default tendency pts</Label>
            <Input id="def-tendency" type="number" value={defTendency} onChange={(e) => setDefTendency(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="def-incorrect">Default incorrect pts</Label>
            <Input id="def-incorrect" type="number" value={defIncorrect} onChange={(e) => setDefIncorrect(e.target.value)} />
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Empty icon={Trophy} text="No base tournaments yet." />
      ) : (
        rows.map((t: any) => (
          <Card key={t.id} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-bold">{t.name}</p>
                <p className="text-sm capitalize text-muted-foreground">
                  {t.sport_type} · {t.status}
                </p>
              </div>
              <div className="w-48">
                <Select
                  value={t.theme_id ?? ""}
                  onValueChange={(v) =>
                    assignTheme.mutate({ baseTournamentId: t.id, themeId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {(themes ?? []).map((th: any) => (
                      <SelectItem key={th.id} value={th.id}>
                        {th.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ImportTeamsModal baseTournamentId={t.id} />
              <ImportMatchesModal baseTournamentId={t.id} />
              <EditTournamentModal tournament={t} />
              <DeleteTournamentButton tournament={t} />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? "").trim();
    });
    return obj;
  });
}

function parseImport(text: string): any[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  return parseCsv(trimmed);
}

function ImportTeamsModal({ baseTournamentId }: { baseTournamentId: string }) {
  const qc = useQueryClient();
  const importTeams = useServerFn(ownerImportTeams);
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  function preview() {
    try {
      const parsed = parseImport(raw)
        .map((r) => ({
          name: r.name ?? "",
          short_code: r.short_code ?? "",
          flag_emoji: r.flag_emoji ?? "",
          group_name: r.group_name ?? "",
        }))
        .filter((r) => r.name && r.short_code);
      if (parsed.length === 0) {
        setError("No valid rows found. Need at least name and short_code.");
        setRows([]);
        return;
      }
      setError(null);
      setRows(parsed);
    } catch (e: any) {
      setError(e?.message ?? "Could not parse input");
      setRows([]);
    }
  }

  const save = useMutation({
    mutationFn: () => importTeams({ data: { baseTournamentId, teams: rows } }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["owner-bases"] });
      toast.success(`Teams imported — ${r.inserted} added, ${r.updated} updated.`);
      setOpen(false);
      setRaw("");
      setRows([]);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" /> Import Teams
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Teams</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Paste a JSON array or CSV with header: name,short_code,flag_emoji,group_name
        </p>
        <Textarea
          rows={6}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={`name,short_code,flag_emoji,group_name\nArgentina,ARG,🇦🇷,A`}
        />
        <Button variant="secondary" size="sm" onClick={preview}>
          Preview
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {rows.length > 0 && (
          <div className="max-h-48 overflow-auto rounded border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-2 py-1">Name</th>
                  <th className="px-2 py-1">Code</th>
                  <th className="px-2 py-1">Flag</th>
                  <th className="px-2 py-1">Group</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-2 py-1">{r.name}</td>
                    <td className="px-2 py-1">{r.short_code}</td>
                    <td className="px-2 py-1">{r.flag_emoji}</td>
                    <td className="px-2 py-1">{r.group_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={() => save.mutate()}
            disabled={rows.length === 0 || save.isPending}
          >
            {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirm Import ({rows.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportMatchesModal({ baseTournamentId }: { baseTournamentId: string }) {
  const qc = useQueryClient();
  const importMatches = useServerFn(ownerImportMatches);
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  function preview() {
    try {
      const parsed = parseImport(raw)
        .map((r) => ({
          home: r.home ?? "",
          away: r.away ?? "",
          group_name: r.group_name ?? "",
          stage: r.stage ?? "",
          match_time: r.match_time ?? "",
          venue: r.venue ?? "",
          city: r.city ?? "",
        }))
        .filter((r) => r.home && r.away);
      if (parsed.length === 0) {
        setError("No valid rows found. Need at least home and away.");
        setRows([]);
        return;
      }
      setError(null);
      setRows(parsed);
    } catch (e: any) {
      setError(e?.message ?? "Could not parse input");
      setRows([]);
    }
  }

  const save = useMutation({
    mutationFn: () => importMatches({ data: { baseTournamentId, matches: rows } }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["owner-bases"] });
      toast.success(`Matches imported — ${r.inserted} added, ${r.updated} updated.`);
      if (r.errors?.length) {
        toast.error(`${r.errors.length} row(s) skipped: ${r.errors[0]}`);
      }
      setOpen(false);
      setRaw("");
      setRows([]);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" /> Import Matches
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Matches</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Paste JSON or CSV with header: home,away,group_name,stage,match_time,venue,city.
          Teams matched by short_code.
        </p>
        <Textarea
          rows={6}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={`home,away,group_name,stage,match_time,venue,city\nARG,BRA,A,group,2026-06-11T18:00:00Z,MetLife,New York`}
        />
        <Button variant="secondary" size="sm" onClick={preview}>
          Preview
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {rows.length > 0 && (
          <div className="max-h-48 overflow-auto rounded border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-2 py-1">Home</th>
                  <th className="px-2 py-1">Away</th>
                  <th className="px-2 py-1">Group</th>
                  <th className="px-2 py-1">Stage</th>
                  <th className="px-2 py-1">Time</th>
                  <th className="px-2 py-1">Venue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-2 py-1">{r.home}</td>
                    <td className="px-2 py-1">{r.away}</td>
                    <td className="px-2 py-1">{r.group_name}</td>
                    <td className="px-2 py-1">{r.stage}</td>
                    <td className="px-2 py-1">{r.match_time}</td>
                    <td className="px-2 py-1">{r.venue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={() => save.mutate()}
            disabled={rows.length === 0 || save.isPending}
          >
            {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirm Import ({rows.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY_THEME = {
  name: "",
  sport_type: "football",
  colors: { background: "#0E1422", card: "#16203A", primary: "#F5C518", accent: "#10B981", ring: "#F5C518" },
  typography: { display: "Space Grotesk", body: "Inter" },
  is_published: true,
};

function ThemesPanel() {
  const qc = useQueryClient();
  const list = useServerFn(ownerListThemes);
  const save = useServerFn(ownerSaveTheme);
  const { data } = useQuery({ queryKey: ["owner-themes"], queryFn: () => list() });
  const [draft, setDraft] = useState<any>(EMPTY_THEME);

  const saver = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-themes"] });
      qc.invalidateQueries({ queryKey: ["public-tournaments"] });
      toast.success("Theme saved");
      setDraft(EMPTY_THEME);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  function colorField(key: keyof typeof EMPTY_THEME.colors) {
    return (
      <div className="space-y-1">
        <Label className="text-xs capitalize">{key}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={draft.colors[key]}
            onChange={(e) =>
              setDraft({ ...draft, colors: { ...draft.colors, [key]: e.target.value } })
            }
            className="h-9 w-9 cursor-pointer rounded border border-border bg-transparent"
          />
          <Input
            value={draft.colors[key]}
            onChange={(e) =>
              setDraft({ ...draft, colors: { ...draft.colors, [key]: e.target.value } })
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="glass-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-bold">
            {draft.id ? "Edit theme" : "New theme"}
          </h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sport</Label>
              <Input
                value={draft.sport_type}
                onChange={(e) => setDraft({ ...draft, sport_type: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {colorField("background")}
            {colorField("card")}
            {colorField("primary")}
            {colorField("accent")}
            {colorField("ring")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Display font</Label>
              <Input
                value={draft.typography.display}
                onChange={(e) =>
                  setDraft({ ...draft, typography: { ...draft.typography, display: e.target.value } })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Body font</Label>
              <Input
                value={draft.typography.body}
                onChange={(e) =>
                  setDraft({ ...draft, typography: { ...draft.typography, body: e.target.value } })
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.is_published}
                onCheckedChange={(v) => setDraft({ ...draft, is_published: v })}
              />
              <Label className="text-sm">Published</Label>
            </div>
            <div className="flex gap-2">
              {draft.id && (
                <Button variant="ghost" onClick={() => setDraft(EMPTY_THEME)}>
                  Cancel
                </Button>
              )}
              <Button onClick={() => saver.mutate(draft)} disabled={saver.isPending}>
                {saver.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Save theme
              </Button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Live preview</p>
          <div
            style={themeStyleVars(draft)}
            className="rounded-xl border border-border p-4"
          >
            <div className="rounded-lg bg-background p-4">
              <Badge className="bg-primary text-primary-foreground">{draft.name || "Theme"}</Badge>
              <h4 className="mt-2 font-display text-xl font-bold text-foreground">
                Match day
              </h4>
              <div className="mt-3 rounded-md bg-card p-3 text-card-foreground">
                <span className="font-semibold">Sample match card</span>
              </div>
              <Button className="mt-3" size="sm">
                Primary action
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {(data ?? []).map((t: any) => (
          <Card key={t.id} className="glass-card flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {["background", "primary", "accent"].map((k) => (
                  <span
                    key={k}
                    className="h-6 w-6 rounded-full border border-border"
                    style={{ background: (t.colors ?? {})[k] }}
                  />
                ))}
              </div>
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{t.sport_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!t.is_published && <Badge variant="secondary">Draft</Badge>}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: t.id,
                    name: t.name,
                    sport_type: t.sport_type,
                    colors: { ...EMPTY_THEME.colors, ...(t.colors ?? {}) },
                    typography: { ...EMPTY_THEME.typography, ...(t.typography ?? {}) },
                    is_published: t.is_published,
                  })
                }
              >
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- MANAGER ----------------------------- */
function ManagerDashboard() {
  const qc = useQueryClient();
  const listLeagues = useServerFn(listMyLeagues);
  const listBases = useServerFn(listBaseTournamentsForManager);
  const create = useServerFn(createLeague);
  const { data: leagues } = useQuery({ queryKey: ["my-leagues"], queryFn: () => listLeagues() });
  const { data: bases } = useQuery({ queryKey: ["manager-bases"], queryFn: () => listBases() });

  const [name, setName] = useState("");
  const [baseId, setBaseId] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const creator = useMutation({
    mutationFn: () => create({ data: { name, baseTournamentId: baseId, isPublic } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-leagues"] });
      setName("");
      setBaseId("");
      toast.success("League created");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <Card className="glass-card p-5">
        <h3 className="mb-4 font-display text-lg font-bold">Create a league</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">League name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Office Pool" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tournament</Label>
            <Select value={baseId} onValueChange={setBaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a tournament" />
              </SelectTrigger>
              <SelectContent>
                {(bases ?? []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            <Label className="text-sm">Show on public leaderboard</Label>
          </div>
          <Button
            onClick={() => creator.mutate()}
            disabled={creator.isPending || !name || !baseId}
          >
            {creator.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Create league
          </Button>
        </div>
        {(bases ?? []).length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            No tournaments available yet. The platform owner needs to publish one.
          </p>
        )}
      </Card>

      <div>
        <h3 className="mb-3 font-display text-lg font-bold">Your leagues</h3>
        {(leagues ?? []).length === 0 ? (
          <Empty icon={Users} text="No leagues yet. Create your first above." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(leagues ?? []).map((l: any) => (
              <Link
                key={l.id}
                to="/league/$id"
                params={{ id: l.id }}
                className="group"
              >
                <Card className="glass-card h-full p-4 transition-all hover:border-primary/50">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{l.base_tournaments?.name}</Badge>
                    {l.predictions_locked ? (
                      <Badge variant="secondary">Locked</Badge>
                    ) : (
                      <Badge className="bg-accent text-accent-foreground">Open</Badge>
                    )}
                  </div>
                  <p className="mt-3 font-display text-lg font-bold group-hover:text-primary">
                    {l.name}
                  </p>
                  <div className="mt-3 flex items-center text-sm font-medium text-primary">
                    Manage <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <Card className="glass-card flex flex-col items-center gap-3 p-12 text-center">
      <Icon className="h-9 w-9 text-muted-foreground" />
      <p className="text-muted-foreground">{text}</p>
    </Card>
  );
}
