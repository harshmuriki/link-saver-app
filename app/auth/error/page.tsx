import { AlertCircle, Link2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Link2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-semibold text-foreground">LinkSaver</span>
          </div>
          
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          
          <h1 className="text-xl font-semibold text-foreground mb-2">Authentication Error</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Something went wrong during authentication. Please try again.
          </p>
        </div>

        <Button asChild className="w-full">
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  )
}
