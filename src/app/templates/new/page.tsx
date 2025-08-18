import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "~/lib/supabase-server";

import { TemplateForm } from "~/app/_components/template-form";
import { Button } from "~/components/ui/button";

export default async function NewTemplatePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

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
