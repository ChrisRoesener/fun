"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { SessionStatus } from "@/types/database";
import { VotingPanel } from "./voting-panel";

interface Member {
  userId: string;
  name: string;
}

interface Candidate {
  id: string;
  groupRestaurantId: string;
  name: string;
  category: string | null;
  address: string | null;
  score: number;
}

export function SessionPanel({
  sessionId,
  groupId,
  status: initialStatus,
  members: initialMembers,
  candidates,
  myVotes,
  currentUserId,
  winnerGroupRestaurantId,
}: {
  sessionId: string;
  groupId: string;
  status: SessionStatus;
  members: Member[];
  candidates: Candidate[];
  myVotes: Map<string, number>;
  currentUserId: string;
  winnerGroupRestaurantId: string | null;
}) {
  const [status, setStatus] = useState<SessionStatus>(initialStatus);
  const [members] = useState(initialMembers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSuggest() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/sessions/${sessionId}/suggest`, {
      method: "POST",
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to generate suggestions");
      setLoading(false);
      return;
    }

    setStatus("voting");
    setLoading(false);
    router.refresh();
  }

  async function handleTally() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/sessions/${sessionId}/tally`, {
      method: "POST",
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to tally votes");
      setLoading(false);
      return;
    }

    setStatus("decided");
    setLoading(false);
    router.refresh();
  }

  async function handleConfirmVisit() {
    setLoading(true);

    if (!winnerGroupRestaurantId) return;

    const { data: gr } = await supabase
      .from("group_restaurants")
      .select("restaurant_id")
      .eq("id", winnerGroupRestaurantId)
      .single();

    if (!gr) return;

    await supabase.from("visits").insert({
      session_id: sessionId,
      restaurant_id: gr.restaurant_id,
      group_id: groupId,
    });

    await supabase
      .from("sessions")
      .update({ status: "completed" })
      .eq("id", sessionId);

    setStatus("completed");
    setLoading(false);
    router.refresh();
  }

  const winnerCandidate = candidates.find(
    (c) => c.groupRestaurantId === winnerGroupRestaurantId
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Members */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h3 className="font-semibold text-lg mb-3">
          Going to lunch ({members.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <span
              key={m.userId}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                m.userId === currentUserId
                  ? "bg-amber-100 text-amber-800"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              {m.name}
              {m.userId === currentUserId && " (you)"}
            </span>
          ))}
        </div>
        {status === "gathering" && (
          <p className="text-xs text-stone-400 mt-3">
            Share this page with coworkers so they can join the session.
          </p>
        )}
      </div>

      {/* Phase: Gathering */}
      {status === "gathering" && (
        <div className="bg-amber-50 rounded-xl border-2 border-amber-200 p-8 text-center">
          <h3 className="text-xl font-semibold text-amber-800 mb-2">
            Ready to get suggestions?
          </h3>
          <p className="text-sm text-amber-600 mb-6">
            Make sure everyone who&apos;s coming has joined, then hit the
            button.
          </p>
          <button
            onClick={handleSuggest}
            disabled={loading}
            className="rounded-lg bg-amber-600 px-8 py-3 text-base font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Generating..." : "Suggest lunch spots"}
          </button>
        </div>
      )}

      {/* Phase: Voting */}
      {status === "voting" && candidates.length > 0 && (
        <VotingPanel
          sessionId={sessionId}
          candidates={candidates}
          initialVotes={myVotes}
          onTally={handleTally}
          loading={loading}
        />
      )}

      {/* Phase: Decided */}
      {status === "decided" && winnerCandidate && (
        <div className="bg-green-50 rounded-xl border-2 border-green-200 p-8 text-center">
          <p className="text-sm text-green-600 mb-2">The group has spoken!</p>
          <h3 className="text-2xl font-bold text-green-800 mb-1">
            {winnerCandidate.name}
          </h3>
          {winnerCandidate.category && (
            <p className="text-sm text-green-600">{winnerCandidate.category}</p>
          )}
          {winnerCandidate.address && (
            <p className="text-xs text-green-500 mt-1">
              {winnerCandidate.address}
            </p>
          )}
          <div className="mt-6">
            <button
              onClick={handleConfirmVisit}
              disabled={loading}
              className="rounded-lg bg-green-600 px-8 py-3 text-base font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Confirming..." : "Confirm -- we went here!"}
            </button>
          </div>
        </div>
      )}

      {/* Phase: Completed */}
      {status === "completed" && (
        <div className="bg-stone-50 rounded-xl border border-stone-200 p-8 text-center">
          <p className="text-stone-500 mb-2">Session complete</p>
          {winnerCandidate && (
            <h3 className="text-xl font-bold mb-4">
              Went to {winnerCandidate.name}
            </h3>
          )}
          <a
            href={`/groups/${groupId}/history`}
            className="text-amber-700 font-medium hover:underline"
          >
            View lunch history
          </a>
        </div>
      )}
    </div>
  );
}
