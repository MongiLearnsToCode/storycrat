'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexStoryStore } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"

export default function ProjectsPage() {
  const router = useRouter()
  const stories = useQuery(api.stories.getStories)
  const setCurrentStory = useConvexStoryStore(state => state.setCurrentStory)

  const handleContinueStory = (story: any) => {
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

  if (!stories) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b p-3 lg:p-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 lg:gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home
            </Button>
            <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold">My Stories</h1>
          </div>
          <Button onClick={() => router.push('/framework')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Story
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        {stories.length === 0 ? (
          <div className="text-center py-12 lg:py-20">
            <h2 className="text-xl lg:text-2xl font-semibold mb-2">No stories yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first story to get started with StoryGenPro
            </p>
            <Button onClick={() => router.push('/framework')} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Story
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {stories.map((story) => {
              const completedBeats = story.beats.filter(beat => beat.completed).length
              const progress = (completedBeats / story.beats.length) * 100

              return (
                <Card key={story._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg lg:text-xl truncate">{story.title}</CardTitle>
                        <CardDescription className="text-sm">
                          Last edited {formatDate(story.lastEdited)}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs">{story.framework}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {completedBeats}/{story.beats.length} beats
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">Progress:</span>
                          <span className="text-sm font-medium">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <Button onClick={() => handleContinueStory(story)} className="w-full">
                        Continue Writing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
