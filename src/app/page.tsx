'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useConvexStoryStore } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Story } from "@/lib/convex-store"
import { BookOpen, Plus, ArrowRight } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b p-4 lg:p-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
              <h1 className="text-xl lg:text-2xl font-bold">StoryGenPro</h1>
            </div>
          </div>
        </header>
        <div className="max-w-6xl mx-auto p-4 lg:p-6">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    )
  }

  return <DashboardContent />
}

function DashboardContent() {
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
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (stories === undefined) return <div>Loading...</div>
  if (!stories) return <div>Unable to load stories. Please check your connection.</div>

  const recentStories = stories.slice(0, 3)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4 lg:p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            <h1 className="text-xl lg:text-2xl font-bold">StoryGenPro</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        <div className="mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Manage your stories and start new projects</p>
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/framework')} 
                className="w-full justify-start h-12"
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Story
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/projects')} 
                className="w-full justify-start h-12"
                size="lg"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                All Projects
              </Button>
            </div>
          </div>

          {/* Recent Stories */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Stories</h3>
              {stories.length > 3 && (
                <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
            
            {stories.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent>
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-semibold mb-2">No stories yet</h4>
                  <p className="text-muted-foreground mb-4">
                    Create your first story to get started
                  </p>
                  <Button onClick={() => router.push('/framework')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Story
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recentStories.map((story) => {
                  const completedBeats = story.beats.filter(beat => beat.completed).length
                  const progress = (completedBeats / story.beats.length) * 100

                  return (
                    <Card key={story._id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg truncate">{story.title}</CardTitle>
                            <CardDescription className="text-sm">
                              Last edited {formatDate(story.lastEdited)}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm text-muted-foreground">
                              {Math.round(progress)}%
                            </span>
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button onClick={() => handleContinueStory(story)} size="sm">
                          Continue Writing
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
