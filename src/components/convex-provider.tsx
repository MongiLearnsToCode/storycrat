'use client'

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { useAuth } from "@clerk/nextjs"
import { useMemo } from "react"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  
  const convex = useMemo(() => {
    if (!convexUrl) return null
    
    return new ConvexReactClient(convexUrl, {
      auth: {
        getToken: () => getToken({ template: "convex" }),
      },
    })
  }, [getToken])

  if (!convex) {
    return <>{children}</>
  }
  
  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
