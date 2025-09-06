'use client'

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@clerk/nextjs"
import { Book, Bot, Briefcase, Plus, Users, TrendingUp, FileText, Trophy } from "lucide-react"
import Link from "next/link"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Story, Character } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { useConvexStoryStore } from "@/lib/convex-store"
import { CharacterDialog } from "@/components/character-dialog"
import { CharacterGalleryModal } from "@/components/character-gallery-modal"
import { useState } from "react"
import { Id } from "../../../convex/_generated/dataModel"

export default function DashboardPage() {
  const { user } = useUser()
  const stories = useQuery(api.stories.getStories)
  const router = useRouter()
  const setCurrentStory = useConvexStoryStore(state => state.setCurrentStory)
  
  const [isGalleryOpen, setGalleryOpen] = useState(false)
  const [isCharacterDialogOpen, setCharacterDialogOpen] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)

  const addCharacterMutation = useMutation(api.stories.addCharacter)
  const updateCharacterMutation = useMutation(api.stories.updateCharacter)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const handleContinueStory = (story: Story) => {
    setCurrentStory(story)
    router.push('/story')
  }

  const activeStory = stories && stories.length > 0 ? stories[0] : null

  const handleSaveCharacter = async (characterData: Omit<Character, 'id'>) => {
    if (!activeStory) return;

    if (editingCharacter) {
      await updateCharacterMutation({
        storyId: activeStory._id as Id<"stories">,
        characterId: editingCharacter.id,
        ...characterData
      });
    } else {
      await addCharacterMutation({
        storyId: activeStory._id as Id<"stories">,
        ...characterData
      });
    }
    setEditingCharacter(null)
  };

  const handleAddCharacterClick = () => {
    setEditingCharacter(null)
    setCharacterDialogOpen(true)
  }

  const handleEditCharacterClick = (character: Character) => {
    setEditingCharacter(character)
    setCharacterDialogOpen(true)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <p className="text-sm text-muted-foreground">{today.replace(/,/g, '')}</p>
          <h2 className="text-3xl font-bold tracking-tight">{getGreeting()}, {user?.firstName || 'User'}</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => router.push('/framework')}>
            <Plus className="h-4 w-4 mr-2" />
            New Story
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeStory && <ActiveStorySnapshot story={activeStory} onContinue={handleContinueStory} />}
        {stories && <ProjectWideInsights stories={stories} />}
        <CharacterDirectory characters={activeStory?.characters || []} onManageClick={() => setGalleryOpen(true)} />
        <FrameworkExplorer />
      </div>
      
      <CharacterGalleryModal
        open={isGalleryOpen}
        onOpenChange={setGalleryOpen}
        characters={activeStory?.characters || []}
        onAddCharacter={handleAddCharacterClick}
        onEditCharacter={handleEditCharacterClick}
      >
        {/* This is the trigger, but we trigger it from the CharacterDirectory card, so this can be empty */}
        <div />
      </CharacterGalleryModal>

      <CharacterDialog
        open={isCharacterDialogOpen}
        onOpenChange={setCharacterDialogOpen}
        onSave={handleSaveCharacter}
        character={editingCharacter}
      />
    </div>
  )
}

function ActiveStorySnapshot({ story, onContinue }: { story: Story, onContinue: (story: Story) => void }) {
  const completedBeats = story.beats.filter(beat => beat.completed).length
  const progress = (completedBeats / story.beats.length) * 100

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Briefcase className="h-4 w-4 mr-2 text-primary" />
          Active Story Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <h3 className="text-2xl font-bold">{story.title}</h3>
        <p className="text-xs text-muted-foreground">Last edited: {new Date(story.lastEdited).toLocaleDateString()}</p>
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 bg-muted rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {completedBeats}/{story.beats.length} Beats
          </span>
        </div>
        <Button onClick={() => onContinue(story)}>Continue Writing</Button>
      </CardContent>
    </Card>
  )
}

function ProjectWideInsights({ stories }: { stories: Story[] }) {
  const totalWords = stories.reduce((acc, story) =>
    acc + story.beats.reduce((beatAcc, beat) => beatAcc + (beat.content?.split(/\s+/).filter(Boolean).length || 0), 0)
    , 0)

  const completedStories = stories.filter(story => story.beats.every(beat => beat.completed)).length

  const frameworkCounts = stories.reduce((acc, story) => {
    acc[story.framework] = (acc[story.framework] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const mostUsedFramework = Object.keys(frameworkCounts).reduce((a, b) => frameworkCounts[a] > frameworkCounts[b] ? a : b, '')
  const frameworkMap: { [key: string]: string } = {
      'hero-journey': "Hero's Journey",
      'three-act': "Three-Act Structure",
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <TrendingUp className="h-4 w-4 mr-2 text-primary" />
          Project-Wide Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center">
          <FileText className="h-4 w-4 mr-3 text-muted-foreground" />
          <p className="text-sm">Total Word Count: <span className="font-semibold">{totalWords.toLocaleString()}</span></p>
        </div>
        <div className="flex items-center">
          <Trophy className="h-4 w-4 mr-3 text-muted-foreground" />
          <p className="text-sm">Stories Completed: <span className="font-semibold">{completedStories}</span></p>
        </div>
        <div className="flex items-center">
          <Book className="h-4 w-4 mr-3 text-muted-foreground" />
          <p className="text-sm">Most Used Framework: <span className="font-semibold">{frameworkMap[mostUsedFramework] || mostUsedFramework}</span></p>
        </div>
      </CardContent>
    </Card>
  )
}

function CharacterDirectory({ characters, onManageClick }: { characters: Character[], onManageClick: () => void }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    Character Directory
                </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground pt-6">
                <div className="flex justify-center space-x-2 mb-4">
                    {characters.slice(0, 4).map(char => (
                        <Avatar key={char.id}>
                            <AvatarFallback>{char.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                    ))}
                </div>
                <Button variant="outline" size="sm" onClick={onManageClick}>
                    Manage Characters
                </Button>
            </CardContent>
        </Card>
    )
}

function FrameworkExplorer() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                    <Bot className="h-4 w-4 mr-2 text-primary" />
                    Framework Explorer
                </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground pt-6">
                <p className="text-sm font-semibold">Framework of the Week</p>
                <p className="text-lg font-bold mt-2">Three-Act Structure</p>
                <p className="text-xs mt-1">A classic narrative arc for compelling stories.</p>
                <Link href="/framework" passHref>
                    <Button variant="secondary" size="sm" className="mt-4">
                        Learn More
                    </Button>
                </Link>
            </CardContent>
        </Card>
    )
}
