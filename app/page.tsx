import { Button } from '@/components/ui/button'
import { ArrowRight, Download, Link2, Smartphone, Zap } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">LinkSaver</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/sign-up">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Save links from anywhere,
            <br />
            <span className="text-primary">access them everywhere</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
            A simple API-first link saver designed for Apple Shortcuts. 
            Save links with one tap, auto-fetch metadata, and manage everything from a clean dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/auth/sign-up">
                Start Saving Links
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 border-t border-border">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold text-foreground text-center mb-12">
            Everything you need to manage links
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Smartphone}
              title="Apple Shortcuts Ready"
              description="Save links from any app on your iPhone with a single tap using Apple Shortcuts integration."
            />
            <FeatureCard
              icon={Zap}
              title="Auto-Fetch Metadata"
              description="Automatically fetches titles, descriptions, and images from saved URLs for rich link previews."
            />
            <FeatureCard
              icon={Download}
              title="Export Anywhere"
              description="Export your links as JSON, CSV, or HTML bookmarks. Filter by date range for targeted exports."
            />
          </div>
        </div>
      </section>

      {/* API Preview */}
      <section className="py-16 px-4 border-t border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Simple, powerful API
              </h2>
              <p className="text-muted-foreground mb-6">
                Built API-first for maximum flexibility. Use with Apple Shortcuts, 
                Raycast, browser extensions, or build your own integrations.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  RESTful endpoints for all operations
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  API key authentication
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Filter, sort, and paginate results
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Bulk operations supported
                </li>
              </ul>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 font-mono text-sm">
              <div className="text-muted-foreground mb-2"># Save a link</div>
              <div className="text-foreground">
                <span className="text-green-400">curl</span> -X POST \
              </div>
              <div className="text-foreground pl-4">
                {`-H "x-api-key: YOUR_KEY" \\`}
              </div>
              <div className="text-foreground pl-4">
                {`-d '{"url": "https://..."}' \\`}
              </div>
              <div className="text-foreground pl-4 text-primary">
                /api/links
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-border">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Ready to start saving links?
          </h2>
          <p className="text-muted-foreground mb-8">
            Create a free account and start organizing your links in seconds.
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/sign-up">
              Create Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <span>LinkSaver</span>
            </div>
            <p>Built with Supabase and Next.js</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string 
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
