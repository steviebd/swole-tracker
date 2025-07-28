import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { TemplateForm } from "~/app/_components/template-form";

export default async function NewTemplatePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/templates"
            className="text-purple-400 hover:text-purple-300"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold">New Template</h1>
        </div>

        {/* Form */}
        <TemplateForm />
      </div>
    </main>
  );
}
