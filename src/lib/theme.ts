// Dynamic theming. Themes are stored in the DB with hex colors + typography.
// We inject them as CSS variable overrides so every page (landing, league,
// player board, admin) reflects the active theme instantly.

export interface ThemeColors {
  background?: string;
  card?: string;
  primary?: string;
  accent?: string;
  ring?: string;
}

export interface ThemeTypography {
  display?: string;
  body?: string;
}

export interface ThemeLike {
  id?: string;
  name?: string;
  colors?: ThemeColors | null;
  typography?: ThemeTypography | null;
  logo_url?: string | null;
  background_url?: string | null;
}

/** Build inline CSS variable overrides for a theme. */
export function themeStyleVars(theme?: ThemeLike | null): React.CSSProperties {
  const c = (theme?.colors ?? {}) as ThemeColors;
  const t = (theme?.typography ?? {}) as ThemeTypography;
  const vars: Record<string, string> = {};
  if (c.background) vars["--background"] = c.background;
  if (c.card) vars["--card"] = c.card;
  if (c.primary) {
    vars["--primary"] = c.primary;
    vars["--sidebar-primary"] = c.primary;
  }
  if (c.accent) vars["--accent"] = c.accent;
  if (c.ring) vars["--ring"] = c.ring;
  if (t.display) vars["--font-display"] = `"${t.display}", system-ui, sans-serif`;
  return vars as React.CSSProperties;
}
