import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { SessionCookie } from "~/lib/session-cookie";
import { headers } from "next/headers";

import { api } from "~/trpc/server";
import { TemplateForm } from "~/app/_components/template-form";
import { Button } from "~/components/ui/button";

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({
  params,
}: EditTemplatePageProps) {
  const headersList = await headers();
  const mockRequest = {
    headers: {
      get: (name: string) => headersList.get(name),
    },
  } as Request;

  const session = await SessionCookie.get(mockRequest);
  const { id } = await params;

  if (!session || SessionCookie.isExpired(session)) {
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

  const sanitizedTemplate = template
    ? {
        id: template.id,
        name: typeof template.name === "string" ? template.name : "",
        exercises: Array.isArray(template.exercises)
          ? template.exercises.map((exercise) => ({
              exerciseName: exercise.exerciseName,
            }))
          : [],
      }
    : undefined;

  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="container mx-auto w-full min-w-0 px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/templates">← Back</Link>
          </Button>
          <h1 className="text-2xl font-bold">Edit Template</h1>
        </div>

        {/* Form */}
        <TemplateForm
          {...(sanitizedTemplate && { template: sanitizedTemplate })}
        />
      </div>
    </main>
  );
}
