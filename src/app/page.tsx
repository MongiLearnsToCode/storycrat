'use client'

import { useRouter } from "next/navigation"
import { BookOpen, Feather, Users } from "lucide-react"
import { SignedIn, SignedOut } from "@clerk/nextjs"
import { HeroWithMockup } from "@/components/ui/hero-with-mockup"

export default function LandingPage() {
  const router = useRouter()

  return (
    <main className="flex-1">
      <SignedOut>
        <HeroWithMockup
          title="Craft Compelling Stories with Proven Frameworks"
          description="Transform your ideas into structured narratives using the Hero's Journey and other time-tested storytelling frameworks. No more writer's block."
          primaryCta={{
            text: "Start Writing Now",
            onClick: () => router.push('/framework')
          }}
          secondaryCta={{
            text: "View Demo",
            onClick: () => router.push('/framework'),
            icon: <BookOpen className="mr-2 h-4 w-4" />
          }}
          mockupImage={{
            src: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1200&h=800&auto=format&fit=crop",
            alt: "StoryGenPro Interface - Story Writing Dashboard",
            width: 1200,
            height: 800
          }}
        />
      </SignedOut>
      <SignedIn>
        <HeroWithMockup
          title="Welcome Back to StoryGenPro"
          description="Continue crafting your stories with structured frameworks and powerful writing tools."
          primaryCta={{
            text: "Go to Dashboard",
            onClick: () => router.push('/dashboard')
          }}
          secondaryCta={{
            text: "New Story",
            onClick: () => router.push('/framework'),
            icon: <Feather className="mr-2 h-4 w-4" />
          }}
          mockupImage={{
            src: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1200&h=800&auto=format&fit=crop",
            alt: "StoryGenPro Interface - Story Writing Dashboard",
            width: 1200,
            height: 800
          }}
        />
      </SignedIn>

      <section className="relative w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted/30">
        <div className="container px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                ✨ Powerful Features
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                Write Smarter, Not Harder
              </h2>
              <p className="max-w-[700px] text-lg text-muted-foreground">
                Leverage powerful tools designed specifically for storytellers to bring your narratives to life with structure and creativity.
              </p>
            </div>
          </div>
          
          <div className="mx-auto grid max-w-6xl items-start gap-8 py-16 lg:grid-cols-3 lg:gap-12">
            <div className="group relative overflow-hidden rounded-2xl border bg-card/50 p-8 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Feather className="h-6 w-6 text-primary"/>
                </div>
                <h3 className="mb-3 text-xl font-semibold">Proven Frameworks</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Choose from time-tested storytelling structures like the Hero&apos;s Journey, Three-Act Structure, and more to guide your narrative.
                </p>
              </div>
            </div>
            
            <div className="group relative overflow-hidden rounded-2xl border bg-card/50 p-8 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary"/>
                </div>
                <h3 className="mb-3 text-xl font-semibold">Structured Writing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Break down complex narratives into manageable beats and chapters with clear guidance for each story element.
                </p>
              </div>
            </div>
            
            <div className="group relative overflow-hidden rounded-2xl border bg-card/50 p-8 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary"/>
                </div>
                <h3 className="mb-3 text-xl font-semibold">Character Development</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Build rich character profiles with dedicated tools to track relationships, motivations, and character arcs throughout your story.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
      </section>
    </main>
  )
}
