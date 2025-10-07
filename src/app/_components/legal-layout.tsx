interface LegalLayoutProps {
  content: string;
  title: string;
}

export function LegalLayout({ content, title }: LegalLayoutProps) {
  // Convert basic markdown to HTML with improved shadcn/ui typography
  const htmlContent = content
    .replace(
      /^# (.*$)/gm,
      '<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-8">$1</h1>',
    )
    .replace(
      /^## (.*$)/gm,
      '<h2 class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mt-10 mb-6 first:mt-0">$1</h2>',
    )
    .replace(
      /^### (.*$)/gm,
      '<h3 class="scroll-m-20 text-2xl font-semibold tracking-tight mt-8 mb-4">$1</h3>',
    )
    .replace(
      /^(\d+\. .*$)/gm,
      '<h4 class="scroll-m-20 text-xl font-semibold tracking-tight mt-6 mb-3">$1</h4>',
    )
    .replace(/^\*\*(.*?)\*\*/gm, '<strong class="font-semibold">$1</strong>')
    .replace(/^- (.*$)/gm, '<li class="mt-2">$1</li>')
    .replace(/\n\n/g, '</p><p class="leading-7 [&:not(:first-child)]:mt-6">')
    .replace(
      /^(?!<[h|l])/gm,
      '<p class="leading-7 [&:not(:first-child)]:mt-6">',
    )
    .replace(
      /<\/p><p class="leading-7 \[&:not\(:first-child\)\]:mt-6">(<[h|l])/g,
      "$1",
    );

  return (
    <div className="relative container mx-auto max-w-4xl px-4 py-16">
      {/* Header */}
      <div className="mb-12">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-4 text-xl">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <div
          className="text-base leading-7"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      {/* Footer */}
      <div className="mt-16 border-t pt-8">
        <p className="text-muted-foreground text-sm">
          If you have any questions about this {title.toLowerCase()}, please
          contact us.
        </p>
      </div>
    </div>
  );
}
