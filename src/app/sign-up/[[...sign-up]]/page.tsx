import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <SignUp 
        afterSignInUrl="/"
        afterSignUpUrl="/"
        redirectUrl="/"
      />
    </div>
  )
}
