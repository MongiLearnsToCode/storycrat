'use client'

import { useRouter } from "next/navigation"
import { SignedIn, SignedOut } from "@clerk/nextjs"
import { HeroWithMockup } from "@/components/ui/hero-with-mockup"
import { FeaturesSectionWithHoverEffects } from "@/components/ui/features-section-with-hover-effects"
import { useConvexStoryStore } from "@/lib/convex-store"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

export default function LandingPage() {
  const router = useRouter()
  const stories = useQuery(api.stories.getStories)
  const { setCurrentStory } = useConvexStoryStore()

  const handleContinueWriting = () => {
    if (stories && stories.length > 0) {
      const lastStory = stories.reduce((latest, story) => {
        return new Date(story.lastEdited) > new Date(latest.lastEdited) ? story : latest
      })
      setCurrentStory(lastStory)
      router.push('/story')
    } else {
      router.push('/framework')
    }
  }

  return (
    <main className="flex-1">
      <SignedOut>
        <HeroWithMockup
          title="Craft Compelling Stories with Proven Frameworks"
          description="Transform your ideas into structured narratives using the Hero's Journey and other time-tested storytelling frameworks. No more writer's block."
          primaryCta={{
            text: "Start Writing",
            onClick: () => router.push('/framework')
          }}
          secondaryCta={{
            text: "Sign Up for Free",
            onClick: () => router.push('/sign-up')
          }}
          
          mockupImage={{
            src: "/images/storycrat-interface-mockup.png",
            alt: "StoryCrat Interface - Story Writing Dashboard",
            width: 1400,
            height: 900
          }}
        />
      </SignedOut>
      <SignedIn>
        <HeroWithMockup
          title="Welcome Back to StoryCrat"
          description="Continue crafting your stories with structured frameworks and powerful writing tools."
          primaryCta={{
            text: "Continue Writing",
            onClick: handleContinueWriting
          }}
          secondaryCta={{
            text: "My Projects",
            onClick: () => router.push('/projects')
          }}
          
          mockupImage={{
            src: "/images/storycrat-interface-mockup.png",
            alt: "StoryCrat Interface - Story Writing Dashboard",
            width: 1400,
            height: 900
          }}
        />
      </SignedIn>

      <section className="relative w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted/30 animate-appear opacity-0 [animation-delay:1200ms]">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary animate-appear opacity-0 [animation-delay:1400ms]">
                ✨ Powerful Features
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent animate-appear opacity-0 [animation-delay:1500ms]">
                Everything You Need to Write Better Stories
              </h2>
              <p className="max-w-[700px] text-lg text-muted-foreground animate-appear opacity-0 [animation-delay:1600ms]">
                From proven storytelling frameworks to advanced character development, StoryCrat provides all the tools you need to craft compelling narratives.
              </p>
            </div>
          </div>

          <div className="flex justify-center items-center animate-appear opacity-0 [animation-delay:1700ms]">
            <FeaturesSectionWithHoverEffects />
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>
      </section>

    </main>
  )
}
