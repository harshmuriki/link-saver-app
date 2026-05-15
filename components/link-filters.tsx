'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Category } from '@/lib/types'
import { Download, Search, X } from 'lucide-react'

interface LinkFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  filter: string
  onFilterChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
  onExport: (format: 'json' | 'csv' | 'html') => void
  categories: Category[]
}

export function LinkFilters({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  onExport,
  categories,
}: LinkFiltersProps) {
  // Get custom categories (non-default ones)
  const customCategories = categories.filter(c => !c.is_default)
  
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search links..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="favorites">Favorites</SelectItem>
            <SelectSeparator />
            <SelectItem value="general_info">Info Links</SelectItem>
            <SelectItem value="try_implementing">Try It Links</SelectItem>
            {customCategories.length > 0 && <SelectSeparator />}
            {customCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.slug}>
                <span style={{ color: cat.color }}>{cat.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:desc">Newest first</SelectItem>
            <SelectItem value="created_at:asc">Oldest first</SelectItem>
            <SelectItem value="title:asc">Title A-Z</SelectItem>
            <SelectItem value="title:desc">Title Z-A</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => onExport(v as 'json' | 'csv' | 'html')}>
          <SelectTrigger className="w-32">
            <Download className="h-4 w-4 mr-2" />
            <span>Export</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="html">HTML Bookmarks</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
