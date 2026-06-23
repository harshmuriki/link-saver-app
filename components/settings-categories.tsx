'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  BUILTIN_CATEGORY_SLUGS,
  categoryLabel,
  isBuiltinCategorySlug,
  isValidCategorySlug,
  slugifyCategory,
} from '@/lib/categories'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface UserCategoryRow {
  slug: string
  created_at: string
}

export function SettingsCategoriesCard() {
  const [rows, setRows] = useState<UserCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tableAvailable, setTableAvailable] = useState(true)

  const previewSlug = useMemo(() => slugifyCategory(newName), [newName])
  const canSubmit =
    tableAvailable &&
    previewSlug.length > 0 &&
    isValidCategorySlug(previewSlug) &&
    !isBuiltinCategorySlug(previewSlug) &&
    !rows.some(r => r.slug === previewSlug)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user/categories')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(typeof j.error === 'string' ? j.error : 'Could not load categories')
        setRows([])
        setTableAvailable(true)
        return
      }
      const j = await res.json()
      setRows(Array.isArray(j.data) ? j.data : [])
      setTableAvailable(j.tableAvailable !== false)
      if (j.tableAvailable === false) {
        setError(null)
      }
    } catch {
      setError('Could not load categories')
      setRows([])
      setTableAvailable(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async () => {
    if (!canSubmit) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch('/api/user/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Could not add category')
        return
      }
      setNewName('')
      await load()
    } catch {
      setError('Could not add category')
    } finally {
      setAdding(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingSlug) return
    setError(null)
    try {
      const res = await fetch('/api/user/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: deletingSlug }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Could not delete category')
        return
      }
      setDeletingSlug(null)
      await load()
    } catch {
      setError('Could not delete category')
    }
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Categories</CardTitle>
          <CardDescription>
            Add labels that appear when you organize links. Deleting a category removes it from
            your list and clears it from every link that used it.{' '}
            <Link href="/dashboard" className="text-primary underline-offset-4 hover:underline">
              Assign categories on the Links page.
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!loading && tableAvailable === false && (
            <div className="text-sm rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-50">
              <p className="font-medium mb-1">Database setup needed</p>
              <p className="opacity-90">
                Open the Supabase SQL Editor and run the script in{' '}
                <code className="rounded bg-background/60 px-1 py-0.5 text-xs font-mono text-foreground">
                  supabase/migrations/20260214120000_user_categories.sql
                </code>
                , then reload this page. Until then, categories on links still work; only the saved
                category list here is unavailable.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Built-in</h3>
            <ul className="rounded-md border border-border divide-y divide-border">
              {BUILTIN_CATEGORY_SLUGS.map(slug => (
                <li
                  key={slug}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm bg-muted/30"
                >
                  <span>{categoryLabel(slug)}</span>
                  <span className="text-xs text-muted-foreground shrink-0">Always available</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Your categories</h3>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No custom categories yet. Add one below.
              </p>
            ) : (
              <ul className="rounded-md border border-border divide-y divide-border">
                {rows.map(row => (
                  <li
                    key={row.slug}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span>{categoryLabel(row.slug)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => setDeletingSlug(row.slug)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete {categoryLabel(row.slug)}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Add category</h3>
            <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
              <Input
                placeholder="e.g. Research or side projects"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAdd()
                  }
                }}
                disabled={adding || !tableAvailable}
              />
              <Button
                type="button"
                onClick={handleAdd}
                disabled={!canSubmit || adding || !tableAvailable}
                className="sm:w-auto shrink-0"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </>
                )}
              </Button>
            </div>
            {newName.trim() && (
              <p className="text-xs text-muted-foreground">
                Saved as <span className="font-mono text-foreground">{previewSlug || '—'}</span>
                {!isValidCategorySlug(previewSlug) && newName.trim()
                  ? ' — use letters, numbers, or spaces.'
                  : null}
                {rows.some(r => r.slug === previewSlug) ? ' — already added.' : null}
                {isBuiltinCategorySlug(previewSlug) && newName.trim()
                  ? ' — built-in; use the Links page to assign it.'
                  : null}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deletingSlug !== null} onOpenChange={o => !o && setDeletingSlug(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSlug
                ? `“${categoryLabel(deletingSlug)}” will be removed and cleared from all links that use it.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
