import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { WhoopConnection } from "~/app/_components/whoop-connection";

export default async function ConnectWhoopPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Connect Whoop</h1>
          <p className="text-gray-400">
            Connect your Whoop device to sync your workout data
          </p>
        </div>

        <WhoopConnection />
      </div>
    </main>
  );
}
