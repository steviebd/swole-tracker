import { Breadcrumb } from "~/components/navigation/breadcrumb";

interface LegalLayoutProps {
  content: string;
  title: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function LegalLayout({ content, title }: LegalLayoutProps) {
  // Extract last updated date from content
  const lastUpdatedRegex = /\*\*Last updated: (.+?)\*\*/;
  const lastUpdatedMatch = lastUpdatedRegex.exec(content);
  const lastUpdatedDate = lastUpdatedMatch
    ? lastUpdatedMatch[1]
    : new Date().toLocaleDateString();

  // Generate table of contents
  const tocItems: Array<{ level: number; text: string; id: string }> = [];
  const lines = content.split("\n");

  lines.forEach((line) => {
    const h2Regex = /^## (.*$)/;
    const h3Regex = /^### (.*$)/;
    const h2Match = h2Regex.exec(line);
    const h3Match = h3Regex.exec(line);

    if (h2Match) {
      tocItems.push({ level: 2, text: h2Match[1]!, id: slugify(h2Match[1]!) });
    } else if (h3Match) {
      tocItems.push({ level: 3, text: h3Match[1]!, id: slugify(h3Match[1]!) });
    }
  });

  // Convert basic markdown to HTML with improved shadcn/ui typography
  let htmlContent = content
    // Handle ordered lists (must be done before headers to avoid conflicts)
    .replace(/^(\d+)\. (.*$)/gm, '<li class="mt-2">$1. $2</li>')
    // Wrap consecutive list items in ol tags
    .replace(
      /(<li class="mt-2">.*?<\/li>\n?)+/gs,
      '<ol class="list-decimal list-inside space-y-2 mt-4 mb-6">$&</ol>',
    )
    // Handle unordered lists
    .replace(/^- (.*$)/gm, '<li class="mt-2">$1</li>')
    // Wrap consecutive unordered list items in ul tags
    .replace(
      /(<li class="mt-2">.*?<\/li>\n?)+/gs,
      '<ul class="list-disc list-inside space-y-2 mt-4 mb-6">$&</ul>',
    )
    // Headers (must be after lists to avoid conflicts)
    .replace(
      /^# (.*$)/gm,
      '<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-8">$1</h1>',
    )
    .replace(
      /^## (.*$)/gm,
      (match, headerText) =>
        `<h2 class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mt-10 mb-6 first:mt-0" id="${slugify(headerText)}">${headerText}</h2>`,
    )
    .replace(
      /^### (.*$)/gm,
      (match, headerText) =>
        `<h3 class="scroll-m-20 text-2xl font-semibold tracking-tight mt-8 mb-4" id="${slugify(headerText)}">${headerText}</h3>`,
    )
    // Bold text
    .replace(/\*\*(.*?)\*\*/gm, '<strong class="font-semibold">$1</strong>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="leading-7 [&:not(:first-child)]:mt-6">')
    .replace(
      /^(?!<[h|u|o])/gm,
      '<p class="leading-7 [&:not(:first-child)]:mt-6">',
    )
    .replace(
      /<\/p><p class="leading-7 \[&:not\(:first-child\)\]:mt-6">(<[h|u|o])/g,
      "$1",
    );

  // Clean up any remaining list items that weren't wrapped
  htmlContent = htmlContent.replace(
    /<li class="mt-2">(.*?)<\/li>/g,
    '<ul class="list-disc list-inside space-y-2 mt-4 mb-6"><li class="mt-2">$1</li></ul>',
  );

  return (
    <div className="relative container mx-auto max-w-4xl px-4 py-16">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: title, current: true },
          ]}
        />
      </div>

      {/* Header */}
      <div className="mb-12">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-4 text-xl">
          Last updated: {lastUpdatedDate}
        </p>
      </div>

      {/* Table of Contents */}
      {tocItems.length > 0 && (
        <div className="bg-muted/50 mb-12 rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Table of Contents</h2>
          <nav>
            <ul className="space-y-2">
              {tocItems.map((item) => (
                <li key={item.id} className={item.level === 3 ? "ml-4" : ""}>
                  <a
                    href={`#${item.id}`}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {item.level === 3 && "• "}
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

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
