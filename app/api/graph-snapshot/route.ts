import { authenticateApiRequest } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { GraphSnapshot } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

// ~5 MB cap on uploaded snapshots.
const MAX_BODY_BYTES = 5 * 1024 * 1024

// POST /api/graph-snapshot - Upload a nightly graph snapshot (called by the local exporter)
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  // Reject oversized payloads early via Content-Length when available.
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Snapshot too large (max 5 MB).' },
      { status: 413 }
    )
  }

  const raw = await request.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Snapshot too large (max 5 MB).' },
      { status: 413 }
    )
  }

  let body: GraphSnapshot
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Minimal shape validation.
  if (
    !body ||
    body.version !== 1 ||
    !Array.isArray(body.nodes) ||
    !Array.isArray(body.edges) ||
    typeof body.enrichment !== 'object' ||
    body.enrichment === null ||
    Array.isArray(body.enrichment)
  ) {
    return NextResponse.json(
      { error: 'Invalid snapshot: expected version 1 with nodes/edges arrays and enrichment object.' },
      { status: 400 }
    )
  }

  // Use body.generated_at if it is a valid ISO timestamp, else now.
  let generatedAt = new Date().toISOString()
  if (typeof body.generated_at === 'string') {
    const parsed = new Date(body.generated_at)
    if (!isNaN(parsed.getTime())) {
      generatedAt = parsed.toISOString()
    }
  }

  const supabase = createAdminClient()

  const { error } = await supabase.from('graph_snapshots').upsert(
    {
      user_id: auth.user.id,
      data: body,
      generated_at: generatedAt,
    },
    {
      onConflict: 'user_id',
    }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    nodes: body.nodes.length,
    edges: body.edges.length,
  })
}

// GET /api/graph-snapshot - Fetch the current user's snapshot (called by dashboard pages)
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  const meta = request.nextUrl.searchParams.get('meta')

  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('graph_snapshots')
    .select('data, generated_at')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!row) {
    return NextResponse.json({ data: null })
  }

  const snapshot = row.data as GraphSnapshot

  if (meta === '1') {
    return NextResponse.json({
      generated_at: row.generated_at,
      stats: snapshot?.stats ?? null,
    })
  }

  return NextResponse.json({
    data: row.data,
    generated_at: row.generated_at,
  })
}
