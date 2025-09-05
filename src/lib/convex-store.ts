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
  _id: Id<"stories"> | string // Support both Convex IDs and local string IDs
  title: string
  framework: string
  beats: StoryBeat[]
  characters: Character[]
  lastEdited: number
  createdAt?: number
  updatedAt?: number
  userId?: string
}

interface ConvexStoryStore {
  currentStory: Story | null
  currentBeatIndex: number
  
  setCurrentStory: (story: Story) => void
  setCurrentBeat: (index: number) => void
  updateBeatContent: (content: string) => void
  addCharacter: (character: Character) => void
  updateCharacter: (character: Character) => void
  deleteCharacter: (characterId: string) => void
  updateTitle: (title: string) => void
  clearCurrentStory: () => void
}

export const useConvexStoryStore = create<ConvexStoryStore>((set, get) => ({
  currentStory: null,
  currentBeatIndex: 0,

  setCurrentStory: (story: Story) => {
    set({ currentStory: story, currentBeatIndex: 0 })
  },

  setCurrentBeat: (index: number) => {
    set({ currentBeatIndex: index })
  },

  updateBeatContent: (content: string) => {
    const { currentStory, currentBeatIndex } = get()
    if (currentStory) {
      const newBeats = [...currentStory.beats]
      newBeats[currentBeatIndex] = {
        ...newBeats[currentBeatIndex],
        content,
        completed: content.trim().length > 0,
      }
      set({
        currentStory: {
          ...currentStory,
          beats: newBeats,
          lastEdited: Date.now(),
        },
      })
    }
  },

  addCharacter: (character: Character) => {
    const { currentStory } = get()
    if (currentStory) {
      set({
        currentStory: {
          ...currentStory,
          characters: [...currentStory.characters, character],
          lastEdited: Date.now(),
        },
      })
    }
  },

  updateCharacter: (character: Character) => {
    const { currentStory } = get()
    if (currentStory) {
      const updatedCharacters = currentStory.characters.map(c => c.id === character.id ? character : c)
      set({
        currentStory: {
          ...currentStory,
          characters: updatedCharacters,
          lastEdited: Date.now(),
        },
      })
    }
  },

  deleteCharacter: (characterId: string) => {
    const { currentStory } = get()
    if (currentStory) {
      const updatedCharacters = currentStory.characters.filter(c => c.id !== characterId)
      set({
        currentStory: {
          ...currentStory,
          characters: updatedCharacters,
          lastEdited: Date.now(),
        },
      })
    }
  },

  updateTitle: (title: string) => {
    const { currentStory } = get()
    if (currentStory) {
      set({
        currentStory: {
          ...currentStory,
          title,
          lastEdited: Date.now(),
        },
      })
    }
  },

  clearCurrentStory: () => {
    set({ currentStory: null, currentBeatIndex: 0 })
  }
}))