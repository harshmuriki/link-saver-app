/** Built-in category slugs (stable API / Shortcuts). */
export const BUILTIN_CATEGORY_SLUGS = ['general_info', 'try_implementing'] as const

export type BuiltinCategorySlug = (typeof BUILTIN_CATEGORY_SLUGS)[number]

const BUILTIN_LABELS: Record<BuiltinCategorySlug, string> = {
  general_info: 'Info',
  try_implementing: 'Try it',
}

export function isBuiltinCategorySlug(
  slug: string
): slug is BuiltinCategorySlug {
  return (BUILTIN_CATEGORY_SLUGS as readonly string[]).includes(slug)
}

export function categoryLabel(slug: string): string {
  if (isBuiltinCategorySlug(slug)) return BUILTIN_LABELS[slug]
  return slug
    .split('_')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function slugifyCategory(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 64)
}

const CATEGORY_SLUG_PATTERN = /^[a-z0-9_]{1,64}$/

export function isValidCategorySlug(slug: string): boolean {
  return CATEGORY_SLUG_PATTERN.test(slug)
}

export function mergeAndSortCategorySlugs(fromDb: string[]): string[] {
  const merged = new Set<string>([...BUILTIN_CATEGORY_SLUGS, ...fromDb])
  const custom = [...merged].filter(s => !isBuiltinCategorySlug(s)).sort()
  return [...BUILTIN_CATEGORY_SLUGS.filter(s => merged.has(s)), ...custom]
}
