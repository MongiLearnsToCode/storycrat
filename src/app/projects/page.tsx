'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexStoryStore } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Story } from "@/lib/convex-store"
import { ArrowLeft, Plus, Grid3X3, List, Eye, Calendar, BookOpen } from "lucide-react"

export const dynamic = 'force-dynamic'

type ViewMode = 'grid' | 'list' | 'preview'

export default function ProjectsPage() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b p-3 lg:p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold">My Stories</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    )
  }

  return <ProjectsPageContent />
}

function ProjectsPageContent() {
  const router = useRouter()
  const stories = useQuery(api.stories.getStories)
  const setCurrentStory = useConvexStoryStore(state => state.setCurrentStory)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)

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

  if (stories === undefined) return <div>Loading...</div>
  if (!stories) return <div>Unable to load stories. Please check your connection.</div>

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b p-3 lg:p-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 lg:gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home
            </Button>
            <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold">My Stories</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-2"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-2"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'preview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('preview')}
                className="h-8 px-2"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => router.push('/framework')} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Story
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-6">
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
          <>
            {viewMode === 'grid' && (
              <div className="grid gap-4 lg:gap-6 md:grid-cols-2 xl:grid-cols-4">
                {stories.map((story) => {
                  const progress = getProgress(story)
                  const completedBeats = story.beats.filter(beat => beat.completed).length

                  return (
                    <Card key={story._id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg truncate">{story.title}</CardTitle>
                            <CardDescription className="text-sm">
                              {formatDate(story.lastEdited)}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="text-xs">{story.framework}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={() => handleContinueStory(story)} className="w-full" size="sm">
                          Continue Writing
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="space-y-2">
                {stories.map((story) => {
                  const progress = getProgress(story)
                  const completedBeats = story.beats.filter(beat => beat.completed).length

                  return (
                    <Card key={story._id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold truncate">{story.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(story.lastEdited)} • {story.framework}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-muted rounded-full h-1.5">
                                <div 
                                  className="bg-primary h-1.5 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground w-10 text-right">
                                {Math.round(progress)}%
                              </span>
                            </div>
                            <Button onClick={() => handleContinueStory(story)} size="sm">
                              Continue
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {viewMode === 'preview' && (
              <div className="flex gap-6 h-[calc(100vh-200px)]">
                <div className="w-80 space-y-2 overflow-y-auto">
                  {stories.map((story) => {
                    const progress = getProgress(story)
                    const isSelected = selectedStory?._id === story._id

                    return (
                      <Card 
                        key={story._id} 
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedStory(story)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <h3 className="font-semibold truncate">{story.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(story.lastEdited)}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div 
                                  className="bg-primary h-1.5 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(progress)}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
                
                <div className="flex-1 border-l pl-6">
                  {selectedStory ? (
                    <div className="h-full overflow-y-auto">
                      <div className="max-w-2xl mx-auto bg-white p-8 shadow-sm border rounded-lg">
                        <div className="mb-6">
                          <h1 className="text-2xl font-bold mb-2">{selectedStory.title}</h1>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Framework: {selectedStory.framework}</span>
                            <span>Last edited: {formatDate(selectedStory.lastEdited)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-6">
                          {selectedStory.beats.map((beat, index) => (
                            <div key={index} className="border-l-2 border-muted pl-4">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{beat.title}</h3>
                                {beat.completed && (
                                  <Badge variant="secondary" className="text-xs">Complete</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{beat.description}</p>
                              {beat.content && (
                                <div className="text-sm bg-muted/30 p-3 rounded">
                                  {beat.content.substring(0, 200)}
                                  {beat.content.length > 200 && '...'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-8 pt-6 border-t">
                          <Button onClick={() => handleContinueStory(selectedStory)} className="w-full">
                            Continue Writing This Story
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a story to preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
