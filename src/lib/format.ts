import { format } from "date-fns";

export function fmtMatchTime(iso?: string | null): string {
  if (!iso) return "TBD";
  try {
    return format(new Date(iso), "EEE d MMM • HH:mm");
  } catch {
    return "TBD";
  }
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d MMM yyyy, HH:mm");
  } catch {
    return "—";
  }
}

export interface TeamLite {
  id: string;
  name: string;
  flag_emoji?: string | null;
  short_code?: string | null;
}

export function teamMap(teams: TeamLite[]): Record<string, TeamLite> {
  return Object.fromEntries(teams.map((t) => [t.id, t]));
}
