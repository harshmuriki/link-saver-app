import {
  isBuiltinCategorySlug,
  isValidCategorySlug,
  slugifyCategory,
} from '@/lib/categories'
import { createClient } from '@/lib/supabase/server'
import { isUserCategoriesTableUnavailable } from '@/lib/user-categories-table'
import { NextRequest, NextResponse } from 'next/server'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { supabase, user }
}

// GET /api/user/categories — saved category slugs for the signed-in user
export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const { data, error } = await auth.supabase
    .from('user_categories')
    .select('slug, created_at')
    .eq('user_id', auth.user.id)
    .order('slug', { ascending: true })

  if (isUserCategoriesTableUnavailable(error)) {
    return NextResponse.json({ data: [], tableAvailable: false })
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [], tableAvailable: true })
}

// POST /api/user/categories — body: { name?: string, slug?: string }
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  let body: { name?: string; slug?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const raw =
    typeof body.slug === 'string' && body.slug.trim()
      ? body.slug
      : typeof body.name === 'string'
        ? body.name
        : ''
  const slug = slugifyCategory(raw)
  if (!slug || !isValidCategorySlug(slug)) {
    return NextResponse.json(
      {
        error:
          'Invalid category: use letters, numbers, and underscores (max 64 characters).',
      },
      { status: 400 }
    )
  }
  if (isBuiltinCategorySlug(slug)) {
    return NextResponse.json(
      { error: 'That category is built-in and already available on every link.' },
      { status: 400 }
    )
  }

  const { data, error } = await auth.supabase
    .from('user_categories')
    .insert({ user_id: auth.user.id, slug })
    .select('slug, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You already have a category with that name.' },
        { status: 409 }
      )
    }
    if (isUserCategoriesTableUnavailable(error)) {
      return NextResponse.json(
        {
          error:
            'Category catalog is not set up yet. Run the SQL in supabase/migrations/20260214120000_user_categories.sql in the Supabase SQL editor, then reload this page.',
          tableAvailable: false,
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

// DELETE /api/user/categories — body: { slug: string }
export async function DELETE(request: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  let body: { slug?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const slug =
    typeof body.slug === 'string' ? slugifyCategory(body.slug) : ''
  if (!slug || !isValidCategorySlug(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }
  if (isBuiltinCategorySlug(slug)) {
    return NextResponse.json(
      { error: 'Built-in categories cannot be deleted.' },
      { status: 400 }
    )
  }

  const { error: delErr } = await auth.supabase
    .from('user_categories')
    .delete()
    .eq('user_id', auth.user.id)
    .eq('slug', slug)

  if (delErr && !isUserCategoriesTableUnavailable(delErr)) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  const { error: linkErr } = await auth.supabase
    .from('links')
    .update({ category: null, updated_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)
    .eq('category', slug)

  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
