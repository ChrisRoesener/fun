export interface Ballot {
  candidateRanks: Map<string, number>; // candidateId -> rank (1 = first choice)
}

export interface RoundResult {
  round: number;
  tallies: Map<string, number>;
  eliminated: string | null;
}

/**
 * Instant Runoff Voting.
 * Each ballot ranks candidates 1st, 2nd, 3rd, etc.
 * Eliminates the candidate with fewest first-place votes each round,
 * redistributing their ballots to next preferences.
 * Returns the winner's candidateId and the round history.
 */
export function instantRunoff(
  candidateIds: string[],
  ballots: Ballot[]
): { winner: string; rounds: RoundResult[] } {
  const rounds: RoundResult[] = [];
  const eliminated = new Set<string>();
  const remaining = new Set(candidateIds);

  // Convert ballots to ordered lists for easier redistribution
  const orderedBallots: string[][] = ballots.map((b) => {
    const entries = [...b.candidateRanks.entries()].sort(
      (a, b) => a[1] - b[1]
    );
    return entries.map(([id]) => id);
  });

  while (remaining.size > 1) {
    // Tally first-place votes among remaining candidates
    const tallies = new Map<string, number>();
    for (const id of remaining) tallies.set(id, 0);

    for (const ranked of orderedBallots) {
      const topChoice = ranked.find((id) => remaining.has(id));
      if (topChoice) {
        tallies.set(topChoice, (tallies.get(topChoice) ?? 0) + 1);
      }
    }

    const totalVotes = [...tallies.values()].reduce((a, b) => a + b, 0);
    const majority = Math.floor(totalVotes / 2) + 1;

    // Check for majority winner
    for (const [id, count] of tallies) {
      if (count >= majority) {
        rounds.push({ round: rounds.length + 1, tallies, eliminated: null });
        return { winner: id, rounds };
      }
    }

    // Eliminate candidate with fewest votes
    let minVotes = Infinity;
    let toEliminate: string | null = null;
    for (const [id, count] of tallies) {
      if (count < minVotes) {
        minVotes = count;
        toEliminate = id;
      }
    }

    if (toEliminate) {
      rounds.push({
        round: rounds.length + 1,
        tallies,
        eliminated: toEliminate,
      });
      eliminated.add(toEliminate);
      remaining.delete(toEliminate);
    } else {
      break;
    }
  }

  const winner = [...remaining][0];
  return { winner, rounds };
}
