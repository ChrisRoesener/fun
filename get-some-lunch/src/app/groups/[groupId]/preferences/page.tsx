import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PreferencesList } from "@/components/restaurants/preferences-list";
import type { Frequency } from "@/types/database";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function PreferencesPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const { data: groupRestaurants } = await supabase
    .from("group_restaurants")
    .select("id, restaurants(name, category)")
    .eq("group_id", groupId);

  const { data: userPreferences } = await supabase
    .from("preferences")
    .select("group_restaurant_id, frequency")
    .eq("user_id", user.id);

  const prefMap = new Map<string, Frequency>();
  userPreferences?.forEach((p) => {
    prefMap.set(p.group_restaurant_id, p.frequency as Frequency);
  });

  const items =
    groupRestaurants?.map((gr) => {
      const r = gr.restaurants as unknown as { name: string; category: string | null };
      return {
        groupRestaurantId: gr.id,
        name: r.name,
        category: r.category,
        frequency: prefMap.get(gr.id) ?? ("weekly" as Frequency),
      };
    }) ?? [];

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
          <h1 className="text-xl font-bold">Your preferences</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-stone-500 mb-6">
          Set how often you&apos;d like to visit each restaurant. The algorithm
          uses these to generate personalized suggestions for your group.
        </p>

        {items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
            <p className="text-stone-500">
              No restaurants in this group yet.{" "}
              <Link
                href={`/groups/${groupId}/restaurants`}
                className="text-amber-700 font-medium hover:underline"
              >
                Add some first.
              </Link>
            </p>
          </div>
        ) : (
          <PreferencesList items={items} />
        )}
      </main>
    </div>
  );
}
