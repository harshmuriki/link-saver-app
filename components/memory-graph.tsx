'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { categoryLabel } from '@/lib/categories'
import { GraphEdge, GraphNode, GraphNodeType, LinkEnrichment } from '@/lib/types'
import { ExternalLink, Globe, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, {
  ForceGraphMethods,
  NodeObject,
} from 'react-force-graph-2d'

// Node objects handed to the force graph. The engine mutates these in place
// (adds x/y/vx/vy and swaps link source/target for node refs), so we always
// build fresh shallow copies from the snapshot rather than the props.
interface GraphNodeObject {
  id: string
  type: GraphNodeType
  label: string
  category?: string
  url?: string
  linksaver_id?: string
  ingested_on?: string
  degree: number
  x?: number
  y?: number
}

interface GraphLinkObject {
  source: string | GraphNodeObject
  target: string | GraphNodeObject
  rel: string
}

// Data shown in the details panel for the currently selected node. Derived
// lazily from just that one node (plus the shared adjacency map) so it stays
// cheap regardless of graph size.
interface SourcePanelData {
  kind: 'source'
  node: GraphNode
  enrichment?: LinkEnrichment
}

interface HubPanelData {
  kind: 'hub'
  node: GraphNode
  /** Connected sources currently visible under the active type/category filters. */
  sources: GraphNode[]
  /** Connected sources that exist but are hidden by the active filters. */
  hiddenByFilterCount: number
}

type PanelData = SourcePanelData | HubPanelData

const HUB_SOURCE_LIMIT = 30

function domainFromUrl(url?: string): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

function formatIngestedDate(dateString?: string): string | undefined {
  if (!dateString) return undefined
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ChipGroup({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <Badge key={`${label}-${index}`} variant="outline" className="font-normal">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function SourcePanelBody({ data }: { data: SourcePanelData }) {
  const { node, enrichment } = data
  const ingestedDate = formatIngestedDate(node.ingested_on ?? enrichment?.ingested_on)

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {node.category && (
          <Badge variant="outline" className="font-normal">
            {categoryLabel(node.category)}
          </Badge>
        )}
        {ingestedDate && (
          <span className="text-xs text-muted-foreground">{ingestedDate}</span>
        )}
      </div>
      {enrichment?.summary ? (
        <p className="text-muted-foreground">{enrichment.summary}</p>
      ) : (
        <p className="text-xs text-muted-foreground/60 italic">
          Not yet processed
        </p>
      )}
      {enrichment && (
        <div className="space-y-2">
          <ChipGroup label="Topics" items={enrichment.topics} />
          <ChipGroup label="Concepts" items={enrichment.concepts} />
          <ChipGroup label="Entities" items={enrichment.entities} />
        </div>
      )}
      {node.url && (
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={() => window.open(node.url, '_blank', 'noopener')}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open link
        </Button>
      )}
    </>
  )
}

function HubPanelBody({
  data,
  onSelectSource,
}: {
  data: HubPanelData
  onSelectSource: (id: string) => void
}) {
  if (data.sources.length === 0) {
    return (
      <p className="text-xs text-muted-foreground/60 italic">
        {data.hiddenByFilterCount > 0
          ? `All ${data.hiddenByFilterCount} connected source${data.hiddenByFilterCount === 1 ? '' : 's'} are hidden by the active filters.`
          : 'No linked sources.'}
      </p>
    )
  }

  const visible = data.sources.slice(0, HUB_SOURCE_LIMIT)
  const extra = data.sources.length - visible.length

  return (
    <div className="space-y-0.5">
      {visible.map(source => (
        <div
          key={source.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelectSource(source.id)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelectSource(source.id)
            }
          }}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 text-xs hover:bg-accent cursor-pointer"
        >
          <span className="flex-1 min-w-0 truncate">{source.label}</span>
          {source.url && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                window.open(source.url, '_blank', 'noopener')
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={`Open ${source.label}`}
            >
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {extra > 0 && (
        <p className="text-xs text-muted-foreground/60 pt-1">+{extra} more</p>
      )}
      {data.hiddenByFilterCount > 0 && (
        <p className="text-xs text-muted-foreground/60 pt-1">
          +{data.hiddenByFilterCount} hidden by filters
        </p>
      )}
    </div>
  )
}

function NodeDetailsPanel({
  data,
  onClose,
  onSelectSource,
}: {
  data: PanelData
  onClose: () => void
  onSelectSource: (id: string) => void
}) {
  const domain = data.kind === 'source' ? domainFromUrl(data.node.url) : undefined

  return (
    <Card className="absolute top-3 right-3 z-10 w-80 max-h-[calc(100%-1.5rem)] overflow-y-auto py-4 gap-3 shadow-lg">
      <CardHeader className="px-4 gap-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug break-words">
            {data.node.label}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="-mt-1 -mr-1 shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {data.kind === 'source' ? (
          domain && (
            <CardDescription className="flex items-center gap-1 text-xs">
              <Globe className="h-3 w-3" />
              {domain}
            </CardDescription>
          )
        ) : (
          <CardDescription className="text-xs capitalize">
            {data.node.type} ·{' '}
            {data.sources.length + data.hiddenByFilterCount} linked source
            {data.sources.length + data.hiddenByFilterCount === 1 ? '' : 's'}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="px-4 space-y-3 text-sm">
        {data.kind === 'source' ? (
          <SourcePanelBody data={data} />
        ) : (
          <HubPanelBody data={data} onSelectSource={onSelectSource} />
        )}
      </CardContent>
    </Card>
  )
}

const NODE_TYPES: GraphNodeType[] = ['source', 'topic', 'concept', 'entity']

const TYPE_LABELS: Record<GraphNodeType, string> = {
  source: 'Sources',
  topic: 'Topics',
  concept: 'Concepts',
  entity: 'Entities',
}

// Maps each node type to a CSS chart color variable (see app/globals.css),
// with a hardcoded fallback for the canvas in case the var can't be resolved.
const TYPE_COLOR_VARS: Record<GraphNodeType, { varName: string; fallback: string }> = {
  source: { varName: '--chart-2', fallback: '#60a5fa' },
  topic: { varName: '--chart-1', fallback: '#34d399' },
  concept: { varName: '--chart-3', fallback: '#e0b341' },
  entity: { varName: '--chart-4', fallback: '#e879c7' },
}

function resolveCssVar(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim()
  return value || fallback
}

/** id of a link endpoint, whether it's still an id or a mutated node ref. */
function endpointId(end: string | GraphNodeObject): string {
  return typeof end === 'object' ? end.id : end
}

function nodeVal(n: GraphNodeObject): number {
  if (n.type === 'source') return 1
  return 2 + (n.degree || 1) * 0.6
}

export function MemoryGraph({
  nodes,
  edges,
  enrichment,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  enrichment?: Record<string, LinkEnrichment>
}) {
  const fgRef = useRef<
    ForceGraphMethods<NodeObject<GraphNodeObject>, GraphLinkObject> | undefined
  >(undefined)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [size, setSize] = useState({ width: 0, height: 0 })
  const [visibleTypes, setVisibleTypes] = useState<Record<GraphNodeType, boolean>>({
    source: true,
    topic: true,
    concept: true,
    entity: true,
  })
  const [category, setCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Resolve theme colors from CSS variables once on mount (canvas can't read
  // CSS vars directly). Fallback hex keeps the graph legible regardless.
  const [colors, setColors] = useState({
    source: TYPE_COLOR_VARS.source.fallback,
    topic: TYPE_COLOR_VARS.topic.fallback,
    concept: TYPE_COLOR_VARS.concept.fallback,
    entity: TYPE_COLOR_VARS.entity.fallback,
    text: '#e5e7eb',
    link: 'rgba(148, 163, 184, 0.25)',
    linkHighlight: 'rgba(226, 232, 240, 0.9)',
    dimNode: 'rgba(148, 163, 184, 0.15)',
    dimLink: 'rgba(148, 163, 184, 0.06)',
  })

  useEffect(() => {
    setColors(prev => ({
      ...prev,
      source: resolveCssVar(TYPE_COLOR_VARS.source.varName, prev.source),
      topic: resolveCssVar(TYPE_COLOR_VARS.topic.varName, prev.topic),
      concept: resolveCssVar(TYPE_COLOR_VARS.concept.varName, prev.concept),
      entity: resolveCssVar(TYPE_COLOR_VARS.entity.varName, prev.entity),
      text: resolveCssVar('--foreground', prev.text),
    }))
  }, [])

  // Measure the container so the canvas fills the available viewport area.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Adjacency for click-to-highlight, built from the raw edges.
  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const e of edges) {
      if (!map.has(e.source)) map.set(e.source, new Set())
      if (!map.has(e.target)) map.set(e.target, new Set())
      map.get(e.source)!.add(e.target)
      map.get(e.target)!.add(e.source)
    }
    return map
  }, [edges])

  // id -> full snapshot node, for details-panel lookups (built once per
  // snapshot, not per click).
  const nodeById = useMemo(() => {
    const map = new Map<string, GraphNode>()
    for (const n of nodes) map.set(n.id, n)
    return map
  }, [nodes])

  // Categories present on source nodes, for the category filter.
  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    for (const n of nodes) {
      if (n.type === 'source' && n.category) set.add(n.category)
    }
    return [...set].sort()
  }, [nodes])

  // Filtered graph data (type visibility + source category). Rebuilt only when
  // filters or the snapshot change so the simulation isn't restarted on hover.
  const graphData = useMemo(() => {
    const keepNode = (n: GraphNode): boolean => {
      if (!visibleTypes[n.type]) return false
      if (n.type === 'source' && category !== 'all' && n.category !== category)
        return false
      return true
    }
    const kept = nodes.filter(keepNode)
    const keptIds = new Set(kept.map(n => n.id))
    const graphNodes: GraphNodeObject[] = kept.map(n => ({
      id: n.id,
      type: n.type,
      label: n.label,
      category: n.category,
      url: n.url,
      linksaver_id: n.linksaver_id,
      ingested_on: n.ingested_on,
      degree: n.degree ?? 0,
    }))
    const graphLinks: GraphLinkObject[] = edges
      .filter(e => keptIds.has(e.source) && keptIds.has(e.target))
      .map(e => ({ source: e.source, target: e.target, rel: e.rel }))
    return { nodes: graphNodes, links: graphLinks }
  }, [nodes, edges, visibleTypes, category])

  // ids currently rendered under the active type/category filters — used to
  // keep the hub panel's connected-source list (and re-select/re-center
  // targets) in sync with what's actually clickable in the graph.
  const visibleNodeIds = useMemo(
    () => new Set(graphData.nodes.map(n => n.id)),
    [graphData]
  )

  // Selection dropped if the selected node is filtered out.
  useEffect(() => {
    if (selectedId && !graphData.nodes.some(n => n.id === selectedId)) {
      setSelectedId(null)
    }
  }, [graphData, selectedId])

  const highlightIds = useMemo(() => {
    if (!selectedId) return null
    const set = new Set<string>([selectedId])
    for (const id of neighbors.get(selectedId) ?? []) set.add(id)
    return set
  }, [selectedId, neighbors])

  // Details-panel content for the selected node only — derived lazily so
  // nothing is precomputed for the rest of the graph.
  const selectedPanelData = useMemo((): PanelData | null => {
    if (!selectedId) return null
    const raw = nodeById.get(selectedId)
    if (!raw) return null

    if (raw.type === 'source') {
      return {
        kind: 'source',
        node: raw,
        enrichment: raw.linksaver_id ? enrichment?.[raw.linksaver_id] : undefined,
      }
    }

    const connectedSources = [...(neighbors.get(selectedId) ?? [])]
      .map(id => nodeById.get(id))
      .filter((n): n is GraphNode => !!n && n.type === 'source')

    const sources = connectedSources
      .filter(n => visibleNodeIds.has(n.id))
      .sort((a, b) => a.label.localeCompare(b.label))
    const hiddenByFilterCount = connectedSources.length - sources.length

    return { kind: 'hub', node: raw, sources, hiddenByFilterCount }
  }, [selectedId, nodeById, neighbors, enrichment, visibleNodeIds])

  const toggleType = (type: GraphNodeType) =>
    setVisibleTypes(prev => ({ ...prev, [type]: !prev[type] }))

  // Any node click toggles that node's selection: opens/updates the details
  // panel and highlights its neighbors. Clicking the same node again clears
  // both (same toggle hubs already had).
  const handleNodeClick = useCallback((node: NodeObject<GraphNodeObject>) => {
    const n = node as GraphNodeObject
    setSelectedId(prev => (prev === n.id ? null : n.id))
  }, [])

  // Used by the hub panel's "connected source" rows: selects that source and
  // re-centers the view on it, same mechanic as the search box.
  const selectSource = useCallback(
    (id: string) => {
      setSelectedId(id)
      const match = graphData.nodes.find(n => n.id === id)
      if (match && fgRef.current && match.x != null && match.y != null) {
        fgRef.current.centerAt(match.x, match.y, 800)
        fgRef.current.zoom(4, 800)
      }
    },
    [graphData]
  )

  const handleSearch = useCallback(() => {
    const q = search.trim().toLowerCase()
    if (!q) return
    const match = graphData.nodes.find(n => n.label.toLowerCase().includes(q))
    if (match && fgRef.current && match.x != null && match.y != null) {
      fgRef.current.centerAt(match.x, match.y, 800)
      fgRef.current.zoom(4, 800)
      setSelectedId(match.type === 'source' ? null : match.id)
    }
  }, [search, graphData])

  const nodeColor = useCallback(
    (node: NodeObject<GraphNodeObject>): string => {
      const n = node as GraphNodeObject
      const base = colors[n.type]
      if (!highlightIds) return base
      return highlightIds.has(n.id) ? base : colors.dimNode
    },
    [colors, highlightIds]
  )

  const linkColor = useCallback(
    (link: GraphLinkObject): string => {
      if (!selectedId) return colors.link
      const s = endpointId(link.source)
      const t = endpointId(link.target)
      return s === selectedId || t === selectedId
        ? colors.linkHighlight
        : colors.dimLink
    },
    [selectedId, colors]
  )

  const linkWidth = useCallback(
    (link: GraphLinkObject): number => {
      if (!selectedId) return 1
      const s = endpointId(link.source)
      const t = endpointId(link.target)
      return s === selectedId || t === selectedId ? 2 : 0.5
    },
    [selectedId]
  )

  // Draw text labels for hub nodes (non-source) when zoomed in enough, plus
  // always for highlighted nodes. Painted after the default node circle.
  const nodeCanvasObject = useCallback(
    (
      node: NodeObject<GraphNodeObject>,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => {
      const n = node as GraphNodeObject
      if (n.type === 'source') return
      const highlighted = highlightIds?.has(n.id) ?? false
      if (globalScale < 1.2 && !highlighted) return
      if (highlightIds && !highlighted) return
      if (n.x == null || n.y == null) return

      const fontSize = 12 / globalScale
      ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = colors.text
      const radius = 4 * Math.sqrt(nodeVal(n))
      ctx.fillText(n.label, n.x, n.y + radius / globalScale + 1)
    },
    [colors, highlightIds]
  )

  const isEmpty = graphData.nodes.length === 0

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Filters + legend */}
      <div className="flex flex-wrap items-center gap-2">
        {NODE_TYPES.map(type => {
          const active = visibleTypes[type]
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-border bg-card text-foreground'
                  : 'border-border/50 bg-transparent text-muted-foreground/60 line-through'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colors[type], opacity: active ? 1 : 0.4 }}
              />
              {TYPE_LABELS[type]}
            </button>
          )
        })}

        {categoryOptions.length > 0 && (
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map(slug => (
                <SelectItem key={slug} value={slug}>
                  {categoryLabel(slug)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSearch()
            }}
            placeholder="Find a node…"
            className="h-8 w-[180px]"
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            Find
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-0 overflow-hidden rounded-lg border border-border bg-card/30"
      >
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No nodes match the current filters.
          </div>
        )}
        {size.width > 0 && size.height > 0 && (
          <ForceGraph2D<GraphNodeObject, GraphLinkObject>
            ref={fgRef}
            graphData={graphData}
            width={size.width}
            height={size.height}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={4}
            nodeVal={nodeVal}
            nodeLabel={(node: NodeObject<GraphNodeObject>) =>
              (node as GraphNodeObject).label
            }
            nodeColor={nodeColor}
            nodeCanvasObjectMode={() => 'after'}
            nodeCanvasObject={nodeCanvasObject}
            linkColor={linkColor}
            linkWidth={linkWidth}
            onNodeClick={handleNodeClick}
            onBackgroundClick={() => setSelectedId(null)}
            cooldownTicks={100}
          />
        )}
        {selectedPanelData && (
          <NodeDetailsPanel
            data={selectedPanelData}
            onClose={() => setSelectedId(null)}
            onSelectSource={selectSource}
          />
        )}
      </div>
    </div>
  )
}
