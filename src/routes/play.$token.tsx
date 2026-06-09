import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, Crown, Lock, Check, Loader2, Target } from "lucide-react";
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
          </TabsList>

          <TabsContent value="matches" className="mt-4 space-y-3">
            {(data.matches as any[]).length === 0 && (
              <p className="text-sm text-muted-foreground">No matches scheduled yet.</p>
            )}
            {(data.matches as any[]).map((m) => (
              <MatchPredictionCard
                key={m.id}
                token={token}
                match={m}
                tm={tm}
                locked={isLocked(t, m)}
                prediction={predByMatch.get(m.id)}
                result={resByMatch.get(m.id)}
              />
            ))}
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
                  locked={Boolean(t.predictions_locked)}
                  value={bonusByKey.get(b.key) ?? ""}
                />
              ))}
            </TabsContent>
          )}
        </Tabs>

        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Trophy className="h-4 w-4" /> Friendly pool — no betting, just bragging
          rights.
        </p>
      </main>
    </div>
  );
}

function MatchPredictionCard({
  token,
  match,
  tm,
  locked,
  prediction,
  result,
}: {
  token: string;
  match: any;
  tm: Record<string, any>;
  locked: boolean;
  prediction?: any;
  result?: any;
}) {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(savePlayerPrediction);
  const [home, setHome] = useState<string>(
    prediction?.home_score?.toString() ?? "",
  );
  const [away, setAway] = useState<string>(
    prediction?.away_score?.toString() ?? "",
  );
  const [saving, setSaving] = useState(false);

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

  async function save() {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (Number.isNaN(h) || Number.isNaN(a)) {
      toast.error("Enter a score for both teams.");
      return;
    }
    setSaving(true);
    try {
      await saveFn({ data: { token, matchId: match.id, homeScore: h, awayScore: a } });
      await queryClient.invalidateQueries({ queryKey: ["player-board", token] });
      toast.success("Prediction saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save prediction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{fmtMatchTime(match.match_time)}</span>
        <span className="flex items-center gap-2 capitalize">
          {match.stage}
          {locked && <Lock className="h-3 w-3" />}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamLabel team={tm[match.home_team_id]} />
        <div className="flex items-center gap-1">
          <Input
            inputMode="numeric"
            className="h-11 w-12 text-center font-display text-lg font-bold"
            value={home}
            disabled={locked}
            onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            inputMode="numeric"
            className="h-11 w-12 text-center font-display text-lg font-bold"
            value={away}
            disabled={locked}
            onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
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
                breakdown.outcome === "exact"
                  ? "bg-primary text-primary-foreground"
                  : breakdown.outcome === "tendency"
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary"
              }
            >
              {breakdown.outcome === "exact"
                ? "Exact score"
                : breakdown.outcome === "tendency"
                  ? "Correct tendency"
                  : "Missed"}{" "}
              +{breakdown.points}
            </Badge>
          )}
        </div>
        {!locked && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save
          </Button>
        )}
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
