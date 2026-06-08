import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Trophy className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Predictor<span className="text-primary"> League</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
