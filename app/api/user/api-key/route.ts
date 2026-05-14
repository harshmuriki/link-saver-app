import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/user/api-key - Get current user's API key
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { data, error } = await supabase
    .from('users')
    .select('api_key')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ api_key: data.api_key })
}

// POST /api/user/api-key - Regenerate API key
export async function POST() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Generate new API key
  const newApiKey = generateApiKey()

  const { data, error } = await supabase
    .from('users')
    .update({ api_key: newApiKey })
    .eq('id', user.id)
    .select('api_key')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ api_key: data.api_key })
}

function generateApiKey(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}
