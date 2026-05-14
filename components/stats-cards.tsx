'use client'

import { Card, CardContent } from '@/components/ui/card'
import { LinkStats } from '@/lib/types'
import { BookOpen, Calendar, Link2, Star } from 'lucide-react'

interface StatsCardsProps {
  stats: LinkStats | null
}

export function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statItems = [
    {
      label: 'Total Links',
      value: stats.total_links,
      icon: Link2,
      color: 'text-primary',
    },
    {
      label: 'Unread',
      value: stats.unread_links,
      icon: BookOpen,
      color: 'text-blue-400',
    },
    {
      label: 'Favorites',
      value: stats.favorite_links,
      icon: Star,
      color: 'text-yellow-500',
    },
    {
      label: 'This Week',
      value: stats.links_this_week,
      icon: Calendar,
      color: 'text-green-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-sm">{stat.label}</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
