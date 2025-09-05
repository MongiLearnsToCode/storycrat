'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexStoryStore } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { Story } from "@/lib/convex-store"
import { ArrowLeft, Plus, BookOpen, Search } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function ProjectsPage() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return <ProjectsContent />
}

function ProjectsContent() {
  const router = useRouter()
  const stories = useQuery(api.stories.getStories)
  const setCurrentStory = useConvexStoryStore(state => state.setCurrentStory)
  const [searchQuery, setSearchQuery] = useState("")

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

  const getProgress = (story: Story) => {
    const completedBeats = story.beats.filter(beat => beat.completed).length
    return (completedBeats / story.beats.length) * 100
  }

  const filteredStories = useMemo(() => {
    if (!stories || !searchQuery.trim()) return stories || []
    
    return stories.filter(story =>
      story.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [stories, searchQuery])

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">All Stories</h1>
          </div>
          <Button onClick={() => router.push('/framework')}>
            <Plus className="h-4 w-4 mr-2" />
            New Story
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {stories.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-3">No stories yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first story to get started with StoryGenPro
            </p>
            <Button size="lg" onClick={() => router.push('/framework')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Story
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                {filteredStories.length} of {stories.length} {stories.length === 1 ? 'story' : 'stories'}
              </p>
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredStories.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No stories found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredStories.map((story) => {
                  const progress = getProgress(story)
                  const completedBeats = story.beats.filter(beat => beat.completed).length

                  return (
                    <Card key={story._id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-lg line-clamp-2 flex-1">{story.title}</CardTitle>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {story.framework}
                          </Badge>
                        </div>
                        <CardDescription>
                          Last edited {formatDate(story.lastEdited)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
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
                          <div className="text-sm text-muted-foreground">
                            {completedBeats} of {story.beats.length} beats completed
                          </div>
                          <Button 
                            onClick={() => handleContinueStory(story)} 
                            className="w-full"
                            variant="secondary"
                          >
                            Continue Writing
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
