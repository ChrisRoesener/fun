"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SearchResult {
  foursquare_id: string;
  name: string;
  address: string;
  category: string;
  distance: number | null;
  lat: number | null;
  lng: number | null;
}

export function RestaurantSearch({
  groupId,
  lat,
  lng,
  existingFoursquareIds,
}: {
  groupId: string;
  lat: number;
  lng: number;
  existingFoursquareIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const supabase = createClient();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);

    const res = await fetch(
      `/api/restaurants/search?query=${encodeURIComponent(query)}&lat=${lat}&lng=${lng}`
    );
    const data = await res.json();
    setResults(data.results ?? []);
    setSearching(false);
  }

  async function handleAdd(result: SearchResult) {
    setAdding(result.foursquare_id);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from("restaurants")
      .select("id")
      .eq("foursquare_id", result.foursquare_id)
      .maybeSingle();

    let restaurantId: string;

    if (existing) {
      restaurantId = existing.id;
    } else {
      const { data: newRestaurant, error } = await supabase
        .from("restaurants")
        .insert({
          name: result.name,
          address: result.address,
          category: result.category,
          lat: result.lat,
          lng: result.lng,
          foursquare_id: result.foursquare_id,
        })
        .select("id")
        .single();

      if (error || !newRestaurant) {
        setAdding(null);
        return;
      }
      restaurantId = newRestaurant.id;
    }

    await supabase.from("group_restaurants").insert({
      group_id: groupId,
      restaurant_id: restaurantId,
      added_by: user.id,
    });

    setAddedIds((prev) => new Set([...prev, result.foursquare_id]));
    setAdding(null);
    router.refresh();
  }

  function formatDistance(meters: number | null): string {
    if (meters === null) return "";
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for restaurants..."
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {searching ? "..." : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => {
            const alreadyAdded =
              addedIds.has(r.foursquare_id) ||
              existingFoursquareIds.includes(r.foursquare_id);

            return (
              <li
                key={r.foursquare_id}
                className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{r.name}</div>
                  <div className="text-xs text-stone-500 truncate">
                    {r.category}
                    {r.distance != null && ` · ${formatDistance(r.distance)}`}
                  </div>
                  <div className="text-xs text-stone-400 truncate">
                    {r.address}
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(r)}
                  disabled={alreadyAdded || adding === r.foursquare_id}
                  className="ml-3 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 bg-amber-600 text-white hover:bg-amber-700 disabled:bg-stone-200 disabled:text-stone-500"
                >
                  {alreadyAdded
                    ? "Added"
                    : adding === r.foursquare_id
                    ? "..."
                    : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
