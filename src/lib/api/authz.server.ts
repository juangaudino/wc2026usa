// Server-only authorization helpers. Access is enforced here in code because
// all tables are locked to the service role and reached only via server fns.
import type { SupabaseClient } from "@supabase/supabase-js";

// The single Platform Owner / Super Admin. Whoever signs up with this exact
// email is auto-granted the platform_owner role (and auto-approved).
export const OWNER_EMAIL = "juangaudino@gmail.com";

type Admin = SupabaseClient<any, any, any>;

export interface Account {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: "platform_owner" | "league_manager";
  approvalStatus: "pending" | "approved" | "rejected";
}

/**
 * Ensure a profile, role and approval row exist for the authenticated user.
 * Idempotent — safe to call on every login. Returns the resolved account.
 */
export async function provisionAccount(
  admin: Admin,
  userId: string,
  email: string | null,
): Promise<Account> {
  const isOwner = !!email && email.toLowerCase() === OWNER_EMAIL.toLowerCase();

  await admin
    .from("profiles")
    .upsert({ id: userId, email }, { onConflict: "id" });

  // Role
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  let role: Account["role"] = isOwner ? "platform_owner" : "league_manager";
  if (!roles || roles.length === 0) {
    await admin.from("user_roles").insert({ user_id: userId, role });
  } else {
    role = roles.some((r: any) => r.role === "platform_owner")
      ? "platform_owner"
      : "league_manager";
    // Promote to owner if email matches but role missing.
    if (isOwner && role !== "platform_owner") {
      await admin
        .from("user_roles")
        .insert({ user_id: userId, role: "platform_owner" });
      role = "platform_owner";
    }
  }

  // Approval — owners are always approved, managers start pending.
  const { data: appr } = await admin
    .from("manager_approval")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  let approvalStatus: Account["approvalStatus"] = isOwner ? "approved" : "pending";
  if (!appr) {
    await admin.from("manager_approval").insert({
      user_id: userId,
      status: approvalStatus,
    });
  } else {
    approvalStatus = isOwner ? "approved" : (appr.status as any);
    if (isOwner && appr.status !== "approved") {
      await admin
        .from("manager_approval")
        .update({ status: "approved" })
        .eq("user_id", userId);
    }
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();

  return {
    userId,
    email: profile?.email ?? email,
    displayName: profile?.display_name ?? null,
    role,
    approvalStatus,
  };
}

export async function getAccount(
  admin: Admin,
  userId: string,
): Promise<Account | null> {
  const { data: profile } = await admin
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .maybeSingle();
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const { data: appr } = await admin
    .from("manager_approval")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (!roles || roles.length === 0) return null;
  const role = roles.some((r: any) => r.role === "platform_owner")
    ? "platform_owner"
    : "league_manager";
  return {
    userId,
    email: profile?.email ?? null,
    displayName: profile?.display_name ?? null,
    role,
    approvalStatus: (appr?.status as any) ?? "pending",
  };
}

export async function assertOwner(admin: Admin, userId: string) {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "platform_owner")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: Platform Owner access required.");
}

/** Manager must exist, hold the manager role, and be approved. */
export async function assertApprovedManager(admin: Admin, userId: string) {
  const { data: appr } = await admin
    .from("manager_approval")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  // Owners are also allowed to act as managers.
  const { data: ownerRole } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "platform_owner")
    .maybeSingle();
  if (ownerRole) return;
  if (!appr || appr.status !== "approved") {
    throw new Error("Your manager account is not approved yet.");
  }
}

/** Ensure the user owns/co-manages the league. Returns the league row. */
export async function assertLeagueAccess(
  admin: Admin,
  userId: string,
  leagueId: string,
) {
  const { data: league } = await admin
    .from("private_leagues")
    .select("*")
    .eq("id", leagueId)
    .maybeSingle();
  if (!league) throw new Error("League not found.");
  if (league.manager_id === userId) return league;
  const { data: ownerRole } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "platform_owner")
    .maybeSingle();
  if (ownerRole) return league;
  const { data: co } = await admin
    .from("league_managers")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!co) throw new Error("You do not have access to this league.");
  return league;
}

export function makeToken() {
  // Cryptographically strong, URL-safe token.
  return (
    globalThis.crypto.randomUUID().replace(/-/g, "") +
    globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8)
  );
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}
