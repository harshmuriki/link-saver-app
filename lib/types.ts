/** Stored as a lowercase slug (e.g. general_info, research). Null means uncategorized. */
export type LinkCategory = string | null

export interface Link {
  id: string
  user_id: string
  url: string
  title: string | null
  description: string | null
  image_url: string | null
  domain: string | null
  is_read: boolean
  is_favorite: boolean
  category: LinkCategory
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  api_key: string
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

export interface LinkStats {
  total_links: number
  unread_links: number
  favorite_links: number
  links_today: number
  links_this_week: number
  top_domains: { domain: string; count: number }[]
}

export type GraphNodeType = 'source' | 'topic' | 'concept' | 'entity'

export interface GraphNode {
  id: string
  type: GraphNodeType
  label: string
  category?: string
  linksaver_id?: string
  canonical_url?: string
  url?: string
  ingested_on?: string
  degree?: number
}

export interface GraphEdge {
  source: string
  target: string
  rel: 'topic' | 'concept' | 'entity'
}

export interface LinkEnrichment {
  summary: string
  topics: string[]
  entities: string[]
  concepts: string[]
  category?: string
  ingested_on?: string
}

export interface GraphSnapshot {
  version: 1
  generated_at: string
  stats?: Record<string, number>
  nodes: GraphNode[]
  edges: GraphEdge[]
  enrichment: Record<string, LinkEnrichment>
}
