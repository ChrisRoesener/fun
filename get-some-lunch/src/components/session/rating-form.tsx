"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function RatingForm({
  visitId,
  existingRating,
  existingNote,
}: {
  visitId: string;
  existingRating: number | null;
  existingNote: string | null;
}) {
  const [rating, setRating] = useState<number | null>(existingRating);
  const [note, setNote] = useState(existingNote ?? "");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    if (!rating) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("visit_ratings").upsert(
      {
        visit_id: visitId,
        user_id: user.id,
        rating,
        note: note.trim() || null,
      },
      { onConflict: "visit_id,user_id" }
    );

    setSaving(false);
    setShowForm(false);
    router.refresh();
  }

  if (existingRating && !showForm) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-sm ${
                star <= existingRating ? "text-amber-500" : "text-stone-200"
              }`}
            >
              ★
            </span>
          ))}
        </div>
        <span className="text-xs text-stone-400">Your rating</span>
        <button
          onClick={() => setShowForm(true)}
          className="text-xs text-amber-700 hover:underline ml-2"
        >
          Edit
        </button>
      </div>
    );
  }

  if (!showForm && !existingRating) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-sm text-amber-700 hover:underline"
      >
        Rate this visit
      </button>
    );
  }

  return (
    <div className="space-y-3 pt-2 border-t border-stone-100 mt-2">
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">
          Your rating
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`text-2xl transition-colors ${
                rating !== null && star <= rating
                  ? "text-amber-500"
                  : "text-stone-200 hover:text-amber-300"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">
          Note <span className="text-stone-400">(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How was it?"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!rating || saving}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save rating"}
        </button>
        <button
          onClick={() => {
            setShowForm(false);
            setRating(existingRating);
            setNote(existingNote ?? "");
          }}
          className="rounded-lg px-4 py-2 text-sm text-stone-500 hover:text-stone-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
