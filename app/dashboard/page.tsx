'use client'

import { LinkCard } from '@/components/link-card'
import { LinkFilters } from '@/components/link-filters'
import { StatsCards } from '@/components/stats-cards'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { mergeAndSortCategorySlugs } from '@/lib/categories'
import { dayHeader, groupByDay } from '@/lib/day-grouping'
import {
  GraphSnapshot,
  Link,
  LinkCategory,
  LinkEnrichment,
  LinkStats,
  PaginatedResponse,
} from '@/lib/types'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function DashboardPage() {
  const [links, setLinks] = useState<Link[]>([])
  const [stats, setStats] = useState<LinkStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at:desc')
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [categoryOptions, setCategoryOptions] = useState<string[]>(() =>
    mergeAndSortCategorySlugs([])
  )
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null)
  const [snapshotLoaded, setSnapshotLoaded] = useState(false)

  const fetchApiKey = useCallback(async () => {
    try {
      const res = await fetch('/api/user/api-key')
      if (res.ok) {
        const data = await res.json()
        setApiKey(data.api_key)
      }
    } catch {
      // Handle error silently
    }
  }, [])

  const fetchStats = useCallback(async () => {
    if (!apiKey) return
    try {
      const res = await fetch(`/api/links/stats?api_key=${apiKey}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data.data)
      }
    } catch {
      // Handle error silently
    }
  }, [apiKey])

  const fetchCategories = useCallback(async () => {
    if (!apiKey) return
    try {
      const res = await fetch(`/api/links/categories?api_key=${apiKey}`)
      if (res.ok) {
        const json = await res.json()
        const slugs: string[] = Array.isArray(json.data) ? json.data : []
        setCategoryOptions(slugs.length ? slugs : mergeAndSortCategorySlugs([]))
      }
    } catch {
      // Handle error silently
    }
  }, [apiKey])

  const fetchLinks = useCallback(async () => {
    if (!apiKey) return
    setLoading(true)

    const [sortField, sortOrder] = sortBy.split(':')
    const params = new URLSearchParams({
      api_key: apiKey,
      page: page.toString(),
      limit: '20',
      sort_by: sortField,
      sort_order: sortOrder,
    })

    if (search) params.set('search', search)
    if (filter === 'unread') params.set('is_read', 'false')
    if (filter === 'read') params.set('is_read', 'true')
    if (filter === 'favorites') params.set('is_favorite', 'true')
    if (
      filter !== 'all' &&
      filter !== 'unread' &&
      filter !== 'read' &&
      filter !== 'favorites'
    ) {
      params.set('category', filter)
    }

    try {
      const res = await fetch(`/api/links?${params}`)
      if (res.ok) {
        const data: PaginatedResponse<Link> = await res.json()
        setLinks(data.data)
        setTotalPages(data.pagination.total_pages)
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [apiKey, page, search, filter, sortBy])

  const fetchSnapshot = useCallback(async () => {
    if (!apiKey) return
    try {
      const res = await fetch(`/api/graph-snapshot?api_key=${apiKey}`)
      const json = res.ok ? await res.json() : null
      setSnapshot((json as { data: GraphSnapshot | null } | null)?.data ?? null)
    } catch {
      setSnapshot(null)
    } finally {
      setSnapshotLoaded(true)
    }
  }, [apiKey])

  useEffect(() => {
    fetchApiKey()
  }, [fetchApiKey])

  useEffect(() => {
    if (apiKey) {
      fetchLinks()
      fetchStats()
      fetchCategories()
      fetchSnapshot()
    }
  }, [apiKey, fetchLinks, fetchStats, fetchCategories, fetchSnapshot])

  // Fallback map: source node canonical_url -> its enrichment, for links
  // whose id has no direct enrichment entry.
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
    (link: Link): LinkEnrichment | undefined => {
      if (!snapshot) return undefined
      return snapshot.enrichment[link.id] ?? urlEnrichment.get(link.url)
    },
    [snapshot, urlEnrichment]
  )

  const showNoSnapshotBanner = snapshotLoaded && snapshot === null && links.length > 0
  const isDayGrouped = sortBy === 'created_at:desc'
  const dayGroups = useMemo(
    () => (isDayGrouped ? groupByDay(links) : []),
    [isDayGrouped, links]
  )

  const handleToggleRead = (id: string, isRead: boolean) => {
    if (!apiKey) return
    
    // If marking as read while filtering for unread, remove from list
    // If marking as unread while filtering for read, remove from list
    const shouldRemove = (filter === 'unread' && isRead) || (filter === 'read' && !isRead)
    
    // Store link for potential rollback
    const originalLink = links.find(l => l.id === id)
    const originalIndex = links.findIndex(l => l.id === id)
    
    // Optimistic update - instant UI feedback
    if (shouldRemove) {
      setLinks(prev => prev.filter(link => link.id !== id))
    } else {
      setLinks(prev => prev.map(link => 
        link.id === id ? { ...link, is_read: isRead } : link
      ))
    }
    
    // Background API call
    const method = isRead ? 'POST' : 'DELETE'
    fetch(`/api/links/${id}/read?api_key=${apiKey}`, { method })
      .then(() => fetchStats())
      .catch(() => {
        // Revert on error
        if (shouldRemove && originalLink) {
          setLinks(prev => {
            const newLinks = [...prev]
            newLinks.splice(originalIndex, 0, originalLink)
            return newLinks
          })
        } else {
          setLinks(prev => prev.map(link => 
            link.id === id ? { ...link, is_read: !isRead } : link
          ))
        }
      })
  }

  const handleSetCategory = (id: string, category: LinkCategory) => {
    if (!apiKey) return

    const prevCategory = links.find(l => l.id === id)?.category
    const originalLink = links.find(l => l.id === id)
    const originalIndex = links.findIndex(l => l.id === id)
    const isCategoryFilter =
      filter !== 'all' &&
      filter !== 'unread' &&
      filter !== 'read' &&
      filter !== 'favorites'
    const shouldRemove = isCategoryFilter && category !== filter

    if (shouldRemove) {
      setLinks(prev => prev.filter(link => link.id !== id))
    } else {
      setLinks(prev =>
        prev.map(link => (link.id === id ? { ...link, category } : link))
      )
    }

    fetch(`/api/links/${id}?api_key=${apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    })
      .then(() => fetchCategories())
      .catch(() => {
        if (shouldRemove && originalLink) {
          setLinks(prev => {
            const next = [...prev]
            next.splice(originalIndex, 0, originalLink)
            return next
          })
        } else {
          setLinks(prev =>
            prev.map(link =>
              link.id === id ? { ...link, category: prevCategory } : link
            )
          )
        }
      })
  }

  const handleDelete = (id: string) => {
    if (!apiKey) return
    
    // Store link for potential rollback
    const deletedLink = links.find(l => l.id === id)
    const deletedIndex = links.findIndex(l => l.id === id)
    
    // Optimistic update - instant UI feedback
    setLinks(prev => prev.filter(link => link.id !== id))
    
    // Background API call
    fetch(`/api/links/${id}?api_key=${apiKey}`, { method: 'DELETE' })
      .then(() => fetchStats())
      .catch(() => {
        // Revert on error - restore deleted link at original position
        if (deletedLink) {
          setLinks(prev => {
            const newLinks = [...prev]
            newLinks.splice(deletedIndex, 0, deletedLink)
            return newLinks
          })
        }
      })
  }

  const handleExport = async (format: 'json' | 'csv' | 'html') => {
    if (!apiKey) return
    
    const params = new URLSearchParams({ api_key: apiKey, format })
    if (filter === 'unread') params.set('is_read', 'false')
    if (filter === 'read') params.set('is_read', 'true')
    if (filter === 'favorites') params.set('is_favorite', 'true')
    
    window.open(`/api/links/export?${params}`, '_blank')
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, filter, sortBy])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Your Links</h1>
        <p className="text-muted-foreground">Manage and organize your saved links</p>
      </div>

      <StatsCards stats={stats} />

      <LinkFilters
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        categorySlugs={categoryOptions}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onExport={handleExport}
      />

      {showNoSnapshotBanner && !loading && (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Summaries appear after tonight&apos;s sync.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No links yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Save links using the API or Apple Shortcuts. Check the API Key page for setup instructions.
          </p>
        </div>
      ) : (
        <>
          {isDayGrouped ? (
            <div className="space-y-8">
              {dayGroups.map(group => (
                <section key={group.key}>
                  <div className="flex items-baseline gap-2 mb-3">
                    <h2 className="text-lg font-semibold text-foreground">
                      {dayHeader(group.date)}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      {group.items.length}{' '}
                      {group.items.length === 1 ? 'link' : 'links'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {group.items.map(link => (
                      <LinkCard
                        key={link.id}
                        link={link}
                        categoryOptions={categoryOptions}
                        onToggleRead={handleToggleRead}
                        onSetCategory={handleSetCategory}
                        onDelete={handleDelete}
                        enrichment={getEnrichment(link)}
                        hasSnapshot={snapshot !== null}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {links.map(link => (
                <LinkCard
                  key={link.id}
                  link={link}
                  categoryOptions={categoryOptions}
                  onToggleRead={handleToggleRead}
                  onSetCategory={handleSetCategory}
                  onDelete={handleDelete}
                  enrichment={getEnrichment(link)}
                  hasSnapshot={snapshot !== null}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
