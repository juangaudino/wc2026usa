import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { SiteHeader } from "@/components/app/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listThemes, saveTheme } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/admin/themes")({
  head: () => ({ meta: [{ title: "Theme Manager · Predictor League" }] }),
  component: ThemeManager,
});

function ThemeManager() {
  const qc = useQueryClient();
  const list = useServerFn(listThemes);
  const save = useServerFn(saveTheme);
  const { data: themes } = useQuery({ queryKey: ["themes"], queryFn: () => list() });

  const [name, setName] = useState("");
  const [sport, setSport] = useState("football");
  const [primary, setPrimary] = useState("#e8b33a");
  const [accent, setAccent] = useState("#34d399");
  const [logo, setLogo] = useState("");
  const [bg, setBg] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      save({
        data: {
          name,
          sport_type: sport,
          colors: { primary, accent },
          logo_url: logo || null,
          background_url: bg || null,
          typography: {},
          button_style: {},
          asset_urls: {},
          is_active: true,
        },
      }),
    onSuccess: () => {
      toast.success("Theme saved");
      setName("");
      qc.invalidateQueries({ queryKey: ["themes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader
        right={
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin">Back</Link>
          </Button>
        }
      />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Theme Manager</h1>
        <p className="mt-1 text-muted-foreground">
          Super Admin · define reusable visual themes per sport type.
        </p>

        <Card className="glass-card mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">New theme</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input placeholder="Theme name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Sport type" value={sport} onChange={(e) => setSport(e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Primary <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-14 rounded border border-border bg-transparent" />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Accent <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-14 rounded border border-border bg-transparent" />
            </label>
            <Input placeholder="Logo URL" value={logo} onChange={(e) => setLogo(e.target.value)} />
            <Input placeholder="Background image URL" value={bg} onChange={(e) => setBg(e.target.value)} />
          </div>
          <Button className="mt-4" disabled={!name || mut.isPending} onClick={() => mut.mutate()}>
            <Plus className="mr-1 h-4 w-4" /> Save theme
          </Button>
        </Card>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(themes ?? []).map((t: any) => (
            <Card key={t.id} className="glass-card p-5">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full" style={{ background: t.colors?.primary || "#888" }} />
                <span className="h-5 w-5 rounded-full" style={{ background: t.colors?.accent || "#888" }} />
                <span className="ml-auto text-xs uppercase text-muted-foreground">{t.sport_type}</span>
              </div>
              <h3 className="mt-3 font-display font-semibold">{t.name}</h3>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
