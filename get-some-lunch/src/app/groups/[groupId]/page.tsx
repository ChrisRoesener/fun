import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { InviteLink } from "@/components/groups/invite-link";
import { LeaveGroupButton } from "@/components/groups/leave-group-button";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function GroupPage({ params }: Props) {
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

  const { data: members } = await supabase
    .from("group_members")
    .select("role, user_id, profiles(display_name, email)")
    .eq("group_id", groupId);

  const currentMember = members?.find((m) => m.user_id === user.id);
  if (!currentMember) notFound();

  const { data: groupRestaurants } = await supabase
    .from("group_restaurants")
    .select("id, restaurants(id, name, address, category)")
    .eq("group_id", groupId);

  const { data: todaySession } = await supabase
    .from("sessions")
    .select("id, status, session_date")
    .eq("group_id", groupId)
    .eq("session_date", new Date().toISOString().split("T")[0])
    .neq("status", "completed")
    .maybeSingle();

  const restaurantCount = groupRestaurants?.length ?? 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-stone-400 hover:text-stone-600"
            >
              &larr;
            </Link>
            <h1 className="text-xl font-bold text-amber-700">
              {group.name}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Today's Lunch CTA */}
        <Link
          href={
            todaySession
              ? `/groups/${groupId}/session/${todaySession.id}`
              : `/groups/${groupId}/session`
          }
          className="flex flex-col items-center justify-center bg-amber-50 border-2 border-amber-200 rounded-xl p-8 hover:bg-amber-100 transition-colors"
        >
          <span className="text-xl font-semibold text-amber-800">
            {todaySession ? "Join today's session" : "Start lunch session"}
          </span>
          <span className="text-sm text-amber-600 mt-1">
            {todaySession
              ? `Status: ${todaySession.status}`
              : "Get suggestions for today"}
          </span>
        </Link>

        {/* Preferences + Restaurants row */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href={`/groups/${groupId}/restaurants`}
            className="flex flex-col items-center justify-center bg-white border border-stone-200 rounded-xl p-6 hover:border-amber-300 transition-colors"
          >
            <span className="text-lg font-semibold">Restaurants</span>
            <span className="text-sm text-stone-500 mt-1">
              {restaurantCount} place{restaurantCount !== 1 && "s"} on the list
            </span>
          </Link>

          <Link
            href={`/groups/${groupId}/preferences`}
            className="flex flex-col items-center justify-center bg-white border border-stone-200 rounded-xl p-6 hover:border-amber-300 transition-colors"
          >
            <span className="text-lg font-semibold">My preferences</span>
            <span className="text-sm text-stone-500 mt-1">
              Set how often you want each place
            </span>
          </Link>
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="font-semibold text-lg mb-4">
            Members ({members?.length ?? 0})
          </h3>
          <ul className="space-y-3">
            {members?.map((m) => {
              const profile = m.profiles as unknown as {
                display_name: string | null;
                email: string;
              };
              return (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium">
                      {profile.display_name ?? profile.email}
                    </span>
                    {m.user_id === user.id && (
                      <span className="ml-2 text-xs text-stone-400">(you)</span>
                    )}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                    {m.role}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Invite */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="font-semibold text-lg mb-2">Invite people</h3>
          <p className="text-sm text-stone-500 mb-4">
            Share this link with coworkers to let them join the group.
          </p>
          <InviteLink inviteCode={group.invite_code} />
        </div>

        {/* History link */}
        <Link
          href={`/groups/${groupId}/history`}
          className="block bg-white rounded-xl border border-stone-200 p-6 hover:border-amber-300 transition-colors"
        >
          <h3 className="font-semibold text-lg">Lunch history</h3>
          <p className="text-sm text-stone-500 mt-1">
            See where you&apos;ve been and how everyone rated it.
          </p>
        </Link>

        {/* Leave */}
        <div className="pt-4 border-t border-stone-200">
          <LeaveGroupButton groupId={groupId} isAdmin={currentMember.role === "admin"} />
        </div>
      </main>
    </div>
  );
}
