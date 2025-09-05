'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useConvexStoryStore } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Story } from "@/lib/convex-store"
import { BookOpen, Plus, ArrowRight, Settings, Lightbulb, FolderOpen, LayoutDashboard } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="text-center py-12">Loading...</div>
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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="flex items-center p-6 border-b border-sidebar-border">
          <BookOpen className="h-8 w-8 text-sidebar-primary" />
          <span className="text-xl font-bold ml-2 text-sidebar-foreground">StoryGenPro</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="flex items-center px-4 py-2 text-sidebar-primary-foreground bg-sidebar-primary rounded-lg font-semibold">
            <LayoutDashboard className="h-5 w-5 mr-3" />
            Dashboard
          </div>
          <Button 
            variant="ghost"
            onClick={() => router.push('/projects')}
            className="flex items-center px-4 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg w-full justify-start"
          >
            <FolderOpen className="h-5 w-5 mr-3" />
            Projects
          </Button>
          <Button 
            variant="ghost"
            className="flex items-center px-4 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg w-full justify-start"
          >
            <Settings className="h-5 w-5 mr-3" />
            Settings
          </Button>
          <Button 
            variant="ghost"
            className="flex items-center px-4 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg w-full justify-start"
          >
            <Lightbulb className="h-5 w-5 mr-3" />
            Feedback
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div></div>
            <Button 
              onClick={() => router.push('/framework')}
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Story
            </Button>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-foreground">Recent Stories</h2>
              {stories.length > 3 && (
                <Button 
                  variant="ghost"
                  onClick={() => router.push('/projects')}
                  className="flex items-center text-sm font-medium text-primary hover:text-primary/80"
                >
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>

            {stories.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent>
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <CardTitle className="text-lg mb-2">No stories yet</CardTitle>
                  <CardDescription className="mb-4">
                    Create your first story to get started
                  </CardDescription>
                  <Button onClick={() => router.push('/framework')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Story
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentStories.map((story) => {
                  const completedBeats = story.beats.filter(beat => beat.completed).length
                  const progress = (completedBeats / story.beats.length) * 100

                  return (
                    <Card key={story._id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{story.title}</CardTitle>
                        </div>
                        <CardDescription className="text-sm">
                          Last edited {formatDate(story.lastEdited)}
                        </CardDescription>
                        <div className="flex items-center mt-4">
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground ml-3">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          variant="secondary"
                          onClick={() => handleContinueStory(story)}
                          className="w-full"
                        >
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
      </main>
    </div>
  )
}
