import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { instantRunoff, type Ballot } from "@/lib/ranked-choice";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, group_id, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.status !== "voting") {
    return NextResponse.json(
      { error: "Session not in voting state" },
      { status: 400 }
    );
  }

  // Get candidates
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id")
    .eq("session_id", sessionId);

  const candidateIds = candidates?.map((c) => c.id) ?? [];

  if (candidateIds.length === 0) {
    return NextResponse.json(
      { error: "No candidates to tally" },
      { status: 400 }
    );
  }

  // Get all votes
  const { data: allVotes } = await supabase
    .from("votes")
    .select("candidate_id, user_id, rank")
    .in("candidate_id", candidateIds);

  // Group votes by user into ballots
  const userVotes = new Map<string, Map<string, number>>();
  for (const v of allVotes ?? []) {
    if (!userVotes.has(v.user_id)) {
      userVotes.set(v.user_id, new Map());
    }
    userVotes.get(v.user_id)!.set(v.candidate_id, v.rank);
  }

  const ballots: Ballot[] = [...userVotes.values()].map((ranks) => ({
    candidateRanks: ranks,
  }));

  if (ballots.length === 0) {
    return NextResponse.json(
      { error: "No votes cast yet" },
      { status: 400 }
    );
  }

  const { winner } = instantRunoff(candidateIds, ballots);

  // Get the group_restaurant_id of the winning candidate
  const { data: winnerCandidate } = await supabase
    .from("candidates")
    .select("group_restaurant_id")
    .eq("id", winner)
    .single();

  // Update session
  await supabase
    .from("sessions")
    .update({
      status: "decided",
      winner_group_restaurant_id: winnerCandidate?.group_restaurant_id ?? null,
    })
    .eq("id", sessionId);

  return NextResponse.json({
    success: true,
    winnerCandidateId: winner,
    winnerGroupRestaurantId: winnerCandidate?.group_restaurant_id,
  });
}
