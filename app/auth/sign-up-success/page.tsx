import { Link2, Mail } from 'lucide-react'
import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Link2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-semibold text-foreground">LinkSaver</span>
          </div>
          
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          
          <h1 className="text-xl font-semibold text-foreground mb-2">Check your email</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We&apos;ve sent you a confirmation link. Please check your email to verify your account.
          </p>
        </div>

        <Link 
          href="/auth/login"
          className="text-sm text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
