import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CreateGroupForm } from "@/components/groups/create-group-form";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("role, groups(id, name, office_address, invite_code)")
    .eq("user_id", user.id);

  const groups =
    memberships?.map((m) => ({
      ...(m.groups as unknown as { id: string; name: string; office_address: string | null; invite_code: string }),
      role: m.role,
    })) ?? [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-amber-700">Get Some Lunch</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-500">
              {profile?.display_name ?? user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Your groups</h2>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
            <p className="text-stone-500 mb-4">
              You&apos;re not in any groups yet.
            </p>
            <p className="text-sm text-stone-400 mb-6">
              Create a group for your office, or ask a coworker for an invite
              link.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 mb-8">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="block bg-white rounded-xl border border-stone-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{group.name}</h3>
                    {group.office_address && (
                      <p className="text-sm text-stone-500 mt-1">
                        {group.office_address}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                    {group.role}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="font-semibold text-lg mb-4">Create a new group</h3>
          <CreateGroupForm />
        </div>
      </main>
    </div>
  );
}
