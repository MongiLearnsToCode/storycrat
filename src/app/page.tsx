'use client'

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { BookOpen, Feather, Zap, Users } from "lucide-react"
import { SignedIn, SignedOut } from "@clerk/nextjs"

export default function LandingPage() {
  const router = useRouter()

  return (
    <main className="flex-1">
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  Unlock Your Best Story with StoryGenPro
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  A structured, guided environment for story creation using proven frameworks and AI-assisted suggestions.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <SignedOut>
                  <Button size="lg" onClick={() => router.push('/framework')}>
                    Get Started for Free
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => router.push('/sign-in')}>
                    Sign In
                  </Button>
                </SignedOut>
                <SignedIn>
                  <Button size="lg" onClick={() => router.push('/dashboard')}>
                    Go to Your Dashboard
                  </Button>
                </SignedIn>
              </div>
            </div>
            <BookOpen className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square w-60 h-60 text-primary" />
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-muted-foreground/10 px-3 py-1 text-sm">
                Key Features
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Write Smarter, Not Harder</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Leverage powerful tools to bring your story to life, from structured outlines to intelligent suggestions.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
            <div className="grid gap-1 text-center">
                <Feather className="h-10 w-10 mx-auto text-primary"/>
              <h3 className="text-xl font-bold">Proven Frameworks</h3>
              <p className="text-muted-foreground">
                Start with the time-tested Hero&apos;s Journey to build a compelling narrative arc.
              </p>
            </div>
            <div className="grid gap-1 text-center">
                <Zap className="h-10 w-10 mx-auto text-primary"/>
              <h3 className="text-xl font-bold">AI-Powered Suggestions</h3>
              <p className="text-muted-foreground">
                Overcome writer&apos;s block with creative hints and ideas for every step of your story.
              </p>
            </div>
            <div className="grid gap-1 text-center">
                <Users className="h-10 w-10 mx-auto text-primary"/>
              <h3 className="text-xl font-bold">Character Management</h3>
              <p className="text-muted-foreground">
                Keep track of your story&apos;s cast with dedicated character profiles.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
