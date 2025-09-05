'use client'

import { useRouter } from "next/navigation"
import { BookOpen, Feather } from "lucide-react"
import { SignedIn, SignedOut } from "@clerk/nextjs"
import { HeroWithMockup } from "@/components/ui/hero-with-mockup"
import { FeaturesSectionWithHoverEffects } from "@/components/ui/features-section-with-hover-effects"

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
            src: "/images/storycrat-interface-mockup.png",
            alt: "StoryGenPro Interface - Story Writing Dashboard",
            width: 1400,
            height: 900
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
            src: "/images/storycrat-interface-mockup.png",
            alt: "StoryGenPro Interface - Story Writing Dashboard",
            width: 1400,
            height: 900
          }}
        />
      </SignedIn>

      <section className="relative w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted/30">
        <div className="container px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                ✨ Powerful Features
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                Everything You Need to Write Better Stories
              </h2>
              <p className="max-w-[700px] text-lg text-muted-foreground">
                From proven storytelling frameworks to advanced character development, StoryGenPro provides all the tools you need to craft compelling narratives.
              </p>
            </div>
          </div>
          
          <div className="flex justify-center items-center">
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
