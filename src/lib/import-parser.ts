// Simple, deterministic parser for pasted prediction text.
//
// Format (per participant block):
//   Juan
//   Argentina 2-0 Japan
//   Brazil 1-1 Spain
//   France 3-1 Mexico
//
// Blank lines separate participants. The first non-score line is the name.

export interface ParsedPrediction {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  raw: string;
}

export interface ParsedParticipant {
  name: string;
  predictions: ParsedPrediction[];
}

// Matches "TeamA 2-0 TeamB", "Team A 2 - 0 Team B", "Team A 2:0 Team B"
const SCORE_RE = /^(.+?)\s+(\d{1,2})\s*[-:x]\s*(\d{1,2})\s+(.+?)$/i;

export function parsePredictionText(text: string): ParsedParticipant[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const participants: ParsedParticipant[] = [];
  let current: ParsedParticipant | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (current && current.predictions.length) current = null;
      continue;
    }
    const m = line.match(SCORE_RE);
    if (m && current) {
      current.predictions.push({
        homeTeam: m[1].trim(),
        homeScore: parseInt(m[2], 10),
        awayScore: parseInt(m[3], 10),
        awayTeam: m[4].trim(),
        raw: line,
      });
    } else if (m && !current) {
      // score line with no name yet — start an unnamed block
      current = { name: "Unknown", predictions: [] };
      current.predictions.push({
        homeTeam: m[1].trim(),
        homeScore: parseInt(m[2], 10),
        awayScore: parseInt(m[3], 10),
        awayTeam: m[4].trim(),
        raw: line,
      });
      participants.push(current);
    } else {
      // treat as a participant name
      current = { name: line, predictions: [] };
      participants.push(current);
    }
  }

  return participants.filter((p) => p.predictions.length > 0);
}
