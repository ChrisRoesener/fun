"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LeaveGroupButton({
  groupId,
  isAdmin,
}: {
  groupId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLeave() {
    if (isAdmin) {
      if (
        !confirm(
          "You're an admin. If you leave, the group will need a new admin. Continue?"
        )
      )
        return;
    } else {
      if (!confirm("Leave this group?")) return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button
      onClick={handleLeave}
      className="text-sm text-red-600 hover:text-red-800"
    >
      Leave group
    </button>
  );
}
