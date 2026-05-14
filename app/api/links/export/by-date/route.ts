import { authenticateApiRequest } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Link } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/links/export/by-date - Export links by date range (dedicated endpoint)
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  const { searchParams } = request.nextUrl
  
  // Required: from date
  const from = searchParams.get('from')
  if (!from) {
    return NextResponse.json(
      { error: 'from parameter is required (ISO date or datetime)' },
      { status: 400 }
    )
  }

  // Optional: to date (defaults to now)
  const to = searchParams.get('to') || new Date().toISOString()

  // Export format
  const format = searchParams.get('format') || 'json'
  if (!['json', 'csv', 'html'].includes(format)) {
    return NextResponse.json(
      { error: 'Invalid format. Use json, csv, or html.' },
      { status: 400 }
    )
  }

  // Parse dates - handle both date-only and datetime formats
  let fromDate: string
  let toDate: string
  
  try {
    // If just a date (YYYY-MM-DD), set to start of day
    fromDate = from.includes('T') ? from : `${from}T00:00:00.000Z`
    // If just a date for 'to', set to end of day
    toDate = to.includes('T') ? to : `${to}T23:59:59.999Z`
    
    // Validate dates
    new Date(fromDate).toISOString()
    new Date(toDate).toISOString()
  } catch {
    return NextResponse.json(
      { error: 'Invalid date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data: links, error } = await supabase
    .from('links')
    .select('*')
    .eq('user_id', auth.user.id)
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create filename with date range
  const fromStr = from.split('T')[0]
  const toStr = to.split('T')[0]
  const filename = fromStr === toStr 
    ? `links-${fromStr}` 
    : `links-${fromStr}-to-${toStr}`

  switch (format) {
    case 'csv':
      return exportCsv(links || [], filename)
    case 'html':
      return exportHtml(links || [], filename)
    default:
      return exportJson(links || [], filename)
  }
}

function exportJson(links: Link[], filename: string): NextResponse {
  const data = {
    exported_at: new Date().toISOString(),
    count: links.length,
    links: links.map(link => ({
      url: link.url,
      title: link.title,
      description: link.description,
      domain: link.domain,
      is_read: link.is_read,
      is_favorite: link.is_favorite,
      created_at: link.created_at,
    })),
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}.json"`,
    },
  })
}

function exportCsv(links: Link[], filename: string): NextResponse {
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
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  })
}

function exportHtml(links: Link[], filename: string): NextResponse {
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
      'Content-Disposition': `attachment; filename="${filename}.html"`,
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
