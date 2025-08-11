import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ProgressDashboard } from "../_components/ProgressDashboard";

export default async function ProgressPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  return <ProgressDashboard />;
}