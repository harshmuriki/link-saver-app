'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { categoryLabel } from '@/lib/categories'
import {
  GraphSnapshot,
  Link as LinkType,
  LinkEnrichment,
  PaginatedResponse,
} from '@/lib/types'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { CalendarDays, ExternalLink, Globe, Inbox } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 100

interface DayGroup {
  key: string
  date: Date
  links: LinkType[]
}

function dayKey(dateString: string): string {
  return format(parseISO(dateString), 'yyyy-MM-dd')
}

function dayHeader(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d, yyyy')
}

function groupByDay(links: LinkType[]): DayGroup[] {
  const groups: DayGroup[] = []
  let current: DayGroup | null = null
  for (const link of links) {
    const key = dayKey(link.created_at)
    if (!current || current.key !== key) {
      current = { key, date: parseISO(link.created_at), links: [] }
      groups.push(current)
    }
    current.links.push(link)
  }
  return groups
}

export default function DailyPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [links, setLinks] = useState<LinkType[]>([])
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null)
  const [snapshotLoaded, setSnapshotLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchApiKey = useCallback(async () => {
    try {
      const res = await fetch('/api/user/api-key')
      if (res.ok) {
        const data = await res.json()
        setApiKey(data.api_key)
      } else {
        setError('Failed to load your account.')
        setLoading(false)
      }
    } catch {
      setError('Failed to load your account.')
      setLoading(false)
    }
  }, [])

  // Fetch a window of links ending at (and including) `cursor`, or the newest
  // page when cursor is null. Returns the fetched links or null on failure.
  const fetchLinkWindow = useCallback(
    async (key: string, cursor: string | null): Promise<LinkType[] | null> => {
      const params = new URLSearchParams({
        api_key: key,
        limit: String(PAGE_SIZE),
        sort_by: 'created_at',
        sort_order: 'desc',
      })
      if (cursor) params.set('to', cursor)
      try {
        const res = await fetch(`/api/links?${params}`)
        if (!res.ok) return null
        const data: PaginatedResponse<LinkType> = await res.json()
        return data.data
      } catch {
        return null
      }
    },
    []
  )

  useEffect(() => {
    fetchApiKey()
  }, [fetchApiKey])

  // Initial load: newest page of links + snapshot, in parallel.
  useEffect(() => {
    if (!apiKey) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      fetchLinkWindow(apiKey, null),
      fetch(`/api/graph-snapshot?api_key=${apiKey}`)
        .then(res => (res.ok ? res.json() : null))
        .catch(() => null),
    ]).then(([firstPage, snapRes]) => {
      if (cancelled) return
      if (firstPage === null) {
        setError('Failed to load your links.')
      } else {
        setLinks(firstPage)
        setHasMore(firstPage.length === PAGE_SIZE)
      }
      const snap = (snapRes as { data: GraphSnapshot | null } | null)?.data ?? null
      setSnapshot(snap)
      setSnapshotLoaded(true)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [apiKey, fetchLinkWindow])

  const handleLoadOlder = useCallback(async () => {
    if (!apiKey || links.length === 0 || loadingMore) return
    setLoadingMore(true)
    // Use the oldest loaded link's exact timestamp as the inclusive `to`
    // cursor. DB timestamps have sub-millisecond precision, so computing an
    // "earlier" cursor could skip links sharing the boundary instant; instead
    // the boundary rows are re-returned and discarded by the id-dedupe below.
    const oldest = links[links.length - 1]

    const older = await fetchLinkWindow(apiKey, oldest.created_at)
    if (older === null) {
      setError('Failed to load older links.')
      setLoadingMore(false)
      return
    }
    const seen = new Set(links.map(l => l.id))
    const fresh = older.filter(l => !seen.has(l.id))
    if (fresh.length > 0) {
      setLinks(prev => [...prev, ...fresh])
    }
    // A full page normally means more remain — but if every returned row was
    // already loaded (>PAGE_SIZE links sharing one exact timestamp), the
    // cursor cannot advance, so stop to avoid an infinite loop.
    setHasMore(older.length === PAGE_SIZE && fresh.length > 0)
    setLoadingMore(false)
  }, [apiKey, links, loadingMore, fetchLinkWindow])

  // Fallback map: source node canonical_url -> its enrichment, for links whose
  // id has no direct enrichment entry.
  const urlEnrichment = useMemo(() => {
    const map = new Map<string, LinkEnrichment>()
    if (!snapshot) return map
    for (const node of snapshot.nodes) {
      if (node.type !== 'source' || !node.canonical_url) continue
      const enr =
        (node.linksaver_id && snapshot.enrichment[node.linksaver_id]) ||
        snapshot.enrichment[node.id]
      if (enr) map.set(node.canonical_url, enr)
    }
    return map
  }, [snapshot])

  const getEnrichment = useCallback(
    (link: LinkType): LinkEnrichment | undefined => {
      if (!snapshot) return undefined
      return snapshot.enrichment[link.id] ?? urlEnrichment.get(link.url)
    },
    [snapshot, urlEnrichment]
  )

  const groups = useMemo(() => groupByDay(links), [links])
  const showNoSnapshotBanner = snapshotLoaded && snapshot === null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Daily</h1>
        <p className="text-muted-foreground">Your saved links, day by day</p>
      </div>

      {showNoSnapshotBanner && !loading && (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Summaries appear after tonight&apos;s sync.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error && links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            Something went wrong
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            No links yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Save links using the API or Apple Shortcuts and they&apos;ll show up
            here grouped by day.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-8">
            {groups.map(group => (
              <section key={group.key}>
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    {dayHeader(group.date)}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {group.links.length}{' '}
                    {group.links.length === 1 ? 'link' : 'links'}
                  </span>
                </div>
                <div className="space-y-3">
                  {group.links.map(link => (
                    <DailyLinkRow
                      key={link.id}
                      link={link}
                      enrichment={getEnrichment(link)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {error && links.length > 0 && (
            <p className="text-center text-sm text-destructive mt-6">{error}</p>
          )}

          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadOlder}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load older'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DailyLinkRow({
  link,
  enrichment,
}: {
  link: LinkType
  enrichment?: LinkEnrichment
}) {
  const summary = enrichment?.summary?.trim()
  const topics = enrichment?.topics ?? []

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 flex items-center gap-1"
          >
            {link.title || link.url}
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
          </a>

          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            {link.domain && (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {link.domain}
              </span>
            )}
            {link.category && (
              <Badge variant="secondary" className="font-normal">
                {categoryLabel(link.category)}
              </Badge>
            )}
          </div>

          {summary ? (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
              {summary}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic mt-2">
              Not yet processed
            </p>
          )}

          {topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {topics.map(topic => (
                <Badge key={topic} variant="outline" className="font-normal">
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
