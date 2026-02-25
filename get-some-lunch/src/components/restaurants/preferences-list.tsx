"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Frequency } from "@/types/database";

const FREQUENCY_OPTIONS: { value: Frequency; label: string; description: string }[] = [
  { value: "daily", label: "Daily", description: "Could go almost every day" },
  { value: "weekly", label: "Weekly", description: "About once a week" },
  { value: "biweekly", label: "Biweekly", description: "Every couple weeks" },
  { value: "monthly", label: "Monthly", description: "About once a month" },
  { value: "rarely", label: "Rarely", description: "Only occasionally" },
  { value: "never", label: "Never", description: "Don't suggest this" },
];

const FREQUENCY_COLORS: Record<Frequency, string> = {
  daily: "bg-green-100 text-green-800 border-green-200",
  weekly: "bg-blue-100 text-blue-800 border-blue-200",
  biweekly: "bg-sky-100 text-sky-800 border-sky-200",
  monthly: "bg-amber-100 text-amber-800 border-amber-200",
  rarely: "bg-orange-100 text-orange-800 border-orange-200",
  never: "bg-red-100 text-red-800 border-red-200",
};

interface Item {
  groupRestaurantId: string;
  name: string;
  category: string | null;
  frequency: Frequency;
}

export function PreferencesList({ items }: { items: Item[] }) {
  const [preferences, setPreferences] = useState<Map<string, Frequency>>(
    () => new Map(items.map((i) => [i.groupRestaurantId, i.frequency]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const supabase = createClient();

  async function handleChange(groupRestaurantId: string, frequency: Frequency) {
    setPreferences((prev) => new Map(prev).set(groupRestaurantId, frequency));
    setSaving(groupRestaurantId);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("preferences").upsert(
      {
        user_id: user.id,
        group_restaurant_id: groupRestaurantId,
        frequency,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,group_restaurant_id" }
    );

    setSaving(null);
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const current = preferences.get(item.groupRestaurantId) ?? "weekly";

        return (
          <div
            key={item.groupRestaurantId}
            className="bg-white rounded-xl border border-stone-200 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{item.name}</div>
                {item.category && (
                  <div className="text-xs text-stone-500">{item.category}</div>
                )}
              </div>
              <div className="relative">
                <select
                  value={current}
                  onChange={(e) =>
                    handleChange(
                      item.groupRestaurantId,
                      e.target.value as Frequency
                    )
                  }
                  className={`appearance-none rounded-lg border px-3 py-1.5 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${FREQUENCY_COLORS[current]}`}
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {saving === item.groupRestaurantId && (
                  <span className="absolute -right-6 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                    ...
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className="mt-6 p-4 rounded-lg bg-stone-100 text-sm text-stone-600">
        <strong>How frequencies work:</strong>
        <ul className="mt-2 space-y-1 text-xs">
          {FREQUENCY_OPTIONS.map((opt) => (
            <li key={opt.value}>
              <span className="font-medium">{opt.label}</span> &mdash;{" "}
              {opt.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
