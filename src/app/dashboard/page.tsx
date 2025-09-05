'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexStoryStore } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { useState, useMemo } from "react"
import { Story } from "@/lib/convex-store"
import { BookOpen, Plus, Trash2, MoreVertical, Search, FileText, BarChart3 } from "lucide-react"
import { Id } from "../../../convex/_generated/dataModel"
import { deleteLocalStory } from "@/lib/local-storage"
import { useAuth, useUser } from "@clerk/nextjs"
import { DeleteStoryDialog } from "@/components/delete-story-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const stories = useQuery(api.stories.getStories)
  const { user } = useUser()

  if (stories === undefined) {
    return <DashboardLoadingSkeleton />
  }

  if (stories.length === 0) {
    return <EmptyDashboard />
  }

  return <DashboardContent stories={stories} userName={user?.firstName || 'Writer'} />
}

function DashboardContent({ stories, userName }: { stories: Story[], userName: string }) {
  const router = useRouter()
  const setCurrentStory = useConvexStoryStore(state => state.setCurrentStory)
  const deleteStoryMutation = useMutation(api.stories.deleteStory)
  const { isSignedIn } = useAuth()
  
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; story: Story | null }>({
    open: false,
    story: null
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const handleContinueStory = (story: Story) => {
    setCurrentStory(story)
    router.push('/story')
  }

  const handleDeleteClick = (story: Story, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteDialog({ open: true, story })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.story) return
    
    setIsDeleting(true)
    try {
      const storyId = deleteDialog.story._id
      
      if (typeof storyId === 'string' && storyId.startsWith('local_')) {
        deleteLocalStory(storyId)
      } else if (isSignedIn) {
        await deleteStoryMutation({ storyId: storyId as Id<"stories"> })
      }
      
      setDeleteDialog({ open: false, story: null })
    } catch (error) {
      console.error('Failed to delete story:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const recentStories = useMemo(() => stories.slice(0, 6), [stories])
  const filteredStories = useMemo(() =>
    stories.filter(story =>
      story.title.toLowerCase().includes(searchTerm.toLowerCase())
    ), [stories, searchTerm]
  )

  const totalWords = useMemo(() => 
    stories.reduce((acc, story) => 
      acc + story.beats.reduce((beatAcc, beat) => beatAcc + (beat.content?.split(/\s+/).filter(Boolean).length || 0), 0)
    , 0), [stories])

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 mb-8">
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Welcome back, {userName}!</CardTitle>
            <CardDescription>
              Here&apos;s a quick overview of your creative work.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <FileText className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{stories.length}</p>
              <p className="text-xs text-muted-foreground">Stories</p>
            </div>
            <div className="text-center">
              <BarChart3 className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{totalWords.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Words</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recent">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <TabsList>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="all">All Stories</TabsTrigger>
          </TabsList>
          <div className="w-full sm:w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter stories..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => router.push('/framework')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Story
          </Button>
        </div>
        <TabsContent value="recent">
          <StoryGrid 
            stories={recentStories} 
            onContinue={handleContinueStory} 
            onDelete={handleDeleteClick} 
          />
        </TabsContent>
        <TabsContent value="all">
          <StoryGrid 
            stories={filteredStories} 
            onContinue={handleContinueStory} 
            onDelete={handleDeleteClick} 
          />
        </TabsContent>
      </Tabs>
      
      <DeleteStoryDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, story: deleteDialog.story })}
        storyTitle={deleteDialog.story?.title || ""}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </main>
  )
}

function StoryGrid({ stories, onContinue, onDelete }: { stories: Story[], onContinue: (story: Story) => void, onDelete: (story: Story, e: React.MouseEvent) => void }) {
  const getFrameworkDisplayName = (frameworkId: string) => {
    const frameworkMap: { [key: string]: string } = {
      'hero-journey': "Hero's Journey",
      'three-act': "Three-Act Structure",
      'hauge-6-stage': "6-Stage Structure",
      'story-circle': "Story Circle"
    }
    return frameworkMap[frameworkId] || "Custom"
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stories.map((story) => {
        const completedBeats = story.beats.filter(beat => beat.completed).length
        const progress = (completedBeats / story.beats.length) * 100
        const lastEdited = new Date(story.lastEdited).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

        return (
          <Card key={story._id} className="hover:shadow-lg transition-shadow group flex flex-col">
            <CardHeader className="flex-grow cursor-pointer" onClick={() => onContinue(story)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2 mb-2">{story.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{getFrameworkDisplayName(story.framework)}</Badge>
                    <CardDescription>
                      {lastEdited}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => onDelete(story, e)} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="cursor-pointer" onClick={() => onContinue(story)}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-muted rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {completedBeats}/{story.beats.length}
                </span>
              </div>
              <Button variant="outline" className="w-full">
                Continue Writing
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function EmptyDashboard() {
  const router = useRouter()
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center py-20">
        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
        <h2 className="text-2xl font-semibold mb-3">Your Dashboard is Empty</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          It looks like you haven&apos;t created any stories yet. Let&apos;s change that.
        </p>
        <Button size="lg" onClick={() => router.push('/framework')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Story
        </Button>
      </div>
    </div>
  )
}

function DashboardLoadingSkeleton() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 mb-8">
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <Skeleton className="h-6 w-6 mx-auto mb-2 rounded-full" />
              <Skeleton className="h-7 w-12 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto mt-1" />
            </div>
            <div className="text-center">
              <Skeleton className="h-6 w-6 mx-auto mb-2 rounded-full" />
              <Skeleton className="h-7 w-12 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}