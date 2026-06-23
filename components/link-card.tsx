'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  categoryLabel,
  isBuiltinCategorySlug,
} from '@/lib/categories'
import { Link, LinkCategory } from '@/lib/types'
import {
  BookOpenCheck,
  ExternalLink,
  Globe,
  Info,
  Lightbulb,
  Star,
  Tag,
  Trash2,
} from 'lucide-react'
import Image from 'next/image'
import { memo, useCallback } from 'react'

interface LinkCardProps {
  link: Link
  categoryOptions: string[]
  onToggleRead: (id: string, isRead: boolean) => void
  onSetCategory: (id: string, category: LinkCategory) => void
  onDelete: (id: string) => void
}

export const LinkCard = memo(function LinkCard({
  link,
  categoryOptions,
  onToggleRead,
  onSetCategory,
  onDelete,
}: LinkCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year:
        date.getFullYear() !== new Date().getFullYear()
          ? 'numeric'
          : undefined,
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('a')) return
      onToggleRead(link.id, !link.is_read)
    },
    [link.id, link.is_read, onToggleRead]
  )

  const handlePickCategory = useCallback(
    (slug: LinkCategory) => {
      onSetCategory(link.id, slug)
    },
    [link.id, onSetCategory]
  )

  const toggleOrPick = useCallback(
    (slug: string) => {
      onSetCategory(link.id, link.category === slug ? null : slug)
    },
    [link.id, link.category, onSetCategory]
  )

  const handleDelete = useCallback(() => {
    onDelete(link.id)
  }, [link.id, onDelete])

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-150 cursor-pointer hover:ring-1 hover:ring-primary/30 ${link.is_read ? 'opacity-50 bg-muted/30' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex gap-4 p-4">
        <div className="flex-shrink-0">
          {link.image_url ? (
            <div className="w-20 h-20 rounded-md overflow-hidden bg-muted">
              <Image
                src={link.image_url}
                alt=""
                width={80}
                height={80}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center">
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
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
              {link.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {link.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                {link.is_read && (
                  <span className="inline-flex items-center gap-1 text-green-500">
                    <BookOpenCheck className="h-3 w-3" />
                    Read
                  </span>
                )}
                {link.domain && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {link.domain}
                  </span>
                )}
                <span>{formatDate(link.created_at)}</span>
                {link.is_favorite && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
                {link.category === 'general_info' && (
                  <span className="inline-flex items-center gap-1 text-blue-400">
                    <Info className="h-3 w-3" />
                    Info
                  </span>
                )}
                {link.category === 'try_implementing' && (
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <Lightbulb className="h-3 w-3" />
                    Try it
                  </span>
                )}
                {link.category &&
                  !isBuiltinCategorySlug(link.category) &&
                  link.category.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-violet-400">
                      <Tag className="h-3 w-3" />
                      {categoryLabel(link.category)}
                    </span>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-4 pb-3 pt-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:thin]">
          <div
            className="flex flex-nowrap items-center gap-1 pb-0.5"
            role="toolbar"
            aria-label="Categories"
          >
            <Button
              type="button"
              variant={link.category === null ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 shrink-0 px-2 text-xs whitespace-nowrap"
              onClick={() => handlePickCategory(null)}
            >
              None
            </Button>
            {categoryOptions.map(slug => (
              <Button
                type="button"
                key={slug}
                variant={link.category === slug ? 'secondary' : 'ghost'}
                size="sm"
                className={`h-7 shrink-0 px-2 text-xs whitespace-nowrap ${
                  slug === 'general_info'
                    ? 'text-blue-400'
                    : slug === 'try_implementing'
                      ? 'text-amber-400'
                      : ''
                }`}
                onClick={() => toggleOrPick(slug)}
              >
                {slug === 'general_info' && (
                  <Info className="h-3.5 w-3.5 mr-1 shrink-0" />
                )}
                {slug === 'try_implementing' && (
                  <Lightbulb className="h-3.5 w-3.5 mr-1 shrink-0" />
                )}
                {slug !== 'general_info' && slug !== 'try_implementing' && (
                  <Tag className="h-3.5 w-3.5 mr-1 shrink-0 opacity-70" />
                )}
                {categoryLabel(slug)}
              </Button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Delete
        </Button>
      </div>
    </Card>
  )
})
