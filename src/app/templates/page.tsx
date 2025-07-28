import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { api, HydrateClient } from "~/trpc/server";
import { TemplatesList } from "~/app/_components/templates-list";

export default async function TemplatesPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Prefetch templates
  void api.templates.getAll.prefetch();

  return (
    <HydrateClient>
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="text-purple-400 hover:text-purple-300"
              >
                ← Back
              </Link>
              <h1 className="text-2xl font-bold">Workout Templates</h1>
            </div>
            <Link
              href="/templates/new"
              className="bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
            >
              + New Template
            </Link>
          </div>

          {/* Templates List */}
          <TemplatesList />
        </div>
      </main>
    </HydrateClient>
  );
}
