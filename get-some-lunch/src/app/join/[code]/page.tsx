import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { JoinGroupButton } from "@/components/groups/join-group-button";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, office_address")
    .eq("invite_code", code)
    .single();

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Invalid invite link</h2>
          <p className="text-stone-500 mb-4">
            This invite link is invalid or has expired.
          </p>
          <Link href="/" className="text-amber-700 font-medium hover:underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect(`/signup?next=/join/${code}`);
  }

  const { data: existing } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect(`/groups/${group.id}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-xl font-bold text-amber-700 mb-6">
          Get Some Lunch
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-8">
          <h2 className="text-2xl font-bold mb-2">Join group</h2>
          <p className="text-lg font-semibold text-amber-700 mb-1">
            {group.name}
          </p>
          {group.office_address && (
            <p className="text-sm text-stone-500 mb-6">
              {group.office_address}
            </p>
          )}
          <JoinGroupButton groupId={group.id} />
        </div>
      </div>
    </div>
  );
}
