'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const ONBOARDING_KEY = 'storygenpro-onboarding-complete'

export function StoryOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const onboardingComplete = localStorage.getItem(ONBOARDING_KEY)
    if (!onboardingComplete) {
      setShowOnboarding(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setShowOnboarding(false)
  }

  if (!showOnboarding) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="relative bg-background rounded-xl max-w-3xl w-full p-8 shadow-2xl border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute top-4 right-4 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Welcome to the Story Editor!</h2>
          <p className="text-muted-foreground">Here’s a quick tour of your writing workspace.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">1. Story Structure</h3>
            <p className="text-sm text-muted-foreground">
              On the left, you’ll find the beats of your story. Click on any beat to start writing in it.
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-primary/10">
            <h3 className="font-semibold mb-2">2. Writing Area & AI</h3>
            <p className="text-sm text-muted-foreground">
              This is where your story comes to life. Use the ✨ button if you need a creative spark!
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">3. Characters</h3>
            <p className="text-sm text-muted-foreground">
              On the right, you can add and manage the characters in your story.
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <Button onClick={handleDismiss}>Got It, Let's Write!</Button>
        </div>
      </div>
    </div>
  )
}
