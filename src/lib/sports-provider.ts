// Integration layer for external sports results providers.
// MVP: results are entered manually. This module defines the contract and a
// no-op provider so a real API (e.g. football-data.org, API-Sports) can be
// dropped in later without touching the rest of the app.

export interface ExternalMatchResult {
  externalMatchId: string;
  homeScore: number;
  awayScore: number;
  status: "scheduled" | "in_play" | "finished";
}

export interface SportsResultsProvider {
  name: string;
  /** Fetch results for a set of external match ids. */
  fetchResults(externalMatchIds: string[]): Promise<ExternalMatchResult[]>;
}

// Placeholder provider — returns nothing. Manual entry is the source of truth.
export const manualProvider: SportsResultsProvider = {
  name: "manual",
  async fetchResults() {
    return [];
  },
};

let activeProvider: SportsResultsProvider = manualProvider;

export function getResultsProvider(): SportsResultsProvider {
  return activeProvider;
}

export function setResultsProvider(provider: SportsResultsProvider) {
  activeProvider = provider;
}
