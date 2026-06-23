import { authenticateApiRequest } from '@/lib/api-auth'
import { mergeAndSortCategorySlugs } from '@/lib/categories'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUserCategoriesTableUnavailable } from '@/lib/user-categories-table'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/links/categories — distinct category slugs for the user
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('links')
    .select('category')
    .eq('user_id', auth.user.id)
    .not('category', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const fromRows = (data ?? [])
    .map((row: { category: string | null }) => row.category)
    .filter((c): c is string => typeof c === 'string' && c.length > 0)

  const { data: savedCats, error: ucError } = await supabase
    .from('user_categories')
    .select('slug')
    .eq('user_id', auth.user.id)

  let fromSaved: string[] = []
  if (!ucError && Array.isArray(savedCats)) {
    fromSaved = savedCats
      .map((r: { slug: string }) => r.slug)
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
  } else if (ucError && isUserCategoriesTableUnavailable(ucError)) {
    fromSaved = []
  } else if (ucError) {
    return NextResponse.json({ error: ucError.message }, { status: 500 })
  }

  const slugs = mergeAndSortCategorySlugs([
    ...new Set([...fromRows, ...fromSaved]),
  ])

  return NextResponse.json({ data: slugs })
}
