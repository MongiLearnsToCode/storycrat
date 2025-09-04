import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL || 
    (process.env.NODE_ENV === "production" 
      ? "https://storycrat.vercel.app" 
      : "http://localhost:3000")
})

export const { signIn, signUp, signOut, useSession } = authClient
