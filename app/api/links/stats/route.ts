import { authenticateApiRequest } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { LinkStats } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/links/stats - Get link statistics
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) return auth.error

  const supabase = createAdminClient()

  // Get all links for the user
  const { data: links, error } = await supabase
    .from('links')
    .select('id, is_read, is_favorite, domain, created_at')
    .eq('user_id', auth.user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Calculate stats
  const totalLinks = links?.length || 0
  const unreadLinks = links?.filter(l => !l.is_read).length || 0
  const favoriteLinks = links?.filter(l => l.is_favorite).length || 0
  const linksToday = links?.filter(l => l.created_at >= todayStart).length || 0
  const linksThisWeek = links?.filter(l => l.created_at >= weekStart).length || 0

  // Calculate top domains
  const domainCounts: Record<string, number> = {}
  links?.forEach(link => {
    if (link.domain) {
      domainCounts[link.domain] = (domainCounts[link.domain] || 0) + 1
    }
  })

  const topDomains = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const stats: LinkStats = {
    total_links: totalLinks,
    unread_links: unreadLinks,
    favorite_links: favoriteLinks,
    links_today: linksToday,
    links_this_week: linksThisWeek,
    top_domains: topDomains,
  }

  return NextResponse.json({ data: stats })
}
