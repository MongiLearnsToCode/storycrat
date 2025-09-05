'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useConvexStoryStore } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { Story } from "@/lib/convex-store"
import { BookOpen, Plus, ArrowRight } from "lucide-react"
import { SignedIn, SignedOut } from "@clerk/nextjs"

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const router = useRouter();

  if (!publishableKey) {
    // Fallback for build time when Clerk isn't available
    return (
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center py-20">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h2 className="text-2xl font-semibold mb-3">Welcome to StoryGenPro</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Create structured stories using the Hero&apos;s Journey framework with AI-assisted suggestions.
          </p>
          <Button size="lg" onClick={() => router.push('/sign-in')}>
            Get Started
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-3">Welcome to StoryGenPro</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create structured stories using the Hero&apos;s Journey framework with AI-assisted suggestions.
            </p>
            <Button size="lg" onClick={() => router.push('/sign-in')}>
              Get Started
            </Button>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <HomeContent />
      </SignedIn>
    </>
  )
}

function HomeContent() {
  const router = useRouter()
  const stories = useQuery(api.stories.getStories)
  const setCurrentStory = useConvexStoryStore(state => state.setCurrentStory)

  const handleContinueStory = (story: Story) => {
    setCurrentStory(story)
    router.push('/story')
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (stories === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!stories) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Unable to load stories</div>
      </div>
    )
  }

  const recentStories = stories.slice(0, 3)

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {stories.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h2 className="text-2xl font-semibold mb-3">Ready to Start Writing?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Create your first story using the Hero&apos;s Journey framework.
          </p>
          <Button size="lg" onClick={() => router.push('/framework')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Story
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold">Recent Stories</h2>
            {stories.length > 3 && (
              <Button variant="ghost" onClick={() => router.push('/projects')}>
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentStories.map((story) => {
              const completedBeats = story.beats.filter(beat => beat.completed).length
              const progress = (completedBeats / story.beats.length) * 100

              return (
                <Card key={story._id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleContinueStory(story)}>
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2">{story.title}</CardTitle>
                    <CardDescription>
                      Last edited {formatDate(story.lastEdited)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <Button variant="secondary" className="w-full">
                      Continue Writing
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}
