import { authenticateRequest } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// DELETE /api/categories/[id] - Delete a category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  // Don't allow deleting default categories
  if (id.startsWith('default_')) {
    return NextResponse.json({ error: 'Cannot delete default categories' }, { status: 400 })
  }

  const supabase = createAdminClient()
  
  // First get the category to find its slug
  const { data: category } = await supabase
    .from('categories')
    .select('slug')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .single()

  if (category) {
    // Clear category from any links that use it
    await supabase
      .from('links')
      .update({ category: null })
      .eq('user_id', auth.user.id)
      .eq('category', category.slug)
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/categories/[id] - Update a category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  // Don't allow updating default categories
  if (id.startsWith('default_')) {
    return NextResponse.json({ error: 'Cannot update default categories' }, { status: 400 })
  }

  let body: { name?: string; color?: string; icon?: string }
  
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const supabase = createAdminClient()
  
  const updates: Record<string, unknown> = {}
  if (body.name) {
    updates.name = body.name.trim()
    updates.slug = body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  }
  if (body.color) updates.color = body.color
  if (body.icon) updates.icon = body.icon

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ category: { ...data, is_default: false } })
}
