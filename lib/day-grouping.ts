import { format, isToday, isYesterday, parseISO } from 'date-fns'

export interface DayGroup<T> {
  key: string
  date: Date
  items: T[]
}

function dayKey(dateString: string): string {
  return format(parseISO(dateString), 'yyyy-MM-dd')
}

/** "Today" / "Yesterday" / "MMM d, yyyy" label for a group's date. */
export function dayHeader(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d, yyyy')
}

/**
 * Groups items that are already sorted newest-first (or oldest-first) by
 * calendar day, using each item's `created_at` timestamp. Consecutive items
 * sharing a day are merged into one group, preserving input order.
 */
export function groupByDay<T extends { created_at: string }>(
  items: T[]
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = []
  let current: DayGroup<T> | null = null
  for (const item of items) {
    const key = dayKey(item.created_at)
    if (!current || current.key !== key) {
      current = { key, date: parseISO(item.created_at), items: [] }
      groups.push(current)
    }
    current.items.push(item)
  }
  return groups
}
