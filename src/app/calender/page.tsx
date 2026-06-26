import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";
import { ensureUserProfile } from "@/app/lib/user-profile";
import { getUserProfileByUserId } from "@/app/lib/user-stats";
import CalendarDashboard from "./calendar-client";

export default async function CalenderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const profile = (await getUserProfileByUserId(user.id)) ?? (await ensureUserProfile(user));

  return <CalendarDashboard profile={profile} />;
}
