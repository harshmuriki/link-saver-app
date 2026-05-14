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
