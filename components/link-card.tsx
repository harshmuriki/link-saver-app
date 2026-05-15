'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Category, Link, LinkCategory } from '@/lib/types'
import {
  BookOpenCheck,
  Check,
  ExternalLink,
  Globe,
  Info,
  Lightbulb,
  Plus,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { memo, useCallback, useState } from 'react'

interface LinkCardProps {
  link: Link
  categories: Category[]
  onToggleRead: (id: string, isRead: boolean) => void
  onSetCategory: (id: string, category: LinkCategory) => void
  onDelete: (id: string) => void
  onAddCategory: (name: string) => Promise<Category | null>
}

const getCategoryIcon = (icon: string) => {
  switch (icon) {
    case 'info': return Info
    case 'lightbulb': return Lightbulb
    default: return Tag
  }
}

// Memoized component to prevent unnecessary re-renders
export const LinkCard = memo(function LinkCard({ 
  link, 
  categories,
  onToggleRead,
  onSetCategory,
  onDelete,
  onAddCategory,
}: LinkCardProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // Memoized handlers to prevent recreation on each render
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't toggle if clicking on buttons, links, or interactive elements
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a') || target.closest('[role="menu"]') || target.closest('input')) return
    onToggleRead(link.id, !link.is_read)
  }, [link.id, link.is_read, onToggleRead])

  const handleSetCategory = useCallback((slug: string | null) => {
    onSetCategory(link.id, slug === link.category ? null : slug)
  }, [link.id, link.category, onSetCategory])

  const handleDelete = useCallback(() => {
    onDelete(link.id)
  }, [link.id, onDelete])

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    const category = await onAddCategory(newCategoryName.trim())
    setIsSubmitting(false)
    
    if (category) {
      onSetCategory(link.id, category.slug)
      setNewCategoryName('')
      setIsAddingCategory(false)
    }
  }

  const currentCategory = categories.find(c => c.slug === link.category)
  const CurrentIcon = currentCategory ? getCategoryIcon(currentCategory.icon) : Tag

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-150 cursor-pointer hover:ring-1 hover:ring-primary/30 ${link.is_read ? 'opacity-50 bg-muted/30' : ''}`}
      onClick={handleCardClick}
    >
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
                {currentCategory && (
                  <span 
                    className="inline-flex items-center gap-1"
                    style={{ color: currentCategory.color }}
                  >
                    <CurrentIcon className="h-3 w-3" />
                    {currentCategory.name}
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
          {/* Category Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={link.category ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                style={currentCategory ? { color: currentCategory.color } : undefined}
              >
                <CurrentIcon className="h-3.5 w-3.5 mr-1" />
                {currentCategory ? currentCategory.name : 'Category'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {/* Clear category option */}
              {link.category && (
                <>
                  <DropdownMenuItem onClick={() => handleSetCategory(null)}>
                    <X className="h-4 w-4 mr-2" />
                    Clear category
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {/* Existing categories */}
              {categories.map((cat) => {
                const CatIcon = getCategoryIcon(cat.icon)
                const isSelected = link.category === cat.slug
                return (
                  <DropdownMenuItem 
                    key={cat.id} 
                    onClick={() => handleSetCategory(cat.slug)}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center" style={{ color: cat.color }}>
                      <CatIcon className="h-4 w-4 mr-2" />
                      {cat.name}
                    </span>
                    {isSelected && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                )
              })}
              
              <DropdownMenuSeparator />
              
              {/* Add new category */}
              {isAddingCategory ? (
                <div className="p-2">
                  <div className="flex gap-1">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCategory()
                        if (e.key === 'Escape') {
                          setIsAddingCategory(false)
                          setNewCategoryName('')
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim() || isSubmitting}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <DropdownMenuItem onClick={() => setIsAddingCategory(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add category
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Delete button on the right */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Delete
        </Button>
      </div>
    </Card>
  )
})
