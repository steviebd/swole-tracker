import { type Metadata } from "next";
import { LegalLayout } from "~/app/_components/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy - Swole Tracker",
  description: "Privacy Policy for Swole Tracker",
};

export default async function PrivacyPage() {
  return <LegalLayout filename="PRIVACY_POLICY.md" title="Privacy Policy" />;
}
