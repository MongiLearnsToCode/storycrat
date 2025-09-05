'use client'

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { useAuth } from "@clerk/nextjs"
import { useMemo } from "react"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  
  const convex = useMemo(() => {
    if (!convexUrl) return null
    return new ConvexReactClient(convexUrl)
  }, [])

  if (!convex) {
    return <>{children}</>
  }
  
  // Set the auth token on the client
  if (getToken) {
    convex.setAuth(async () => {
      const token = await getToken({ template: "convex" })
      return token ?? undefined
    })
  }
  
  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
