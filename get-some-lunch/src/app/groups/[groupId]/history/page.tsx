import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { RatingForm } from "@/components/session/rating-form";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function HistoryPage({ params }: Props) {
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

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .single();

  const { data: visits } = await supabase
    .from("visits")
    .select(
      "id, visit_date, restaurant_id, restaurants(name, category), visit_ratings(user_id, rating, note)"
    )
    .eq("group_id", groupId)
    .order("visit_date", { ascending: false })
    .limit(50);

  const history =
    visits?.map((v) => {
      const r = v.restaurants as unknown as { name: string; category: string | null };
      const ratings = (v.visit_ratings as unknown as { user_id: string; rating: number; note: string | null }[]) ?? [];
      const myRating = ratings.find((rt) => rt.user_id === user.id);
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum, rt) => sum + rt.rating, 0) / ratings.length
          : null;

      return {
        visitId: v.id,
        date: v.visit_date,
        restaurantName: r.name,
        category: r.category,
        avgRating,
        ratingCount: ratings.length,
        myRating: myRating?.rating ?? null,
        myNote: myRating?.note ?? null,
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
          <div>
            <h1 className="text-xl font-bold">Lunch History</h1>
            <p className="text-xs text-stone-500">{group?.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {history.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
            <p className="text-stone-500">
              No lunch history yet. Start a session to get going!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((visit) => (
              <div
                key={visit.visitId}
                className="bg-white rounded-xl border border-stone-200 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {visit.restaurantName}
                    </h3>
                    <div className="text-sm text-stone-500">
                      {visit.category && `${visit.category} · `}
                      {new Date(visit.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </div>
                  </div>
                  {visit.avgRating !== null && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-amber-600">
                        {visit.avgRating.toFixed(1)}
                      </div>
                      <div className="text-xs text-stone-400">
                        {visit.ratingCount} rating
                        {visit.ratingCount !== 1 && "s"}
                      </div>
                    </div>
                  )}
                </div>

                <RatingForm
                  visitId={visit.visitId}
                  existingRating={visit.myRating}
                  existingNote={visit.myNote}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
