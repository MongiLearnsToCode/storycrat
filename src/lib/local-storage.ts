import { Story } from "./convex-store"

const LOCAL_STORIES_KEY = 'storycrat_local_stories'

export function getLocalStories(): Story[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(LOCAL_STORIES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveLocalStory(story: Story): void {
  if (typeof window === 'undefined') return
  
  const stories = getLocalStories()
  const existingIndex = stories.findIndex(s => s._id === story._id)
  
  if (existingIndex >= 0) {
    stories[existingIndex] = story
  } else {
    stories.push(story)
  }
  
  localStorage.setItem(LOCAL_STORIES_KEY, JSON.stringify(stories))
}

export function deleteLocalStory(storyId: string): void {
  if (typeof window === 'undefined') return
  
  const stories = getLocalStories().filter(s => s._id !== storyId)
  localStorage.setItem(LOCAL_STORIES_KEY, JSON.stringify(stories))
}

export function clearLocalStories(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LOCAL_STORIES_KEY)
}

export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
