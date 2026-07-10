'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { GraphSnapshot } from '@/lib/types'
import { Inbox, Network } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'

// The force-graph library touches `window` on import, so it must never be
// evaluated during SSR.
const MemoryGraph = dynamic(
  () => import('@/components/memory-graph').then(mod => mod.MemoryGraph),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  }
)

export default function MapPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    fetchApiKey()
  }, [fetchApiKey])

  useEffect(() => {
    if (!apiKey) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/graph-snapshot?api_key=${apiKey}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('bad status'))))
      .then((json: { data: GraphSnapshot | null }) => {
        if (cancelled) return
        setSnapshot(json.data)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load your memory map.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [apiKey])

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Map</h1>
        <p className="text-muted-foreground">
          Your knowledge graph — sources, topics, concepts, and entities
        </p>
      </div>

      <div className="min-h-0 flex-1">
        {loading ? (
          <Skeleton className="h-full w-full rounded-lg" />
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              Something went wrong
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
          </div>
        ) : !snapshot ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <Network className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              No memory map yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              No memory map yet — it builds after tonight&apos;s sync.
            </p>
          </div>
        ) : (
          <MemoryGraph
            nodes={snapshot.nodes}
            edges={snapshot.edges}
            enrichment={snapshot.enrichment}
          />
        )}
      </div>
    </div>
  )
}
