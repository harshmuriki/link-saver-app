'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Check, Copy, Eye, EyeOff, RefreshCw, Smartphone } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export default function ApiKeyPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const fetchApiKey = useCallback(async () => {
    try {
      const res = await fetch('/api/user/api-key')
      if (res.ok) {
        const data = await res.json()
        setApiKey(data.api_key)
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApiKey()
  }, [fetchApiKey])

  const regenerateApiKey = async () => {
    setRegenerating(true)
    try {
      const res = await fetch('/api/user/api-key', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setApiKey(data.api_key)
      }
    } catch {
      // Handle error
    } finally {
      setRegenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}${'•'.repeat(48)}${apiKey.slice(-8)}` : ''

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">API Key</h1>
        <p className="text-muted-foreground">Use your API key to save links from Apple Shortcuts or other apps</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Your API Key</CardTitle>
          <CardDescription>
            Keep this key secret. Anyone with access to it can manage your links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-10 bg-muted rounded animate-pulse" />
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={showKey ? apiKey || '' : maskedKey}
                  readOnly
                  className="font-mono text-sm pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={regenerateApiKey} disabled={regenerating}>
                <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Apple Shortcuts Setup</CardTitle>
          </div>
          <CardDescription>
            Use Apple Shortcuts to quickly save links from Safari or any app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground mb-2">Quick Setup</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Open the Shortcuts app on your iPhone or Mac</li>
              <li>Create a new shortcut</li>
              <li>Add &quot;Get URLs from Input&quot; action</li>
              <li>Add &quot;Get Contents of URL&quot; action with these settings:</li>
            </ol>
          </div>
          
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">URL:</span>
                <span className="text-foreground">{baseUrl}/api/links</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method:</span>
                <span className="text-foreground">POST</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Header:</span>
                <span className="text-foreground">x-api-key: [Your API Key]</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Body:</span>
                <span className="text-foreground">{`{"url": "[URL Variable]"}`}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Tip</h4>
            <p className="text-sm text-muted-foreground">
              Add this shortcut to your Share Sheet so you can save links from any app with just a tap!
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Documentation</CardTitle>
          <CardDescription>
            All API endpoints for managing your links
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <ApiEndpoint
              method="POST"
              path="/api/links"
              description="Save a new link"
              body={`{"url": "https://example.com", "is_favorite": false}`}
            />
            <ApiEndpoint
              method="GET"
              path="/api/links"
              description="List all links with optional filters"
              params="?page=1&limit=20&is_read=false&is_favorite=true&search=keyword&sort_by=created_at&sort_order=desc"
            />
            <ApiEndpoint
              method="GET"
              path="/api/links/:id"
              description="Get a single link"
            />
            <ApiEndpoint
              method="PATCH"
              path="/api/links/:id"
              description="Update a link"
              body={`{"title": "New Title", "is_read": true, "is_favorite": true}`}
            />
            <ApiEndpoint
              method="DELETE"
              path="/api/links/:id"
              description="Delete a link"
            />
            <ApiEndpoint
              method="POST"
              path="/api/links/:id/read"
              description="Mark as read"
            />
            <ApiEndpoint
              method="DELETE"
              path="/api/links/:id/read"
              description="Mark as unread"
            />
            <ApiEndpoint
              method="POST"
              path="/api/links/:id/favorite"
              description="Add to favorites"
            />
            <ApiEndpoint
              method="DELETE"
              path="/api/links/:id/favorite"
              description="Remove from favorites"
            />
            <ApiEndpoint
              method="GET"
              path="/api/links/export"
              description="Export links"
              params="?format=json|csv|html&from=2024-01-01&to=2024-12-31"
            />
            <ApiEndpoint
              method="GET"
              path="/api/links/export/by-date"
              description="Export by date range"
              params="?from=2024-01-01&to=2024-01-31&format=json"
            />
            <ApiEndpoint
              method="GET"
              path="/api/links/stats"
              description="Get link statistics"
            />
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-foreground mb-2">Authentication</h4>
            <p className="text-sm text-muted-foreground">
              Include your API key in the <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">x-api-key</code> header 
              or as an <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">api_key</code> query parameter.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ApiEndpoint({ 
  method, 
  path, 
  description, 
  body, 
  params 
}: { 
  method: string
  path: string
  description: string
  body?: string
  params?: string
}) {
  const methodColors: Record<string, string> = {
    GET: 'bg-green-500/20 text-green-400',
    POST: 'bg-blue-500/20 text-blue-400',
    PATCH: 'bg-yellow-500/20 text-yellow-400',
    DELETE: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${methodColors[method]}`}>
          {method}
        </span>
        <code className="text-sm text-foreground">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {params && (
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          Params: {params}
        </p>
      )}
      {body && (
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          Body: {body}
        </p>
      )}
    </div>
  )
}
