/**
 * PostgREST often reports a missing table as a schema-cache message (not Postgres 42P01).
 */
export function isUserCategoriesTableUnavailable(error: {
  code?: string
  message?: string
} | null | undefined): boolean {
  if (!error) return false
  if (error.code === '42P01' || error.code === 'PGRST205') return true
  const msg = (error.message ?? '').toLowerCase()
  if (
    msg.includes('could not find the table') &&
    msg.includes('user_categories')
  )
    return true
  if (msg.includes('schema cache') && msg.includes('user_categories')) return true
  if (msg.includes('relation') && msg.includes('user_categories') && msg.includes('does not exist'))
    return true
  return false
}
