// Flexible, multi-format parser for pasted prediction text.
//
// Supports per-participant blocks separated by blank lines. The first line of
// a block is normally the participant name, followed by one prediction per
// entry. Predictions may be written inline ("Argentina 2-0 Japan") or split
// across two lines ("Argentina - Japan" then "2 a 0").
//
// Supported formats:
//   A) "Argentina 2-0 Japan"        inline, dash separator
//   B) "Argentina - Japan\n2 a 0"   teams on one line, score on next
//   C) "Argentina vs Japan\n2-0"    vs separator, score on next line
//   D) "Argentina 2 x 0 Japan"      x separator inline
//   E) "Argentina 2 a 0 Japón"      'a' separator, accented name
//   F) "ARG 2-0 JPN"                FIFA 3-letter codes
//   G) "ARG - JPN\n2:0"             codes with colon score

export interface ParsedPrediction {
  homeTeam: string; // normalized English name
  awayTeam: string; // normalized English name
  homeScore: number | null;
  awayScore: number | null;
  raw: string;
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
}

export interface ParsedParticipant {
  name: string;
  predictions: ParsedPrediction[];
}

// ---------------------------------------------------------------------------
// Country aliases
// ---------------------------------------------------------------------------

interface CountryEntry {
  name: string; // canonical English name
  code: string; // FIFA 3-letter code
  aliases: string[]; // Spanish / alternate spellings
}

const COUNTRIES: CountryEntry[] = [
  { name: "Argentina", code: "ARG", aliases: [] },
  { name: "Brazil", code: "BRA", aliases: ["Brasil"] },
  { name: "France", code: "FRA", aliases: ["Francia"] },
  { name: "Spain", code: "ESP", aliases: ["España", "Espana"] },
  { name: "England", code: "ENG", aliases: ["Inglaterra"] },
  { name: "Germany", code: "GER", aliases: ["Alemania", "Deutschland"] },
  { name: "Portugal", code: "POR", aliases: [] },
  { name: "Netherlands", code: "NED", aliases: ["Holanda", "Paises Bajos", "Países Bajos"] },
  { name: "USA", code: "EUA", aliases: ["Estados Unidos", "United States", "USMNT", "US"] },
  { name: "Mexico", code: "MEX", aliases: ["México"] },
  { name: "Canada", code: "CAN", aliases: ["Canadá"] },
  { name: "Japan", code: "JPN", aliases: ["Japón", "Japon"] },
  { name: "South Korea", code: "KOR", aliases: ["Corea", "Corea del Sur", "Korea"] },
  { name: "Uruguay", code: "URU", aliases: [] },
  { name: "Croatia", code: "CRO", aliases: ["Croacia"] },
  { name: "Morocco", code: "MAR", aliases: ["Marruecos"] },
];

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function norm(str: string): string {
  return stripAccents(str.trim().toLowerCase()).replace(/\s+/g, " ");
}

// Build lookup maps.
const EXACT_NAME = new Map<string, string>(); // normalized english name -> canonical
const CODE = new Map<string, string>(); // normalized code -> canonical
const ALIAS = new Map<string, string>(); // normalized alias -> canonical

for (const c of COUNTRIES) {
  EXACT_NAME.set(norm(c.name), c.name);
  CODE.set(norm(c.code), c.name);
  for (const a of c.aliases) ALIAS.set(norm(a), c.name);
}

type MatchLevel = "exact" | "alias" | "fuzzy" | "none";

interface TeamMatch {
  name: string; // canonical when matched, otherwise raw input
  level: MatchLevel;
}

function matchTeam(input: string): TeamMatch {
  const raw = input.trim();
  const n = norm(raw);
  if (!n) return { name: raw, level: "none" };

  if (EXACT_NAME.has(n)) return { name: EXACT_NAME.get(n)!, level: "exact" };
  if (CODE.has(n)) return { name: CODE.get(n)!, level: "exact" };
  if (ALIAS.has(n)) return { name: ALIAS.get(n)!, level: "alias" };

  // Fuzzy: partial string match against names / codes / aliases.
  for (const [k, v] of EXACT_NAME) {
    if (k.includes(n) || n.includes(k)) return { name: v, level: "fuzzy" };
  }
  for (const [k, v] of ALIAS) {
    if (k.includes(n) || n.includes(k)) return { name: v, level: "fuzzy" };
  }

  return { name: raw, level: "none" };
}

