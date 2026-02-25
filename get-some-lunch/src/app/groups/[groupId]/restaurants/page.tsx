import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { RestaurantSearch } from "@/components/restaurants/restaurant-search";
import { AddManualRestaurant } from "@/components/restaurants/add-manual-restaurant";
import { RestaurantList } from "@/components/restaurants/restaurant-list";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function RestaurantsPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (!group) notFound();

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const { data: groupRestaurants } = await supabase
    .from("group_restaurants")
    .select("id, restaurant_id, restaurants(id, name, address, category)")
    .eq("group_id", groupId)
    .order("added_at", { ascending: false });

  const restaurants =
    groupRestaurants?.map((gr) => ({
      groupRestaurantId: gr.id,
      ...(gr.restaurants as unknown as {
        id: string;
        name: string;
        address: string | null;
        category: string | null;
      }),
    })) ?? [];

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
          <h1 className="text-xl font-bold">Restaurants</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Search for restaurants */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-semibold text-lg mb-4">Find nearby restaurants</h2>
          {group.lat && group.lng ? (
            <RestaurantSearch
              groupId={groupId}
              lat={group.lat}
              lng={group.lng}
              existingFoursquareIds={
                groupRestaurants
                  ?.map((gr) => {
                    const r = gr.restaurants as unknown as { id: string };
                    return r.id;
                  })
                  .filter(Boolean) ?? []
              }
            />
          ) : (
            <p className="text-sm text-stone-500">
              Set an office address on the group to enable restaurant search.
              For now, add restaurants manually below.
            </p>
          )}
        </div>

        {/* Manual add */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-semibold text-lg mb-4">Add manually</h2>
          <AddManualRestaurant groupId={groupId} />
        </div>

        {/* Current list */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-semibold text-lg mb-4">
            Group restaurants ({restaurants.length})
          </h2>
          <RestaurantList
            restaurants={restaurants}
            groupId={groupId}
            isAdmin={membership.role === "admin"}
          />
        </div>
      </main>
    </div>
  );
}
