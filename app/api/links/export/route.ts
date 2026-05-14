import { authenticateApiRequest } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Link } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/links/export - Export links with filters
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  const { searchParams } = request.nextUrl
  
  // Export format
  const format = searchParams.get('format') || 'json'
  if (!['json', 'csv', 'html'].includes(format)) {
    return NextResponse.json(
      { error: 'Invalid format. Use json, csv, or html.' },
      { status: 400 }
    )
  }

  // Filters
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const isRead = searchParams.get('is_read')
  const isFavorite = searchParams.get('is_favorite')
  const domain = searchParams.get('domain')

  const supabase = createAdminClient()

  let query = supabase
    .from('links')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  // Apply filters
  if (from) {
    query = query.gte('created_at', from)
  }
  if (to) {
    query = query.lte('created_at', to)
  }
  if (isRead !== null && isRead !== undefined) {
    query = query.eq('is_read', isRead === 'true')
  }
  if (isFavorite !== null && isFavorite !== undefined) {
    query = query.eq('is_favorite', isFavorite === 'true')
  }
  if (domain) {
    query = query.eq('domain', domain)
  }

  const { data: links, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const timestamp = new Date().toISOString().split('T')[0]

  switch (format) {
    case 'csv':
      return exportCsv(links || [], timestamp)
    case 'html':
      return exportHtml(links || [], timestamp)
    default:
      return exportJson(links || [], timestamp)
  }
}

function exportJson(links: Link[], timestamp: string): NextResponse {
  const data = links.map(link => ({
    url: link.url,
    title: link.title,
    description: link.description,
    domain: link.domain,
    is_read: link.is_read,
    is_favorite: link.is_favorite,
    created_at: link.created_at,
  }))

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="links-${timestamp}.json"`,
    },
  })
}

function exportCsv(links: Link[], timestamp: string): NextResponse {
  const headers = ['URL', 'Title', 'Description', 'Domain', 'Read', 'Favorite', 'Created At']
  const rows = links.map(link => [
    escapeCsvField(link.url),
    escapeCsvField(link.title || ''),
    escapeCsvField(link.description || ''),
    escapeCsvField(link.domain || ''),
    link.is_read ? 'Yes' : 'No',
    link.is_favorite ? 'Yes' : 'No',
    link.created_at,
  ])

  const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="links-${timestamp}.csv"`,
    },
  })
}

function exportHtml(links: Link[], timestamp: string): NextResponse {
  const bookmarks = links
    .map(
      link =>
        `    <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${Math.floor(new Date(link.created_at).getTime() / 1000)}">${escapeHtml(link.title || link.url)}</A>`
    )
    .join('\n')

  const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>LinkSaver Export</TITLE>
<H1>LinkSaver Bookmarks</H1>
<DL><p>
${bookmarks}
</DL><p>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="links-${timestamp}.html"`,
    },
  })
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
