'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useConvexStoryStore } from "@/lib/convex-store"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Check } from "lucide-react"

export const dynamic = 'force-dynamic'

const frameworks = [
  {
    id: 'hero-journey',
    title: "Hero's Journey",
    description: "Joseph Campbell's classic monomyth structure with 12 stages",
    stages: 12,
    bestFor: "Epic adventures, personal transformation stories"
  },
  {
    id: 'three-act',
    title: "Three-Act Structure",
    description: "Traditional dramatic structure with setup, confrontation, and resolution",
    stages: 9,
    bestFor: "Screenplays, novels, most commercial fiction"
  },
  {
    id: 'hauge-6-stage',
    title: "Michael Hauge's 6 Stage Structure",
    description: "Character-driven structure focusing on identity and essence",
    stages: 6,
    bestFor: "Character-driven stories, romance, personal growth"
  },
  {
    id: 'story-circle',
    title: "Dan Harmon's Story Circle",
    description: "Simplified hero's journey based on order vs. chaos",
    stages: 8,
    bestFor: "TV episodes, comedy, ensemble stories"
  }
]

export default function FrameworkPage() {
  const router = useRouter()
  const [storyTitle, setStoryTitle] = useState("")
  const [selectedFramework, setSelectedFramework] = useState("")
  const [isClient, setIsClient] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { clearCurrentStory, setCurrentStory } = useConvexStoryStore()
  const createStory = useMutation(api.stories.createStory)
  
  useEffect(() => {
    setIsClient(true)
    clearCurrentStory()
  }, [clearCurrentStory])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-6">
        <div className="max-w-5xl mx-auto py-6 lg:py-12">
          <div className="text-center mb-8 lg:mb-12">
            <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 lg:mb-4">Choose Your Framework</h1>
            <p className="text-muted-foreground text-sm lg:text-base max-w-2xl mx-auto">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleCreateStory = async () => {
    if (!storyTitle.trim() || !selectedFramework) return

    setIsCreating(true)
    try {
      const storyId = await createStory({ 
        title: storyTitle.trim(),
        framework: selectedFramework
      })
      
      const newStory = {
        _id: storyId,
        title: storyTitle.trim(),
        framework: selectedFramework,
        beats: [],
        characters: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastEdited: Date.now()
      }
      setCurrentStory(newStory)
      
      router.push('/story')
    } catch (error) {
      console.error('Failed to create story:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-5xl mx-auto py-6 lg:py-12">
        <div className="text-center mb-8 lg:mb-12">
          <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 lg:mb-4">Choose Your Framework</h1>
          <p className="text-muted-foreground text-sm lg:text-base max-w-2xl mx-auto">
            Select a proven storytelling structure to guide your writing process
          </p>
        </div>

        <div className="mb-8 lg:mb-12 max-w-2xl mx-auto">
          <Label htmlFor="title" className="text-base lg:text-lg font-medium">Story Title</Label>
          <Input
            id="title"
            placeholder="Enter your story title..."
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            className="mt-2 lg:mt-3 text-base lg:text-lg h-12 lg:h-14"
            disabled={isCreating}
          />
        </div>

        <div className="grid gap-6 lg:gap-8 md:grid-cols-2 max-w-6xl mx-auto mb-8">
          {frameworks.map((framework) => (
            <Card 
              key={framework.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedFramework === framework.id 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : ''
              }`}
              onClick={() => setSelectedFramework(framework.id)}
            >
              <CardHeader className="pb-4 lg:pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg lg:text-xl">{framework.title}</CardTitle>
                  {selectedFramework === framework.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <CardDescription className="text-sm lg:text-base">
                  {framework.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stages:</span>
                    <span className="font-medium">{framework.stages}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Best for:</span>
                    <p className="text-sm mt-1">{framework.bestFor}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center space-y-4">
          <Button 
            className="h-12 lg:h-14 px-8 text-base lg:text-lg" 
            onClick={handleCreateStory}
            disabled={!storyTitle.trim() || !selectedFramework || isCreating}
          >
            {isCreating ? 'Creating...' : 'Start Writing'}
          </Button>
          
          <div>
            <Button variant="outline" onClick={() => router.push('/')} className="h-12 lg:h-14 px-6 lg:px-8">
              ← Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
