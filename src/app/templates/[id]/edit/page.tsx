import Link from "next/link";

// Runtime configuration handled by OpenNext
export const dynamic = "force-dynamic";
import { redirect, notFound } from "next/navigation";
import { getUserFromHeaders } from "~/lib/workos";

import { api } from "~/trpc/server";
import { TemplateForm } from "~/app/_components/template-form";
import { Button } from "~/components/ui/button";


interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({
  params,
}: EditTemplatePageProps) {
  const user = await getUserFromHeaders();
  const { id } = await params;

  if (!user) {
    redirect("/sign-in");
  }

  const templateId = parseInt(id);
  if (isNaN(templateId)) {
    notFound();
  }

  let template;
  try {
    template = await api.templates.getById({ id: templateId });
  } catch {
    notFound();
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
          <h1 className="text-2xl font-bold">Edit Template</h1>
        </div>

        {/* Form */}
        <TemplateForm template={template} />
      </div>
    </main>
  );
}
