'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link, LinkCategory } from '@/lib/types'
import {
  BookOpen,
  BookOpenCheck,
  ExternalLink,
  Globe,
  Info,
  Lightbulb,
  Star,
  Trash2,
} from 'lucide-react'
import Image from 'next/image'

interface LinkCardProps {
  link: Link
  onToggleRead: (id: string, isRead: boolean) => void
  onToggleFavorite: (id: string, isFavorite: boolean) => void
  onSetCategory: (id: string, category: LinkCategory) => void
  onDelete: (id: string) => void
}

export function LinkCard({ 
  link, 
  onToggleRead, 
  onToggleFavorite, 
  onSetCategory,
  onDelete 
}: LinkCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <Card className={`group relative overflow-hidden transition-colors ${link.is_read ? 'opacity-60' : ''}`}>
      <div className="flex gap-4 p-4">
        {/* Image/favicon */}
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

        {/* Content */}
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
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom category controls */}
      <div className="flex items-center justify-between gap-1 px-4 pb-3 pt-0">
        <div className="flex items-center gap-1">
          {/* Read/Unread toggle */}
          <Button
            variant={link.is_read ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onToggleRead(link.id, !link.is_read)}
          >
            {link.is_read ? (
              <>
                <BookOpenCheck className="h-3.5 w-3.5 mr-1" />
                Read
              </>
            ) : (
              <>
                <BookOpen className="h-3.5 w-3.5 mr-1" />
                Unread
              </>
            )}
          </Button>

          {/* General Info category */}
          <Button
            variant={link.category === 'general_info' ? "secondary" : "ghost"}
            size="sm"
            className={`h-7 px-2 text-xs ${link.category === 'general_info' ? 'text-blue-400' : ''}`}
            onClick={() => onSetCategory(link.id, link.category === 'general_info' ? null : 'general_info')}
          >
            <Info className="h-3.5 w-3.5 mr-1" />
            Info
          </Button>

          {/* Try Implementing category */}
          <Button
            variant={link.category === 'try_implementing' ? "secondary" : "ghost"}
            size="sm"
            className={`h-7 px-2 text-xs ${link.category === 'try_implementing' ? 'text-amber-400' : ''}`}
            onClick={() => onSetCategory(link.id, link.category === 'try_implementing' ? null : 'try_implementing')}
          >
            <Lightbulb className="h-3.5 w-3.5 mr-1" />
            Try it
          </Button>
        </div>

        {/* Delete button on the right */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(link.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Delete
        </Button>
      </div>
    </Card>
  )
}
