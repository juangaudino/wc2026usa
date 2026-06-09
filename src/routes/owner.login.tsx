import { createFileRoute, useRouter, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyAccount } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/owner/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Platform Owner Sign In · Predictor League" }] }),
  component: OwnerLoginPage,
});

function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const fetchAccount = useServerFn(getMyAccount);

  async function signIn() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const account = await fetchAccount();
      if (account.role !== "platform_owner") {
        toast.error("This login is for the Platform Owner only.");
        await supabase.auth.signOut();
        return;
      }
      router.navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold">Platform Owner Access</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage the platform.
          </p>
        </div>

        <Card className="glass-card p-6">
          <div className="space-y-4">
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            <Field label="Password" value={password} onChange={setPassword} type="password" />
            <Button className="w-full" onClick={signIn} disabled={loading}>
              {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Sign in
            </Button>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Tournament Manager?{" "}
          <Link to="/auth" className="underline underline-offset-2 hover:text-primary">
            Sign in at /auth
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
