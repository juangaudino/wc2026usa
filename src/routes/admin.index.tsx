import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Palette, Plus, ArrowRight, Trophy } from "lucide-react";

import { SiteHeader } from "@/components/app/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { listTournamentsAdmin, createTournament } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin · Predictor League" }] }),
  component: AdminHome,
});

function AdminHome() {
  const qc = useQueryClient();
  const list = useServerFn(listTournamentsAdmin);
  const create = useServerFn(createTournament);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("football");
  const [desc, setDesc] = useState("");

  const { data: tournaments } = useQuery({ queryKey: ["admin-tournaments"], queryFn: () => list() });
  const mut = useMutation({
    mutationFn: () => create({ data: { name, sport_type: sport, description: desc || null } }),
    onSuccess: () => {
      toast.success("Tournament created");
      setName("");
      setDesc("");
      qc.invalidateQueries({ queryKey: ["admin-tournaments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader
        right={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/themes"><Palette className="mr-1 h-4 w-4" /> Themes</Link>
          </Button>
        }
      />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Tournament Admin</h1>
        <p className="mt-1 text-muted-foreground">Create and manage prediction tournaments.</p>

        <Card className="glass-card mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">New tournament</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input placeholder="Name (e.g. World Cup 2026)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Sport type (football, f1, nba…)" value={sport} onChange={(e) => setSport(e.target.value)} />
          </div>
          <Textarea className="mt-3" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Button className="mt-4" disabled={!name || mut.isPending} onClick={() => mut.mutate()}>
            <Plus className="mr-1 h-4 w-4" /> Create
          </Button>
        </Card>

        <h2 className="mt-10 font-display text-xl font-bold">Your tournaments</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(tournaments ?? []).map((t: any) => (
            <Link key={t.id} to="/admin/tournament/$id" params={{ id: t.id }}>
              <Card className="glass-card flex items-center justify-between p-5 transition-all hover:border-primary/50">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="font-display font-semibold">{t.name}</span>
                  </div>
                  <div className="mt-1 flex gap-2">
                    <Badge variant="outline" className="capitalize">{t.sport_type}</Badge>
                    <Badge variant="secondary">{t.status}</Badge>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>
          ))}
          {tournaments && tournaments.length === 0 && (
            <p className="text-sm text-muted-foreground">No tournaments yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
