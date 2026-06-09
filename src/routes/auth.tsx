import { createFileRoute, useRouter, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Trophy } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccount } from "@/lib/api/admin.functions";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Manager Sign In · Predictor League" }] }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard",
          data: { display_name: name },
        },
      });
      if (error) throw error;
      toast.success("Account created. Awaiting approval from the platform owner.");
      router.navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Trophy className="h-6 w-6" />
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold">Tournament Managers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Private access for league managers. New accounts need owner approval.
          </p>
        </div>

        <Card className="glass-card p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4 space-y-4">
              <Field label="Email" value={email} onChange={setEmail} type="email" />
              <Field label="Password" value={password} onChange={setPassword} type="password" />
              <Button className="w-full" onClick={signIn} disabled={loading}>
                {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Sign in
              </Button>
            </TabsContent>

            <TabsContent value="register" className="mt-4 space-y-4">
              <Field label="Display name" value={name} onChange={setName} />
              <Field label="Email" value={email} onChange={setEmail} type="email" />
              <Field label="Password" value={password} onChange={setPassword} type="password" />
              <Button className="w-full" onClick={signUp} disabled={loading}>
                {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create account
              </Button>
            </TabsContent>
          </Tabs>
        </Card>
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
