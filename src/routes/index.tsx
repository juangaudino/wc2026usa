import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ShieldCheck, Target, Medal, ArrowRight, Sparkles, Users } from "lucide-react";

import heroImg from "@/assets/hero-stadium.jpg";
import { SiteHeader } from "@/components/app/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { themeStyleVars } from "@/lib/theme";
import { listPublicTournaments } from "@/lib/api/public.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Predictor League — Friendly Tournament Predictions" },
      {
        name: "description",
        content:
          "Join a friendly prediction league. Pick match scores, earn badges, and climb the leaderboard. World Cup 2026 and more — no betting, just bragging rights.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const fetchData = useServerFn(listPublicTournaments);
  const { data } = useQuery({
    queryKey: ["public-tournaments"],
    queryFn: () => fetchData(),
  });

  const tournaments = data?.tournaments ?? [];
  const leagues = data?.leagues ?? [];
  const activeTheme = tournaments.find((t) => t.themes)?.themes as any;

  return (
    <div className="min-h-screen" style={themeStyleVars(activeTheme)}>
      <SiteHeader
        right={
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">Manager login</Link>
          </Button>
        }
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="Floodlit football stadium at night"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <Badge variant="secondary" className="mb-5 gap-1.5 rounded-full px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Friendly prediction pool — no betting
          </Badge>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl">
            Predict the matches.{" "}
            <span className="text-gradient-gold">Climb the leaderboard.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            A premium prediction league for any tournament. Pick scores, nail exact results for bonus
            points, and earn badges. Starting with{" "}
            <span className="font-semibold text-foreground">World Cup 2026</span>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#leagues">
                Browse leagues <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">Run a league</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Scoring highlights */}
      <section className="mx-auto -mt-10 max-w-6xl px-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Target, title: "Exact score", pts: "3 pts", desc: "Nail the precise result." },
            { icon: Medal, title: "Right tendency", pts: "1 pt", desc: "Correct winner or draw." },
            { icon: Trophy, title: "Bonus picks", pts: "+pts", desc: "Champion, top scorer & more." },
          ].map((c) => (
            <Card key={c.title} className="glass-card p-5">
              <c.icon className="h-6 w-6 text-primary" />
              <div className="mt-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                <span className="font-display font-bold text-primary">{c.pts}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Tournaments */}
      {tournaments.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-16">
          <h2 className="mb-6 font-display text-2xl font-bold">Tournaments</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Card key={t.id} className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">{t.sport_type}</Badge>
                  {t.season && <span className="text-xs text-muted-foreground">{t.season}</span>}
                </div>
                <h3 className="mt-4 font-display text-xl font-bold">{t.name}</h3>
                {t.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Public leagues */}
      <section id="leagues" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-6 font-display text-2xl font-bold">Public leagues</h2>

        {leagues.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((l: any) => (
              <Link key={l.id} to="/t/$slug" params={{ slug: l.slug }} className="group">
                <Card className="glass-card h-full overflow-hidden p-5 transition-all hover:border-primary/50 hover:shadow-xl">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" /> League
                  </Badge>
                  <h3 className="mt-4 font-display text-xl font-bold group-hover:text-primary">
                    {l.name}
                  </h3>
                  <div className="mt-4 flex items-center text-sm font-medium text-primary">
                    View leaderboard{" "}
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="glass-card flex flex-col items-center gap-3 p-12 text-center">
            <ShieldCheck className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No public leagues yet.</p>
            <Button asChild>
              <Link to="/dashboard">Create the first one</Link>
            </Button>
          </Card>
        )}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        Predictor League · A friendly prediction pool. Play responsibly, just for fun.
      </footer>
    </div>
  );
}
