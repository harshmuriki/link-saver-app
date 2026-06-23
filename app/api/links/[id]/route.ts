import { authenticateApiRequest } from '@/lib/api-auth'
import { isValidCategorySlug, slugifyCategory } from '@/lib/categories'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/links/:id - Get a single link
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('links')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// PATCH /api/links/:id - Update a link
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  const { id } = await params

  let body: {
    title?: string
    is_read?: boolean
    is_favorite?: boolean
    category?: string | null
  }
  
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}

  if (body.title !== undefined) updates.title = body.title
  if (body.is_read !== undefined) updates.is_read = body.is_read
  if (body.is_favorite !== undefined) updates.is_favorite = body.is_favorite
  if (body.category !== undefined) {
    if (body.category === null) {
      updates.category = null
    } else if (typeof body.category === 'string') {
      const slug = slugifyCategory(body.category)
      if (!slug || !isValidCategorySlug(slug)) {
        return NextResponse.json(
          {
            error:
              'Invalid category: use letters, numbers, and underscores (max 64 characters).',
          },
          { status: 400 }
        )
      }
      updates.category = slug
    } else {
      return NextResponse.json(
        { error: 'category must be a string, null, or omitted' },
        { status: 400 }
      )
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('links')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// DELETE /api/links/:id - Delete a single link
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('links')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
