'use client'

import { LinkCard } from '@/components/link-card'
import { LinkFilters } from '@/components/link-filters'
import { StatsCards } from '@/components/stats-cards'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { Link, LinkCategory, LinkStats, PaginatedResponse } from '@/lib/types'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

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
    if (filter === 'general_info') params.set('category', 'general_info')
    if (filter === 'try_implementing') params.set('category', 'try_implementing')

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

  useEffect(() => {
    fetchApiKey()
  }, [fetchApiKey])

  useEffect(() => {
    if (apiKey) {
      fetchLinks()
      fetchStats()
    }
  }, [apiKey, fetchLinks, fetchStats])

  const handleToggleRead = async (id: string, isRead: boolean) => {
    if (!apiKey) return
    const endpoint = isRead ? 'read' : 'read'
    const method = isRead ? 'POST' : 'DELETE'
    
    try {
      await fetch(`/api/links/${id}/read?api_key=${apiKey}`, { method })
      setLinks(links.map(link => 
        link.id === id ? { ...link, is_read: isRead } : link
      ))
      fetchStats()
    } catch {
      // Handle error
    }
  }

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    if (!apiKey) return
    const method = isFavorite ? 'POST' : 'DELETE'
    
    try {
      await fetch(`/api/links/${id}/favorite?api_key=${apiKey}`, { method })
      setLinks(links.map(link => 
        link.id === id ? { ...link, is_favorite: isFavorite } : link
      ))
      fetchStats()
    } catch {
      // Handle error
    }
  }

  const handleSetCategory = async (id: string, category: LinkCategory) => {
    if (!apiKey) return
    
    try {
      await fetch(`/api/links/${id}?api_key=${apiKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      })
      setLinks(links.map(link => 
        link.id === id ? { ...link, category } : link
      ))
    } catch {
      // Handle error
    }
  }

  const handleDelete = async (id: string) => {
    if (!apiKey) return
    
    try {
      await fetch(`/api/links/${id}?api_key=${apiKey}`, { method: 'DELETE' })
      setLinks(links.filter(link => link.id !== id))
      fetchStats()
    } catch {
      // Handle error
    }
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
        sortBy={sortBy}
        onSortChange={setSortBy}
        onExport={handleExport}
      />

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
          <div className="space-y-3">
            {links.map(link => (
              <LinkCard
                key={link.id}
                link={link}
                onToggleRead={handleToggleRead}
                onToggleFavorite={handleToggleFavorite}
                onSetCategory={handleSetCategory}
                onDelete={handleDelete}
              />
            ))}
          </div>

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
