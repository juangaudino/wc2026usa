// Seeded World Cup 2026 fixture data. This is the clean import structure the
// Platform Owner's generator consumes. When a real provider (FIFA / API-Sports)
// is connected later, map its payload into these same shapes — nothing else in
// the app needs to change.

export interface SeedTeam {
  name: string;
  short_code: string;
  flag_emoji: string;
  group_name: string;
}

export interface SeedMatch {
  homeShort: string;
  awayShort: string;
  stage: string;
  group_name: string;
  /** ISO kickoff time */
  match_time: string;
  venue: string;
  city: string;
}

// 12 groups (A–L), 4 teams each = 48 teams (2026 format).
export const WC2026_TEAMS: SeedTeam[] = [
  // A
  { name: "Mexico", short_code: "MEX", flag_emoji: "🇲🇽", group_name: "A" },
  { name: "Canada", short_code: "CAN", flag_emoji: "🇨🇦", group_name: "A" },
  { name: "Croatia", short_code: "CRO", flag_emoji: "🇭🇷", group_name: "A" },
  { name: "Ecuador", short_code: "ECU", flag_emoji: "🇪🇨", group_name: "A" },
  // B
  { name: "United States", short_code: "USA", flag_emoji: "🇺🇸", group_name: "B" },
  { name: "Wales", short_code: "WAL", flag_emoji: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", group_name: "B" },
  { name: "Senegal", short_code: "SEN", flag_emoji: "🇸🇳", group_name: "B" },
  { name: "Japan", short_code: "JPN", flag_emoji: "🇯🇵", group_name: "B" },
  // C
  { name: "Argentina", short_code: "ARG", flag_emoji: "🇦🇷", group_name: "C" },
  { name: "Poland", short_code: "POL", flag_emoji: "🇵🇱", group_name: "C" },
  { name: "Australia", short_code: "AUS", flag_emoji: "🇦🇺", group_name: "C" },
  { name: "Morocco", short_code: "MAR", flag_emoji: "🇲🇦", group_name: "C" },
  // D
  { name: "France", short_code: "FRA", flag_emoji: "🇫🇷", group_name: "D" },
  { name: "Denmark", short_code: "DEN", flag_emoji: "🇩🇰", group_name: "D" },
  { name: "Tunisia", short_code: "TUN", flag_emoji: "🇹🇳", group_name: "D" },
  { name: "Peru", short_code: "PER", flag_emoji: "🇵🇪", group_name: "D" },
  // E
  { name: "Spain", short_code: "ESP", flag_emoji: "🇪🇸", group_name: "E" },
  { name: "Germany", short_code: "GER", flag_emoji: "🇩🇪", group_name: "E" },
  { name: "Costa Rica", short_code: "CRC", flag_emoji: "🇨🇷", group_name: "E" },
  { name: "Nigeria", short_code: "NGA", flag_emoji: "🇳🇬", group_name: "E" },
  // F
  { name: "Belgium", short_code: "BEL", flag_emoji: "🇧🇪", group_name: "F" },
  { name: "Colombia", short_code: "COL", flag_emoji: "🇨🇴", group_name: "F" },
  { name: "Egypt", short_code: "EGY", flag_emoji: "🇪🇬", group_name: "F" },
  { name: "South Korea", short_code: "KOR", flag_emoji: "🇰🇷", group_name: "F" },
  // G
  { name: "Brazil", short_code: "BRA", flag_emoji: "🇧🇷", group_name: "G" },
  { name: "Serbia", short_code: "SRB", flag_emoji: "🇷🇸", group_name: "G" },
  { name: "Switzerland", short_code: "SUI", flag_emoji: "🇨🇭", group_name: "G" },
  { name: "Cameroon", short_code: "CMR", flag_emoji: "🇨🇲", group_name: "G" },
  // H
  { name: "Portugal", short_code: "POR", flag_emoji: "🇵🇹", group_name: "H" },
  { name: "Uruguay", short_code: "URU", flag_emoji: "🇺🇾", group_name: "H" },
  { name: "Ghana", short_code: "GHA", flag_emoji: "🇬🇭", group_name: "H" },
  { name: "Saudi Arabia", short_code: "KSA", flag_emoji: "🇸🇦", group_name: "H" },
  // I
  { name: "England", short_code: "ENG", flag_emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group_name: "I" },
  { name: "Netherlands", short_code: "NED", flag_emoji: "🇳🇱", group_name: "I" },
  { name: "Iran", short_code: "IRN", flag_emoji: "🇮🇷", group_name: "I" },
  { name: "United States 2", short_code: "PAN", flag_emoji: "🇵🇦", group_name: "I" },
  // J
  { name: "Italy", short_code: "ITA", flag_emoji: "🇮🇹", group_name: "J" },
  { name: "Mexico 2", short_code: "QAT", flag_emoji: "🇶🇦", group_name: "J" },
  { name: "Ivory Coast", short_code: "CIV", flag_emoji: "🇨🇮", group_name: "J" },
  { name: "Chile", short_code: "CHI", flag_emoji: "🇨🇱", group_name: "J" },
  // K
  { name: "Netherlands 2", short_code: "SCO", flag_emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group_name: "K" },
  { name: "Sweden", short_code: "SWE", flag_emoji: "🇸🇪", group_name: "K" },
  { name: "Algeria", short_code: "ALG", flag_emoji: "🇩🇿", group_name: "K" },
  { name: "Paraguay", short_code: "PAR", flag_emoji: "🇵🇾", group_name: "K" },
  // L
  { name: "Norway", short_code: "NOR", flag_emoji: "🇳🇴", group_name: "L" },
  { name: "Turkey", short_code: "TUR", flag_emoji: "🇹🇷", group_name: "L" },
  { name: "South Africa", short_code: "RSA", flag_emoji: "🇿🇦", group_name: "L" },
  { name: "New Zealand", short_code: "NZL", flag_emoji: "🇳🇿", group_name: "L" },
];

const VENUES = [
  { venue: "MetLife Stadium", city: "New York/New Jersey" },
  { venue: "SoFi Stadium", city: "Los Angeles" },
  { venue: "AT&T Stadium", city: "Dallas" },
  { venue: "Estadio Azteca", city: "Mexico City" },
  { venue: "BMO Field", city: "Toronto" },
  { venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  { venue: "Lincoln Financial Field", city: "Philadelphia" },
  { venue: "Levi's Stadium", city: "San Francisco Bay Area" },
  { venue: "Hard Rock Stadium", city: "Miami" },
  { venue: "Arrowhead Stadium", city: "Kansas City" },
  { venue: "NRG Stadium", city: "Houston" },
  { venue: "Lumen Field", city: "Seattle" },
];

// Round-robin pairings within a group of 4 (1-indexed).
const RR_PAIRS: [number, number][] = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
];

/** Build the full group-stage match list from the seeded teams. */
export function buildWorldCup2026Matches(): SeedMatch[] {
  const groups: Record<string, SeedTeam[]> = {};
  for (const t of WC2026_TEAMS) {
    (groups[t.group_name] ??= []).push(t);
  }
  const matches: SeedMatch[] = [];
  // Tournament opens June 11, 2026. Spread group matches across ~16 days.
  const start = new Date("2026-06-11T16:00:00.000Z").getTime();
  let dayOffset = 0;
  let venueIdx = 0;
  const groupNames = Object.keys(groups).sort();
  for (const g of groupNames) {
    const teams = groups[g];
    if (teams.length < 4) continue;
    RR_PAIRS.forEach((pair, i) => {
      const kickoff = new Date(
        start + dayOffset * 86_400_000 + (i % 3) * 3 * 3_600_000,
      ).toISOString();
      const v = VENUES[venueIdx % VENUES.length];
      venueIdx++;
      matches.push({
        homeShort: teams[pair[0]].short_code,
        awayShort: teams[pair[1]].short_code,
        stage: "group",
        group_name: g,
        match_time: kickoff,
        venue: v.venue,
        city: v.city,
      });
    });
    dayOffset += 1;
  }
  return matches;
}

export const WC2026_BONUS = [
  { bonus_key: "champion", label: "Champion", input_type: "team", points: 8, sort_order: 1 },
  { bonus_key: "runner_up", label: "Runner-up", input_type: "team", points: 5, sort_order: 2 },
  { bonus_key: "top_scorer", label: "Top Scorer", input_type: "text", points: 5, sort_order: 3 },
  { bonus_key: "best_group", label: "Best Group Stage Team", input_type: "team", points: 3, sort_order: 4 },
];
