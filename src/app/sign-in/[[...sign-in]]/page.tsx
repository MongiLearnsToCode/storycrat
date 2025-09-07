import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <SignIn 
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/framework"
        redirectUrl="/dashboard"
      />
    </div>
  )
}
