/** Cross-links are disabled for the Chinese baseline to keep the learning path focused. */

interface RelatedLink {
  label: string;
  href: string;
}

const linkMap: Record<string, RelatedLink[]> = {};

export function getRelatedLinks(lessonSlug: string): RelatedLink[] {
  return linkMap[lessonSlug] ?? [];
}
