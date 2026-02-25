"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Candidate {
  id: string;
  groupRestaurantId: string;
  name: string;
  category: string | null;
  address: string | null;
  score: number;
}

export function VotingPanel({
  candidates,
  initialVotes,
  onTally,
  loading: tallyLoading,
}: {
  sessionId?: string;
  candidates: Candidate[];
  initialVotes: Map<string, number>;
  onTally: () => void;
  loading: boolean;
}) {
  const [rankings, setRankings] = useState<Map<string, number>>(
    () => new Map(initialVotes)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(initialVotes.size > 0);
  const supabase = createClient();

  const setRank = useCallback(
    (candidateId: string, rank: number) => {
      setRankings((prev) => {
        const next = new Map(prev);
        // If another candidate had this rank, remove it
        for (const [id, r] of next) {
          if (r === rank && id !== candidateId) {
            next.delete(id);
          }
        }
        if (rank === 0) {
          next.delete(candidateId);
        } else {
          next.set(candidateId, rank);
        }
        return next;
      });
      setSaved(false);
    },
    []
  );

  async function handleSubmitVotes() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Delete old votes
    const candidateIds = candidates.map((c) => c.id);
    await supabase
      .from("votes")
      .delete()
      .eq("user_id", user.id)
      .in("candidate_id", candidateIds);

    // Insert new votes
    const voteRows = [...rankings.entries()].map(([candidateId, rank]) => ({
      candidate_id: candidateId,
      user_id: user.id,
      rank,
    }));

    if (voteRows.length > 0) {
      await supabase.from("votes").insert(voteRows);
    }

    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h3 className="font-semibold text-lg mb-1">Rank your picks</h3>
        <p className="text-sm text-stone-500 mb-4">
          Tap a number to rank each restaurant. 1 = your top choice.
        </p>

        <div className="space-y-3">
          {candidates.map((c) => {
            const rank = rankings.get(c.id);

            return (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-stone-50 border border-stone-200"
              >
                {/* Rank buttons */}
                <div className="flex gap-1">
                  {candidates.map((_, i) => {
                    const r = i + 1;
                    const isSelected = rank === r;
                    const isTaken =
                      !isSelected &&
                      [...rankings.values()].includes(r);

                    return (
                      <button
                        key={r}
                        onClick={() => setRank(c.id, isSelected ? 0 : r)}
                        disabled={isTaken}
                        className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                          isSelected
                            ? "bg-amber-600 text-white"
                            : isTaken
                            ? "bg-stone-100 text-stone-300 cursor-not-allowed"
                            : "bg-white border border-stone-300 text-stone-600 hover:border-amber-400"
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>

                {/* Restaurant info */}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{c.name}</div>
                  {c.category && (
                    <div className="text-xs text-stone-500">{c.category}</div>
                  )}
                </div>

                {rank && (
                  <span className="text-xs font-bold text-amber-600">
                    #{rank}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSubmitVotes}
            disabled={saving || rankings.size === 0}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Votes saved!" : "Submit votes"}
          </button>
        </div>
      </div>

      {/* Tally button */}
      <div className="bg-amber-50 rounded-xl border-2 border-amber-200 p-6 text-center">
        <p className="text-sm text-amber-600 mb-3">
          Once everyone has voted, tally the results.
        </p>
        <button
          onClick={onTally}
          disabled={tallyLoading}
          className="rounded-lg bg-amber-600 px-8 py-3 text-base font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {tallyLoading ? "Tallying..." : "Tally votes and pick a winner"}
        </button>
      </div>
    </div>
  );
}
