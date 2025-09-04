"use client"

import { SignInForm } from "@/components/auth/sign-in-form"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export default function AuthPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)

  useEffect(() => {
    if (session) {
      router.push("/")
    }
  }, [session, router])

  if (session) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {isSignUp ? <SignUpForm /> : <SignInForm />}
        
        <div className="text-center">
          <Button 
            variant="link" 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm"
          >
            {isSignUp 
              ? "Already have an account? Sign in" 
              : "Don't have an account? Sign up"
            }
          </Button>
        </div>
      </div>
    </div>
  )
}
