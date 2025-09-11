import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal, type TemporalState } from 'zundo'
import { useStore } from 'zustand'

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
  act?: number
}

export interface Story {
  id: string
  title: string
  framework: string
  beats: StoryBeat[]
  characters: Character[]
  lastEdited: Date
}

interface StoryStore {
  stories: Story[]
  currentStory: Story | null
  currentBeatIndex: number
  
  createStory: (title: string) => void
  setCurrentStory: (story: Story) => void
  updateBeatContent: (beatId: string, content: string) => void
  addCharacter: (character: Omit<Character, 'id'>) => void
  setCurrentBeat: (index: number) => void
}

const heroJourneyBeats: Omit<StoryBeat, 'content' | 'completed'>[] = [
  { id: 'ordinary-world', title: 'Ordinary World', description: 'Show the hero in their normal life before transformation begins.' },
  { id: 'call-to-adventure', title: 'Call to Adventure', description: 'The hero is presented with a problem or challenge.' },
  { id: 'refusal-of-call', title: 'Refusal of the Call', description: 'The hero hesitates or refuses the adventure.' },
  { id: 'meeting-mentor', title: 'Meeting the Mentor', description: 'The hero encounters a wise figure who gives advice.' },
  { id: 'crossing-threshold', title: 'Crossing the Threshold', description: 'The hero commits to the adventure and enters a new world.' },
  { id: 'tests-allies-enemies', title: 'Tests, Allies & Enemies', description: 'The hero faces challenges and makes allies and enemies.' },
  { id: 'ordeal', title: 'The Ordeal', description: 'The hero faces their greatest fear or most difficult challenge.' },
  { id: 'reward', title: 'The Reward', description: 'The hero survives and gains something from the experience.' },
  { id: 'return-with-elixir', title: 'Return with the Elixir', description: 'The hero returns home transformed.' }
]

export const useStoryStore = create<StoryStore>()(
  temporal(
    persist(
      (set, get) => ({
        stories: [],
        currentStory: null,
        currentBeatIndex: 0,

        createStory: (title: string) => {
          const newStory: Story = {
            id: crypto.randomUUID(),
            title,
            framework: 'hero-journey',
            beats: heroJourneyBeats.map(beat => ({
              ...beat,
              content: '',
              completed: false
            })),
            characters: [],
            lastEdited: new Date()
          }
          
          set(state => ({
            stories: [...state.stories, newStory],
            currentStory: newStory,
            currentBeatIndex: 0
          }))
        },

        setCurrentStory: (story: Story) => {
          set({ currentStory: story, currentBeatIndex: 0 })
        },

        updateBeatContent: (beatId: string, content: string) => {
          const { currentStory } = get()
          if (!currentStory) return

          const updatedBeats = currentStory.beats.map(beat =>
            beat.id === beatId 
              ? { ...beat, content, completed: content.trim().length > 0 }
              : beat
          )

          const updatedStory = {
            ...currentStory,
            beats: updatedBeats,
            lastEdited: new Date()
          }

          set(state => ({
            currentStory: updatedStory,
            stories: state.stories.map(s => s.id === updatedStory.id ? updatedStory : s)
          }))
        },

        addCharacter: (character: Omit<Character, 'id'>) => {
          const { currentStory } = get()
          if (!currentStory) return

          const newCharacter: Character = {
            ...character,
            id: crypto.randomUUID()
          }

          const updatedStory = {
            ...currentStory,
            characters: [...currentStory.characters, newCharacter],
            lastEdited: new Date()
          }

          set(state => ({
            currentStory: updatedStory,
            stories: state.stories.map(s => s.id === updatedStory.id ? updatedStory : s)
          }))
        },

        setCurrentBeat: (index: number) => {
          set({ currentBeatIndex: index })
        }
      }),
      {
        name: 'story-storage'
      }
    )
  )
)

export const useTemporalStoryStore = <T,>(selector: (state: TemporalState<Pick<StoryStore, 'currentStory' | 'stories'>>) => T) => {
  return useStore(useStoryStore.temporal, selector)
}
