// Pure, deterministic scoring engine — easy to audit and unit-test.
// No I/O, no side effects. All score calculations live here.

export interface ScoringConfig {
  exactScorePoints: number; // exact score correct
  tendencyPoints: number; // correct winner/draw tendency only
  incorrectPoints: number; // wrong tendency
}

export const DEFAULT_SCORING: ScoringConfig = {
  exactScorePoints: 3,
  tendencyPoints: 1,
  incorrectPoints: 0,
};

export type Tendency = "home" | "away" | "draw";

export function tendencyOf(home: number, away: number): Tendency {
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

export interface ScoreBreakdown {
  points: number;
  outcome: "perfect" | "result" | "miss";
}

/**
 * Score a single match prediction against the real result.
 * - Perfect score => exactScorePoints
 * - Correct result (winner/draw) but wrong score => tendencyPoints
 * - Wrong result => incorrectPoints
 */
export function scorePrediction(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number,
  cfg: ScoringConfig = DEFAULT_SCORING,
): ScoreBreakdown {
  if (predHome === realHome && predAway === realAway) {
    return { points: cfg.exactScorePoints, outcome: "perfect" };
  }
  if (tendencyOf(predHome, predAway) === tendencyOf(realHome, realAway)) {
    return { points: cfg.tendencyPoints, outcome: "result" };
  }
  return { points: cfg.incorrectPoints, outcome: "miss" };
}

// Bonus configuration (champion, top scorer, finalists, custom).
export interface BonusField {
  key: string; // e.g. "champion"
  label: string; // e.g. "Champion"
  points: number; // points awarded for a correct bonus
  correctValue?: string | null; // admin-entered correct answer
}

export function scoreBonus(
  predictedValue: string | null | undefined,
  field: BonusField,
): number {
  if (!field.correctValue || !predictedValue) return 0;
  return predictedValue.trim().toLowerCase() === field.correctValue.trim().toLowerCase()
    ? field.points
    : 0;
}

export const DEFAULT_BONUS_FIELDS: BonusField[] = [
  { key: "champion", label: "Champion", points: 5 },
  { key: "top_scorer", label: "Top Scorer", points: 3 },
  { key: "finalist_1", label: "Finalist A", points: 2 },
  { key: "finalist_2", label: "Finalist B", points: 2 },
];
