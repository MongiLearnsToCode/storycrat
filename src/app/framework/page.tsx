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
import { Check, Save } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { saveLocalStory, generateLocalId } from "@/lib/local-storage"

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
  const { isSignedIn } = useAuth()
  
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

  const getFrameworkBeats = (framework: string) => {
    const frameworkData = frameworks.find(f => f.id === framework)
    if (!frameworkData) return []
    
    // Return appropriate beats based on framework
    switch (framework) {
      case 'hero-journey':
        return [
          { id: 'ordinary-world', title: 'The Ordinary World', description: 'Show the hero in their normal life before transformation begins.' },
          { id: 'call-to-adventure', title: 'The Call to Adventure', description: 'The hero is presented with a problem or challenge.' },
          { id: 'refusal-of-call', title: 'Refusal of the Call', description: 'The hero hesitates or refuses the adventure.' },
          { id: 'meeting-mentor', title: 'Meeting the Mentor', description: 'The hero encounters a wise figure who gives advice.' },
          { id: 'crossing-threshold', title: 'Crossing the First Threshold', description: 'The hero commits to the adventure and enters a new world.' },
          { id: 'tests-allies-enemies', title: 'Tests, Allies, and Enemies', description: 'The hero faces challenges and makes allies and enemies.' },
          { id: 'approach-inmost-cave', title: 'Approach to the Inmost Cave', description: 'The hero prepares for the major challenge in the special world.' },
          { id: 'ordeal', title: 'The Ordeal', description: 'The hero faces their greatest fear or most difficult challenge.' },
          { id: 'reward', title: 'Reward (Seizing the Sword)', description: 'The hero survives and gains something from the experience.' },
          { id: 'road-back', title: 'The Road Back', description: 'The hero begins the journey back to the ordinary world.' },
          { id: 'resurrection', title: 'The Resurrection', description: 'The hero faces a final test and is transformed.' },
          { id: 'return-with-elixir', title: 'Return with the Elixir', description: 'The hero returns home transformed with wisdom to help others.' }
        ]
      case 'three-act':
        return [
          { id: 'opening-image', title: 'Opening Image', description: 'A visual that represents the struggle & tone of the story.' },
          { id: 'inciting-incident', title: 'Inciting Incident', description: 'The event that sets the story in motion.' },
          { id: 'plot-point-1', title: 'Plot Point 1', description: 'The protagonist commits to or gets locked into the central conflict.' },
          { id: 'first-pinch-point', title: 'First Pinch Point', description: 'A reminder of the antagonistic force and its power.' },
          { id: 'midpoint', title: 'Midpoint', description: 'A major shift that changes the direction of the story.' },
          { id: 'second-pinch-point', title: 'Second Pinch Point', description: 'The antagonistic force shows its power again, raising stakes.' },
          { id: 'plot-point-2', title: 'Plot Point 2', description: 'The final piece of information needed for the climax.' },
          { id: 'climax', title: 'Climax', description: 'The final confrontation between protagonist and antagonist.' },
          { id: 'resolution', title: 'Resolution', description: 'The aftermath and new normal after the climax.' }
        ]
      case 'hauge-6-stage':
        return [
          { id: 'setup', title: 'Setup', description: 'Establish the character in their familiar situation, identity, and longing.' },
          { id: 'new-situation', title: 'New Situation', description: 'The character enters a new situation that creates inner conflict.' },
          { id: 'progress', title: 'Progress', description: 'The character makes progress toward their visible goal while avoiding their fear.' },
          { id: 'complications', title: 'Complications and Higher Stakes', description: 'Obstacles increase and the character must face their inner conflict.' },
          { id: 'final-push', title: 'Final Push', description: 'The character must risk everything and face their deepest fear.' },
          { id: 'aftermath', title: 'Aftermath', description: 'The character has achieved a new identity and found their essence.' }
        ]
      case 'story-circle':
        return [
          { id: 'you', title: 'YOU (Order)', description: 'Character in a zone of comfort.' },
          { id: 'need', title: 'NEED (Order)', description: 'But they want something.' },
          { id: 'go', title: 'GO (Order)', description: 'They enter an unfamiliar situation.' },
          { id: 'search', title: 'SEARCH (Chaos)', description: 'Adapt to that situation.' },
          { id: 'find', title: 'FIND (Chaos)', description: 'Find what they wanted.' },
          { id: 'take', title: 'TAKE (Chaos)', description: 'Pay a heavy price for it.' },
          { id: 'return', title: 'RETURN (Order)', description: 'Then return to their familiar situation.' },
          { id: 'change', title: 'CHANGE (Order)', description: 'Having changed.' }
        ]
      default:
        return []
    }
  }

  const handleCreateStory = async () => {
    if (!storyTitle.trim() || !selectedFramework) return

    setIsCreating(true)
    try {
      const beats = getFrameworkBeats(selectedFramework)
      const now = Date.now()
      
      if (isSignedIn) {
        // Create in Convex for signed-in users
        const storyId = await createStory({ 
          title: storyTitle.trim(),
          framework: selectedFramework
        })
        
        const newStory = {
          _id: storyId,
          title: storyTitle.trim(),
          framework: selectedFramework,
          beats: beats.map(beat => ({ ...beat, content: "", completed: false })),
          characters: [],
          createdAt: now,
          updatedAt: now,
          lastEdited: now
        }
        setCurrentStory(newStory)
      } else {
        // Create locally for guest users
        const localId = generateLocalId()
        const newStory = {
          _id: localId,
          title: storyTitle.trim(),
          framework: selectedFramework,
          beats: beats.map(beat => ({ ...beat, content: "", completed: false })),
          characters: [],
          createdAt: now,
          updatedAt: now,
          lastEdited: now
        }
        
        saveLocalStory(newStory)
        setCurrentStory(newStory)
      }
      
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
          <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 lg:mb-4">Create Your Story</h1>
          <p className="text-muted-foreground text-sm lg:text-base max-w-2xl mx-auto">
            Choose a proven storytelling framework and give your story a title to begin
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
          
          {!isSignedIn && storyTitle.trim() && selectedFramework && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground max-w-md mx-auto">
              <Save className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p>
                Your work will disappear when you close this tab or browser. <button 
                  onClick={() => router.push('/sign-in')} 
                  className="text-primary underline hover:no-underline"
                >
                  Sign up
                </button> to keep it safe and access it anytime.
              </p>
            </div>
          )}
          
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
