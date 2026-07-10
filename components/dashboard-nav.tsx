'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, Key, Link2, LogOut, Network, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function DashboardNav() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-14">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">LinkSaver</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Links</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/daily" className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Daily
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/map" className="flex items-center gap-1.5">
                <Network className="h-4 w-4" />
                Map
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/api-key">API Key</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/settings">Settings</Link>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-2">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/api-key" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    API Key
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  )
}
