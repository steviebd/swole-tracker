import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionCookie } from "~/lib/session-cookie";
import { headers } from "next/headers";

import { TemplateForm } from "~/app/_components/template-form";
import { Button } from "~/components/ui/button";

export default async function NewTemplatePage() {
  const headersList = await headers();
  const mockRequest = {
    headers: {
      get: (name: string) => headersList.get(name),
    },
  } as Request;

  const session = await SessionCookie.get(mockRequest);

  if (!session || SessionCookie.isExpired(session)) {
    redirect("/auth/login");
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="container mx-auto w-full min-w-0 px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/templates">← Back</Link>
          </Button>
          <h1 className="text-2xl font-bold">New Template</h1>
        </div>

        {/* Form */}
        <TemplateForm />
      </div>
    </main>
  );
}
