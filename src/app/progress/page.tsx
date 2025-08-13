import { createServerSupabaseClient } from "~/lib/supabase-server";
import { redirect } from "next/navigation";
import { ProgressDashboard } from "../_components/ProgressDashboard";

export default async function ProgressPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <ProgressDashboard />;
}