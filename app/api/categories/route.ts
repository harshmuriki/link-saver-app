import { authenticateRequest } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/categories - List all categories for the user
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Add default categories if user has none
  const defaultCategories = [
    { id: 'default_info', name: 'Info', slug: 'general_info', color: '#3b82f6', icon: 'info', is_default: true },
    { id: 'default_try', name: 'Try it', slug: 'try_implementing', color: '#f59e0b', icon: 'lightbulb', is_default: true },
  ]

  return NextResponse.json({
    categories: [...defaultCategories, ...data.map(c => ({ ...c, is_default: false }))]
  })
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { name: string; color?: string; icon?: string }
  
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.name || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
  }

  const name = body.name.trim()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  
  // Don't allow creating categories with reserved slugs
  if (['general_info', 'try_implementing'].includes(slug)) {
    return NextResponse.json({ error: 'This category name is reserved' }, { status: 400 })
  }

  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: auth.user.id,
      name,
      slug,
      color: body.color || '#6b7280',
      icon: body.icon || 'tag',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ category: { ...data, is_default: false } }, { status: 201 })
}
