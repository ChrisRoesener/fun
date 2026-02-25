"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Restaurant {
  groupRestaurantId: string;
  id: string;
  name: string;
  address: string | null;
  category: string | null;
}

export function RestaurantList({
  restaurants,
  isAdmin,
}: {
  restaurants: Restaurant[];
  groupId?: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleRemove(groupRestaurantId: string) {
    if (!confirm("Remove this restaurant from the group?")) return;

    await supabase
      .from("group_restaurants")
      .delete()
      .eq("id", groupRestaurantId);

    router.refresh();
  }

  if (restaurants.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        No restaurants added yet. Search above or add one manually.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {restaurants.map((r) => (
        <li
          key={r.groupRestaurantId}
          className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-100"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm">{r.name}</div>
            <div className="text-xs text-stone-500">
              {[r.category, r.address].filter(Boolean).join(" · ")}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => handleRemove(r.groupRestaurantId)}
              className="ml-3 text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
