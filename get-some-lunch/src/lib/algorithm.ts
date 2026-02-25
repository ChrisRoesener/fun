import type { Frequency } from "@/types/database";

const FREQUENCY_TARGET_DAYS: Record<Frequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  rarely: 90,
  never: Infinity,
};

export interface RestaurantCandidate {
  groupRestaurantId: string;
  restaurantId: string;
  name: string;
}

export interface MemberPreference {
  userId: string;
  groupRestaurantId: string;
  frequency: Frequency;
}

export interface VisitRecord {
  restaurantId: string;
  groupRestaurantId: string;
  visitDate: string;
}

export interface ScoredCandidate {
  groupRestaurantId: string;
  score: number;
}

export function generateSuggestions(
  restaurants: RestaurantCandidate[],
  memberPreferences: MemberPreference[],
  memberUserIds: string[],
  recentVisits: VisitRecord[],
  topN: number = 5
): ScoredCandidate[] {
  const today = new Date();

  // Build preference lookup: userId -> groupRestaurantId -> frequency
  const prefsByUser = new Map<string, Map<string, Frequency>>();
  for (const mp of memberPreferences) {
    if (!prefsByUser.has(mp.userId)) {
      prefsByUser.set(mp.userId, new Map());
    }
    prefsByUser.get(mp.userId)!.set(mp.groupRestaurantId, mp.frequency);
  }

  // Build last-visit lookup: groupRestaurantId -> most recent date
  const lastVisit = new Map<string, Date>();
  for (const v of recentVisits) {
    const d = new Date(v.visitDate);
    const existing = lastVisit.get(v.groupRestaurantId);
    if (!existing || d > existing) {
      lastVisit.set(v.groupRestaurantId, d);
    }
  }

  const scored: ScoredCandidate[] = [];

  for (const restaurant of restaurants) {
    const { groupRestaurantId } = restaurant;

    // Hard filter: skip if ANY member has it set to "never"
    let vetoed = false;
    for (const userId of memberUserIds) {
      const userPrefs = prefsByUser.get(userId);
      const freq = userPrefs?.get(groupRestaurantId) ?? "weekly";
      if (freq === "never") {
        vetoed = true;
        break;
      }
    }
    if (vetoed) continue;

    // Score across all members
    let totalScore = 0;
    let hardViolation = false;

    for (const userId of memberUserIds) {
      const userPrefs = prefsByUser.get(userId);
      const freq = userPrefs?.get(groupRestaurantId) ?? "weekly";
      const targetDays = FREQUENCY_TARGET_DAYS[freq];

      const lastDate = lastVisit.get(groupRestaurantId);
      const daysSince = lastDate
        ? Math.max(0, (today.getTime() - lastDate.getTime()) / 86400000)
        : 999; // never visited = very overdue

      // Hard violation: visited too recently relative to a restrictive preference
      // e.g., monthly preference but visited 2 days ago
      if (targetDays >= 30 && daysSince < targetDays * 0.3) {
        hardViolation = true;
        break;
      }

      // Desire score: how "overdue" this restaurant is for this user
      const desireScore = daysSince / targetDays;

      // Random jitter for variety (0 to 0.25)
      const jitter = Math.random() * 0.25;

      totalScore += desireScore + jitter;
    }

    if (hardViolation) continue;

    // Average across members
    const avgScore = totalScore / memberUserIds.length;
    scored.push({ groupRestaurantId, score: avgScore });
  }

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
