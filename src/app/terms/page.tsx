import { promises as fs } from 'fs';
import path from 'path';
import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: "Terms of Service - Swole Tracker",
  description: "Terms of Service for Swole Tracker",
};

export default async function TermsPage() {
  const filePath = path.join(process.cwd(), 'TERMS_OF_SERVICE.md');
  const content = await fs.readFile(filePath, 'utf8');
  
  // Convert basic markdown to HTML
  const htmlContent = content
    .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mb-6">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold mt-8 mb-4">$1</h2>')
    .replace(/^\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
    .replace(/^(\d+\. .*$)/gm, '<h3 class="text-xl font-medium mt-6 mb-3">$1</h3>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/^(?!<[h])/gm, '<p class="mb-4">')
    .replace(/<\/p><p class="mb-4">(<[h])/g, '$1');

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div 
        className="prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
