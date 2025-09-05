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

      <section className="w-full py-12 md:py-24 lg:py-32">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto justify-center">
              <div className="flex flex-col lg:border-r py-10 relative group/feature lg:border-l lg:border-b border-border">
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-muted/50 to-transparent pointer-events-none"></div>
                <div className="mb-4 relative z-10 px-10 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open h-6 w-6" aria-hidden="true">
                    <path d="M12 7v14"></path>
                    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                  </svg>
                </div>
                <div className="text-lg font-bold mb-2 relative z-10 px-10">
                  <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-border group-hover/feature:bg-primary transition-all duration-200 origin-center"></div>
                  <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">Proven Frameworks</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">Choose from time-tested storytelling structures like the Hero's Journey and Three-Act Structure to guide your narrative.</p>
              </div>
              <div className="flex flex-col lg:border-r py-10 relative group/feature lg:border-b border-border">
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-muted/50 to-transparent pointer-events-none"></div>
                <div className="mb-4 relative z-10 px-10 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panels-top-left h-6 w-6" aria-hidden="true">
                    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                    <path d="M3 9h18"></path>
                    <path d="M9 21V9"></path>
                  </svg>
                </div>
                <div className="text-lg font-bold mb-2 relative z-10 px-10">
                  <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-border group-hover/feature:bg-primary transition-all duration-200 origin-center"></div>
                  <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">Structured Writing</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">Break down complex narratives into manageable beats and chapters with clear guidance for each story element.</p>
              </div>
              <div className="flex flex-col lg:border-r py-10 relative group/feature lg:border-b border-border">
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-muted/50 to-transparent pointer-events-none"></div>
                <div className="mb-4 relative z-10 px-10 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users h-6 w-6" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div className="text-lg font-bold mb-2 relative z-10 px-10">
                  <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-border group-hover/feature:bg-primary transition-all duration-200 origin-center"></div>
                  <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">Character Development</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">Build rich character profiles with dedicated tools to track relationships, motivations, and character arcs.</p>
              </div>
              <div className="flex flex-col lg:border-r py-10 relative group/feature lg:border-b border-border">
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-muted/50 to-transparent pointer-events-none"></div>
                <div className="mb-4 relative z-10 px-10 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pen-tool h-6 w-6" aria-hidden="true">
                    <path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"></path>
                    <path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"></path>
                    <path d="m2.3 2.3 7.286 7.286"></path>
                    <circle cx="11" cy="11" r="2"></circle>
                  </svg>
                </div>
                <div className="text-lg font-bold mb-2 relative z-10 px-10">
                  <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-border group-hover/feature:bg-primary transition-all duration-200 origin-center"></div>
                  <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">Beat-by-Beat Guidance</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">Follow structured story beats with descriptions and examples to ensure your narrative flows perfectly.</p>
              </div>
              <div className="flex flex-col lg:border-r py-10 relative group/feature lg:border-l border-border">
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-muted/50 to-transparent pointer-events-none"></div>
                <div className="mb-4 relative z-10 px-10 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-feather h-6 w-6" aria-hidden="true">
                    <path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z"></path>
                    <path d="M16 8 2 22"></path>
                    <path d="M17.5 15H9"></path>
                  </svg>
                </div>
                <div className="text-lg font-bold mb-2 relative z-10 px-10">
                  <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-border group-hover/feature:bg-primary transition-all duration-200 origin-center"></div>
                  <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">Multiple Frameworks</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">Switch between Hero's Journey, Story Circle, Three-Act Structure, and more to find what works for your story.</p>
              </div>
              <div className="flex flex-col lg:border-r py-10 relative group/feature border-border">
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-muted/50 to-transparent pointer-events-none"></div>
                <div className="mb-4 relative z-10 px-10 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap h-6 w-6" aria-hidden="true">
                    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
                  </svg>
                </div>
                <div className="text-lg font-bold mb-2 relative z-10 px-10">
                  <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-border group-hover/feature:bg-primary transition-all duration-200 origin-center"></div>
                  <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">Progress Tracking</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">Visual progress indicators show your completion status and help maintain momentum in your writing journey.</p>
              </div>
              <div className="flex flex-col lg:border-r py-10 relative group/feature border-border">
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-muted/50 to-transparent pointer-events-none"></div>
                <div className="mb-4 relative z-10 px-10 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download h-6 w-6" aria-hidden="true">
                    <path d="M12 15V3"></path>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <path d="m7 10 5 5 5-5"></path>
                  </svg>
                </div>
                <div className="text-lg font-bold mb-2 relative z-10 px-10">
                  <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-border group-hover/feature:bg-primary transition-all duration-200 origin-center"></div>
                  <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">Export Options</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">Export your completed stories as PDF or TXT files to share, publish, or continue editing elsewhere.</p>
              </div>
              <div className="flex flex-col lg:border-r py-10 relative group/feature border-border">
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-muted/50 to-transparent pointer-events-none"></div>
                <div className="mb-4 relative z-10 px-10 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text h-6 w-6" aria-hidden="true">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                    <path d="M10 9H8"></path>
                    <path d="M16 13H8"></path>
                    <path d="M16 17H8"></path>
                  </svg>
                </div>
                <div className="text-lg font-bold mb-2 relative z-10 px-10">
                  <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-border group-hover/feature:bg-primary transition-all duration-200 origin-center"></div>
                  <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">Auto-Save</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">Never lose your work with automatic saving for signed-in users and local storage for guest writers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
