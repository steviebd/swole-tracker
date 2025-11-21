import { SessionCookie } from "~/lib/session-cookie";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Suspense, lazy } from "react";

const PlaybookCreationWizard = lazy(() =>
  import("~/app/_components/playbooks/PlaybookCreationWizard").then((module) => ({
    default: module.PlaybookCreationWizard,
  })),
);

const WizardLoading = () => (
  <div className="container mx-auto px-6 py-8 sm:px-8">
    <div className="animate-pulse space-y-8">
      <div className="bg-muted/50 h-8 w-64 rounded"></div>
      <div className="bg-muted/50 h-96 rounded-lg"></div>
    </div>
  </div>
);

export default async function NewPlaybookPage() {
  const headersList = await headers();
  const mockRequest = {
    headers: {
      get: (name: string) => headersList.get(name),
    },
  } as Request;

  const session = await SessionCookie.get(mockRequest);

  if (!session || SessionCookie.isExpired(session)) {
    redirect("/");
  }

  return (
    <Suspense fallback={<WizardLoading />}>
      <PlaybookCreationWizard />
    </Suspense>
  );
}
