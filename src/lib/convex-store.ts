import { create } from 'zustand'
import { Id } from '../../convex/_generated/dataModel'

export interface Character {
  id: string
  name: string
  role: string
  description: string
}

export interface StoryBeat {
  id: string
  title: string
  description: string
  content: string
  completed: boolean
}

export interface Story {
  _id: Id<"stories">
  title: string
  framework: string
  beats: StoryBeat[]
  characters: Character[]
  lastEdited: number
}

interface ConvexStoryStore {
  currentStory: Story | null
  currentBeatIndex: number
  
  setCurrentStory: (story: Story) => void
  setCurrentBeat: (index: number) => void
  clearCurrentStory: () => void
}

export const useConvexStoryStore = create<ConvexStoryStore>((set) => ({
  currentStory: null,
  currentBeatIndex: 0,

  setCurrentStory: (story: Story) => {
    set({ currentStory: story, currentBeatIndex: 0 })
  },

  setCurrentBeat: (index: number) => {
    set({ currentBeatIndex: index })
  },

  clearCurrentStory: () => {
    set({ currentStory: null, currentBeatIndex: 0 })
  }
}))