function rank(level: MatchLevel): number {
  switch (level) {
    case "exact":
      return 2;
    case "alias":
      return 1;
    default:
      return 0;
  }
}

function confidenceFor(a: TeamMatch, b: TeamMatch): "high" | "medium" | "low" {
  if (a.level === "exact" && b.level === "exact") return "high";
  if (rank(a.level) >= 1 && rank(b.level) >= 1) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Score / team line parsing
// ---------------------------------------------------------------------------

// Inline: "Team 2-0 Team", "Team 2 x 0 Team", "Team 2 a 0 Team", "Team 2:0 Team"
const INLINE_RE = /^(.+?)\s+(\d{1,2})\s*(?:-|x|a|:|vs|v)\s*(\d{1,2})\s+(.+?)$/i;
// Score only: "2-0", "2 a 0", "2:0", "2 x 0"
const SCORE_RE = /^(\d{1,2})\s*(?:-|x|a|:|vs|v)\s*(\d{1,2})$/i;
// Teams only: "Argentina - Japan", "Argentina vs Japan", "ARG - JPN"
const TEAMS_RE = /^(.+?)\s+(?:-|vs|v|x|a|:)\s+(.+?)$/i;

function buildPrediction(
  homeRaw: string,
  awayRaw: string,
  homeScore: number | null,
  awayScore: number | null,
  raw: string,
): ParsedPrediction {
  const home = matchTeam(homeRaw);
  const away = matchTeam(awayRaw);
  const confidence = confidenceFor(home, away);
  const needsReview =
    confidence === "low" || homeScore === null || awayScore === null;
  return {
    homeTeam: home.name,
    awayTeam: away.name,
    homeScore,
    awayScore,
    raw,
    confidence,
    needsReview,
  };
}

function parseInline(line: string): ParsedPrediction | null {
  const m = line.match(INLINE_RE);
  if (!m) return null;
  return buildPrediction(
    m[1].trim(),
    m[4].trim(),
    parseInt(m[2], 10),
    parseInt(m[3], 10),
    line,
  );
}

function parseTeamsLine(line: string): { home: string; away: string } | null {
  if (SCORE_RE.test(line)) return null; // a pure score line is not teams
  const m = line.match(TEAMS_RE);
  if (!m) return null;
  return { home: m[1].trim(), away: m[2].trim() };
}

function parseScoreLine(line: string): { home: number; away: number } | null {
  const m = line.match(SCORE_RE);
  if (!m) return null;
  return { home: parseInt(m[1], 10), away: parseInt(m[2], 10) };
}

function isPredictionStart(line: string): boolean {
  return parseInline(line) !== null || parseTeamsLine(line) !== null;
}

function parsePredictionLines(lines: string[]): ParsedPrediction[] {
  const preds: ParsedPrediction[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const inline = parseInline(line);
    if (inline) {
      preds.push(inline);
      continue;
    }

    const teams = parseTeamsLine(line);
    if (teams) {
      const next = i + 1 < lines.length ? parseScoreLine(lines[i + 1]) : null;
      if (next) {
        preds.push(
          buildPrediction(
            teams.home,
            teams.away,
            next.home,
            next.away,
            `${line}\n${lines[i + 1]}`,
          ),
        );
        i++;
      } else {
        // Teams without a score — keep for review.
        preds.push(buildPrediction(teams.home, teams.away, null, null, line));
      }
    }
  }
  return preds;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parsePredictionText(text: string): ParsedParticipant[] {
  const blocks = text
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((b) => b.length > 0);

  const participants: ParsedParticipant[] = [];

  for (const block of blocks) {
    let name = "Unknown";
    let contentLines = block;

    if (!isPredictionStart(block[0])) {
      name = block[0];
      contentLines = block.slice(1);
    }

    const predictions = parsePredictionLines(contentLines);
    if (predictions.length > 0) {
      participants.push({ name, predictions });
    }
  }

  return participants;
}
