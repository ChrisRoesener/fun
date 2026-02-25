import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function StartSessionPage({ params }: Props) {
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

  const today = new Date().toISOString().split("T")[0];

  // Check for existing session today
  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("group_id", groupId)
    .eq("session_date", today)
    .neq("status", "completed")
    .maybeSingle();

  if (existing) {
    // Join existing session if not already a member
    await supabase.from("session_members").upsert(
      { session_id: existing.id, user_id: user.id },
      { onConflict: "session_id,user_id" }
    );
    redirect(`/groups/${groupId}/session/${existing.id}`);
  }

  // Create new session
  const { data: session } = await supabase
    .from("sessions")
    .insert({
      group_id: groupId,
      session_date: today,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (!session) {
    redirect(`/groups/${groupId}`);
  }

  // Add creator as first member
  await supabase.from("session_members").insert({
    session_id: session.id,
    user_id: user.id,
  });

  redirect(`/groups/${groupId}/session/${session.id}`);
}
