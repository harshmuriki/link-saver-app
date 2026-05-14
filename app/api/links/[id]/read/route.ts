import { authenticateApiRequest } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/links/:id/read - Mark as read
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('links')
    .update({ is_read: true })
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

// DELETE /api/links/:id/read - Mark as unread
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('links')
    .update({ is_read: false })
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
