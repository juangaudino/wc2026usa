import { cn } from "@/lib/utils";
import { type TeamLite } from "@/lib/format";

export function TeamLabel({
  team,
  align = "left",
  className,
}: {
  team?: TeamLite | null;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
        className,
      )}
    >
      <span className="text-2xl leading-none">{team?.flag_emoji || "🏳️"}</span>
      <span className="truncate font-semibold">{team?.name || "TBD"}</span>
    </div>
  );
}
