import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSuggestions } from "@/lib/algorithm";
import type { Frequency } from "@/types/database";

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

  if (!session || session.status !== "gathering") {
    return NextResponse.json(
      { error: "Session not in gathering state" },
      { status: 400 }
    );
  }

  // Get session members
  const { data: sessionMembers } = await supabase
    .from("session_members")
    .select("user_id")
    .eq("session_id", sessionId);

  const memberIds = sessionMembers?.map((sm) => sm.user_id) ?? [];

  // Get group restaurants
  const { data: groupRestaurants } = await supabase
    .from("group_restaurants")
    .select("id, restaurant_id, restaurants(name)")
    .eq("group_id", session.group_id);

  const restaurants =
    groupRestaurants?.map((gr) => {
      const r = gr.restaurants as unknown as { name: string };
      return {
        groupRestaurantId: gr.id,
        restaurantId: gr.restaurant_id,
        name: r.name,
      };
    }) ?? [];

  if (restaurants.length === 0) {
    return NextResponse.json(
      { error: "No restaurants in this group" },
      { status: 400 }
    );
  }

  // Get preferences for all session members
  const { data: allPrefs } = await supabase
    .from("preferences")
    .select("user_id, group_restaurant_id, frequency")
    .in("user_id", memberIds);

  const memberPreferences =
    allPrefs?.map((p) => ({
      userId: p.user_id,
      groupRestaurantId: p.group_restaurant_id,
      frequency: p.frequency as Frequency,
    })) ?? [];

  // Get recent visits (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: visits } = await supabase
    .from("visits")
    .select("restaurant_id, visit_date, group_id")
    .eq("group_id", session.group_id)
    .gte("visit_date", ninetyDaysAgo.toISOString().split("T")[0]);

  // Map visits to group_restaurant_ids
  const restaurantToGR = new Map(
    restaurants.map((r) => [r.restaurantId, r.groupRestaurantId])
  );

  const recentVisits =
    visits?.map((v) => ({
      restaurantId: v.restaurant_id,
      groupRestaurantId: restaurantToGR.get(v.restaurant_id) ?? "",
      visitDate: v.visit_date,
    })) ?? [];

  const suggestions = generateSuggestions(
    restaurants,
    memberPreferences,
    memberIds,
    recentVisits,
    5
  );

  if (suggestions.length === 0) {
    return NextResponse.json(
      { error: "No suitable restaurants found. All may be vetoed or visited too recently." },
      { status: 400 }
    );
  }

  // Clear old candidates if any
  await supabase.from("candidates").delete().eq("session_id", sessionId);

  // Insert candidates
  const candidateRows = suggestions.map((s) => ({
    session_id: sessionId,
    group_restaurant_id: s.groupRestaurantId,
    score: s.score,
  }));

  await supabase.from("candidates").insert(candidateRows);

  // Update session status to voting
  await supabase
    .from("sessions")
    .update({ status: "voting" })
    .eq("id", sessionId);

  return NextResponse.json({ success: true, count: suggestions.length });
}
