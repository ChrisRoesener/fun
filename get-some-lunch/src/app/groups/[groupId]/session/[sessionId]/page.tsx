import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { SessionPanel } from "@/components/session/session-panel";

interface Props {
  params: Promise<{ groupId: string; sessionId: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("group_id", groupId)
    .single();

  if (!session) notFound();

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .single();

  // Auto-join session if not already a member
  await supabase.from("session_members").upsert(
    { session_id: sessionId, user_id: user.id },
    { onConflict: "session_id,user_id" }
  );

  const { data: sessionMembers } = await supabase
    .from("session_members")
    .select("user_id, profiles(display_name, email)")
    .eq("session_id", sessionId);

  const members =
    sessionMembers?.map((sm) => {
      const p = sm.profiles as unknown as { display_name: string | null; email: string };
      return {
        userId: sm.user_id,
        name: p.display_name ?? p.email,
      };
    }) ?? [];

  const { data: candidates } = await supabase
    .from("candidates")
    .select(
      "id, score, group_restaurant_id, group_restaurants(id, restaurants(name, category, address))"
    )
    .eq("session_id", sessionId)
    .order("score", { ascending: false });

  const candidateList =
    candidates?.map((c) => {
      const gr = c.group_restaurants as unknown as {
        id: string;
        restaurants: { name: string; category: string | null; address: string | null };
      };
      return {
        id: c.id,
        groupRestaurantId: c.group_restaurant_id,
        name: gr.restaurants.name,
        category: gr.restaurants.category,
        address: gr.restaurants.address,
        score: c.score,
      };
    }) ?? [];

  const { data: existingVotes } = await supabase
    .from("votes")
    .select("candidate_id, rank")
    .eq("user_id", user.id)
    .in(
      "candidate_id",
      candidateList.map((c) => c.id)
    );

  const myVotes = new Map(
    existingVotes?.map((v) => [v.candidate_id, v.rank]) ?? []
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href={`/groups/${groupId}`}
            className="text-stone-400 hover:text-stone-600"
          >
            &larr;
          </Link>
          <div>
            <h1 className="text-xl font-bold">Lunch Session</h1>
            <p className="text-xs text-stone-500">
              {group?.name} &middot; {session.session_date}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <SessionPanel
          sessionId={sessionId}
          groupId={groupId}
          status={session.status}
          members={members}
          candidates={candidateList}
          myVotes={myVotes}
          currentUserId={user.id}
          winnerGroupRestaurantId={session.winner_group_restaurant_id}
        />
      </main>
    </div>
  );
}
