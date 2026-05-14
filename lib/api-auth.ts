import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export interface AuthenticatedUser {
  id: string
  email: string
  api_key: string
}

export async function authenticateApiRequest(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | { error: NextResponse }> {
  // Get API key from header or query param
  const apiKey =
    request.headers.get('x-api-key') ||
    request.nextUrl.searchParams.get('api_key')

  if (!apiKey) {
    return {
      error: NextResponse.json(
        { error: 'Missing API key. Provide via x-api-key header or api_key query param.' },
        { status: 401 }
      ),
    }
  }

  const supabase = createAdminClient()

  // Look up user by API key
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, api_key')
    .eq('api_key', apiKey)
    .single()

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: 'Invalid API key.' },
        { status: 401 }
      ),
    }
  }

  return { user: user as AuthenticatedUser }
}
