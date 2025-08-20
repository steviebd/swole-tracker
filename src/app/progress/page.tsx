import { getUserFromHeaders } from "~/lib/workos";
import { redirect } from "next/navigation";
import { ProgressDashboard } from "../_components/ProgressDashboard";

// Runtime configuration handled by OpenNext

export default async function ProgressPage() {
  const user = await getUserFromHeaders();

  if (!user) {
    redirect("/");
  }

  return <ProgressDashboard />;
}