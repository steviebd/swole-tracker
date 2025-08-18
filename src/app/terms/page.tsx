import { type Metadata } from "next";
import { LegalLayout } from "~/app/_components/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service - Swole Tracker",
  description: "Terms of Service for Swole Tracker",
};

export default async function TermsPage() {
  return <LegalLayout filename="TERMS_OF_SERVICE.md" title="Terms of Service" />;
}
