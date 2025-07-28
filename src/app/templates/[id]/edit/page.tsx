import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { TemplateForm } from "~/app/_components/template-form";

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect("/");
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
          <h1 className="text-2xl font-bold">Edit Template</h1>
        </div>

        {/* Form */}
        <TemplateForm template={template} />
      </div>
    </main>
  );
}
