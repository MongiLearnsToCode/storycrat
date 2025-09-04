'use client'

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useStoryStore } from "@/lib/store"

export default function LandingPage() {
  const router = useRouter()
  const stories = useStoryStore(state => state.stories)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            StoryGenPro
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Structured storytelling with AI assistance. Turn your ideas into complete stories using proven frameworks.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 rounded-xl"
            onClick={() => router.push('/framework')}
          >
            Start Writing
          </Button>
          
          {stories.length > 0 && (
            <Button 
              variant="outline"
              size="lg" 
              className="text-lg px-8 py-6 rounded-xl"
              onClick={() => router.push('/projects')}
            >
              My Stories ({stories.length})
            </Button>
          )}
        </div>
        
        <div className="pt-8 text-sm text-muted-foreground">
          <p>• Guided by the Hero's Journey framework</p>
          <p>• AI-powered suggestions for each story beat</p>
          <p>• Auto-save your progress</p>
        </div>
      </div>
    </div>
  )
}
