'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexStoryStore } from "@/lib/convex-store"

export default function FrameworkPage() {
  const router = useRouter()
  const [storyTitle, setStoryTitle] = useState("")
  const createStory = useMutation(api.stories.createStory)
  const setCurrentStory = useConvexStoryStore(state => state.setCurrentStory)

  const handleStartStory = async () => {
    if (!storyTitle.trim()) return
    const storyId = await createStory({ title: storyTitle })
    
    // Create story object for local state
    const newStory = {
      _id: storyId,
      title: storyTitle,
      framework: "hero-journey",
      beats: [
        { id: 'ordinary-world', title: 'Ordinary World', description: 'Show the hero in their normal life before transformation begins.', content: '', completed: false },
        { id: 'call-to-adventure', title: 'Call to Adventure', description: 'The hero is presented with a problem or challenge.', content: '', completed: false },
        { id: 'refusal-of-call', title: 'Refusal of the Call', description: 'The hero hesitates or refuses the adventure.', content: '', completed: false },
        { id: 'meeting-mentor', title: 'Meeting the Mentor', description: 'The hero encounters a wise figure who gives advice.', content: '', completed: false },
        { id: 'crossing-threshold', title: 'Crossing the Threshold', description: 'The hero commits to the adventure and enters a new world.', content: '', completed: false },
        { id: 'tests-allies-enemies', title: 'Tests, Allies & Enemies', description: 'The hero faces challenges and makes allies and enemies.', content: '', completed: false },
        { id: 'ordeal', title: 'The Ordeal', description: 'The hero faces their greatest fear or most difficult challenge.', content: '', completed: false },
        { id: 'reward', title: 'The Reward', description: 'The hero survives and gains something from the experience.', content: '', completed: false },
        { id: 'return-with-elixir', title: 'Return with the Elixir', description: 'The hero returns home transformed.', content: '', completed: false }
      ],
      characters: [],
      lastEdited: Date.now()
    }
    
    setCurrentStory(newStory)
    router.push('/story')
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-5xl mx-auto py-6 lg:py-12">
        <div className="text-center mb-8 lg:mb-12">
          <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 lg:mb-4">Choose Your Framework</h1>
          <p className="text-muted-foreground text-sm lg:text-base max-w-2xl mx-auto">Select a storytelling structure to guide your writing</p>
        </div>

        <div className="mb-8 lg:mb-12 max-w-2xl mx-auto">
          <Label htmlFor="title" className="text-base lg:text-lg font-medium">Story Title</Label>
          <Input
            id="title"
            placeholder="Enter your story title..."
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            className="mt-2 lg:mt-3 text-base lg:text-lg h-12 lg:h-14"
          />
        </div>

        <div className="grid gap-6 lg:gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          <Card className="border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-4 lg:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                Hero&apos;s Journey
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Available</span>
              </CardTitle>
              <CardDescription className="text-sm lg:text-base">
                The classic monomyth structure used in countless stories from Star Wars to Harry Potter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 lg:space-y-6">
              <ul className="text-sm lg:text-base text-muted-foreground space-y-2">
                <li>• 9 structured story beats</li>
                <li>• Character transformation arc</li>
                <li>• Proven narrative framework</li>
              </ul>
              <Button 
                className="w-full h-12 lg:h-14 text-base lg:text-lg" 
                onClick={handleStartStory}
                disabled={!storyTitle.trim()}
              >
                Select Hero&apos;s Journey
              </Button>
            </CardContent>
          </Card>

          <Card className="opacity-60 hover:opacity-70 transition-opacity">
            <CardHeader className="pb-4 lg:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                Three-Act Structure
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Coming Soon</span>
              </CardTitle>
              <CardDescription className="text-sm lg:text-base">
                Classic beginning, middle, and end structure for screenplays and novels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 lg:space-y-6">
              <ul className="text-sm lg:text-base text-muted-foreground space-y-2">
                <li>• Setup, confrontation, resolution</li>
                <li>• Industry standard format</li>
                <li>• Flexible story pacing</li>
              </ul>
              <Button className="w-full h-12 lg:h-14 text-base lg:text-lg" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 lg:mt-12 text-center">
          <Button variant="outline" onClick={() => router.push('/')} className="h-12 lg:h-14 px-6 lg:px-8">
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
