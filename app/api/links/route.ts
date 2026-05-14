import { authenticateApiRequest } from '@/lib/api-auth'
import { fetchUrlMetadata } from '@/lib/fetch-metadata'
import { createAdminClient } from '@/lib/supabase/admin'
import { Link, PaginatedResponse } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/links - List links with filtering and pagination
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  const { searchParams } = request.nextUrl
  
  // Pagination
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  // Filtering
  const isRead = searchParams.get('is_read')
  const isFavorite = searchParams.get('is_favorite')
  const domain = searchParams.get('domain')
  const search = searchParams.get('search')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // Sorting
  const sortBy = searchParams.get('sort_by') || 'created_at'
  const sortOrder = searchParams.get('sort_order') || 'desc'
  const validSortFields = ['created_at', 'updated_at', 'title', 'domain']
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
  const ascending = sortOrder.toLowerCase() === 'asc'

  const supabase = createAdminClient()

  // Build query
  let query = supabase
    .from('links')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.user.id)

  // Apply filters
  if (isRead !== null && isRead !== undefined) {
    query = query.eq('is_read', isRead === 'true')
  }
  if (isFavorite !== null && isFavorite !== undefined) {
    query = query.eq('is_favorite', isFavorite === 'true')
  }
  if (domain) {
    query = query.eq('domain', domain)
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,url.ilike.%${search}%,description.ilike.%${search}%`)
  }
  if (from) {
    query = query.gte('created_at', from)
  }
  if (to) {
    query = query.lte('created_at', to)
  }

  // Apply sorting and pagination
  query = query
    .order(sortField, { ascending })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  const response: PaginatedResponse<Link> = {
    data: data || [],
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  }

  return NextResponse.json(response)
}

// POST /api/links - Create a new link
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  let body: { url: string; title?: string; is_favorite?: boolean }
  
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { url, title: manualTitle, is_favorite = false } = body

  if (!url) {
    return NextResponse.json(
      { error: 'URL is required' },
      { status: 400 }
    )
  }

  // Validate URL
  try {
    new URL(url)
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL format' },
      { status: 400 }
    )
  }

  // Fetch metadata
  const metadata = await fetchUrlMetadata(url)

  const supabase = createAdminClient()

  // Upsert - update if exists, insert if not
  const { data, error } = await supabase
    .from('links')
    .upsert(
      {
        user_id: auth.user.id,
        url,
        title: manualTitle || metadata.title,
        description: metadata.description,
        image_url: metadata.image_url,
        domain: metadata.domain,
        is_favorite,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,url',
      }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

// DELETE /api/links - Bulk delete links
export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  let body: { ids: string[] }
  
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { ids } = body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: 'Array of link IDs is required' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { error, count } = await supabase
    .from('links')
    .delete()
    .eq('user_id', auth.user.id)
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: count || 0 })
}
