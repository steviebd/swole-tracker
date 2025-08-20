import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserFromHeaders } from "~/lib/workos";

import { TemplateForm } from "~/app/_components/template-form";
import { Button } from "~/components/ui/button";

// Runtime configuration handled by OpenNext

export default async function NewTemplatePage() {
  const user = await getUserFromHeaders();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="container mx-auto px-4 py-6 w-full min-w-0">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/templates">
              ← Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">New Template</h1>
        </div>

        {/* Form */}
        <TemplateForm />
      </div>
    </main>
  );
}
