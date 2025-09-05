'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { saveLocalStory } from "@/lib/local-storage"
import { useAuth } from "@clerk/nextjs"
import { Id } from "../../../convex/_generated/dataModel"
import { useConvexStoryStore, Character } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { getSuggestion } from "@/lib/ai-suggestions"
import { exportToTxt, exportToPdf } from "@/lib/export-utils"
import { Sparkles, Users, ArrowLeft, X, RefreshCw, Download, FileText, FileImage, Plus, Trash2, Edit } from "lucide-react"
import { StoryOnboarding } from "@/components/onboarding"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export const dynamic = 'force-dynamic'

export default function StoryPage() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b p-3 lg:p-4">
          <div className="max-w-[1600px] mx-auto">
            <h1 className="text-lg lg:text-xl xl:text-2xl font-bold">Loading...</h1>
          </div>
        </div>
      </div>
    )
  }

  return <StoryPageContent />
}

function StoryPageContent() {
  const router = useRouter()
  const { 
    currentStory, 
    currentBeatIndex, 
    setCurrentBeat,
    updateBeatContent: updateLocalBeatContent,
    addCharacter: addLocalCharacter,
    updateCharacter: updateLocalCharacter,
    deleteCharacter: deleteLocalCharacter,
    updateTitle: updateLocalTitle,
    setCurrentStory
  } = useConvexStoryStore()
  
  const updateBeatContentMutation = useMutation(api.stories.updateBeatContent)
  const addCharacterMutation = useMutation(api.stories.addCharacter)
  const updateCharacterMutation = useMutation(api.stories.updateCharacter)
  const deleteCharacterMutation = useMutation(api.stories.deleteCharacter)
  const updateStoryTitleMutation = useMutation(api.stories.updateStoryTitle)
  const createStoryMutation = useMutation(api.stories.createStory)
  
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null)
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false)
  const [currentSuggestion, setCurrentSuggestion] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isCreatingStory, setIsCreatingStory] = useState(false)

  const debouncedStory = useDebounce(currentStory, 500)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const title = urlParams.get('title')
    
    if (title && !currentStory) {
      setIsCreatingStory(true)
      createStoryMutation({ title, framework: "hero-journey" })
        .then(storyId => {
          const newStory = {
            _id: storyId,
            title,
            framework: "hero-journey",
            beats: [
              { id: 'ordinary-world', title: 'The Ordinary World', description: 'Show the hero in their normal life before transformation begins.', content: '', completed: false },
              { id: 'call-to-adventure', title: 'The Call to Adventure', description: 'The hero is presented with a problem or challenge.', content: '', completed: false },
              { id: 'refusal-of-call', title: 'Refusal of the Call', description: 'The hero hesitates or refuses the adventure.', content: '', completed: false },
              { id: 'meeting-mentor', title: 'Meeting the Mentor', description: 'The hero encounters a wise figure who gives advice.', content: '', completed: false },
              { id: 'crossing-threshold', title: 'Crossing the First Threshold', description: 'The hero commits to the adventure and enters a new world.', content: '', completed: false },
              { id: 'tests-allies-enemies', title: 'Tests, Allies, and Enemies', description: 'The hero faces challenges and makes allies and enemies.', content: '', completed: false },
              { id: 'approach-inmost-cave', title: 'Approach to the Inmost Cave', description: 'The hero prepares for the major challenge in the special world.', content: '', completed: false },
              { id: 'ordeal', title: 'The Ordeal', description: 'The hero faces their greatest fear or most difficult challenge.', content: '', completed: false },
              { id: 'reward', title: 'Reward (Seizing the Sword)', description: 'The hero survives and gains something from the experience.', content: '', completed: false },
              { id: 'road-back', title: 'The Road Back', description: 'The hero begins the journey back to the ordinary world.', content: '', completed: false },
              { id: 'resurrection', title: 'The Resurrection', description: 'The hero faces a final test and is transformed.', content: '', completed: false },
              { id: 'return-with-elixir', title: 'Return with the Elixir', description: 'The hero returns home transformed with wisdom to help others.', content: '', completed: false }
            ],
            characters: [],
            lastEdited: Date.now()
          }
          setCurrentStory(newStory)
          router.replace('/story')
        })
        .catch(error => {
          console.error('Failed to create story:', error)
          router.push('/framework')
        })
        .finally(() => setIsCreatingStory(false))
    } else if (!currentStory && !title) {
      router.push('/framework')
    }
  }, [currentStory, createStoryMutation, setCurrentStory, router])

  const { isSignedIn } = useAuth()

  useEffect(() => {
    if (debouncedStory) {
      setIsSaving(true)
      const { _id, beats, title, characters } = debouncedStory
      const currentBeat = beats[currentBeatIndex]
      
      if (typeof _id === 'string' && _id.startsWith('local_')) {
        const updatedStory = { ...debouncedStory, lastEdited: Date.now() }
        saveLocalStory(updatedStory)
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 2000)
        setIsSaving(false)
      } else if (isSignedIn) {
        Promise.all([
          updateBeatContentMutation({ 
            storyId: _id as Id<"stories">, 
            beatId: currentBeat.id, 
            content: currentBeat.content 
          }),
          updateStoryTitleMutation({ storyId: _id as Id<"stories">, title }),
        ]).then(() => {
          setIsSaved(true)
          setTimeout(() => setIsSaved(false), 2000)
        }).finally(() => setIsSaving(false))
      }
    }
  }, [debouncedStory, currentBeatIndex, updateBeatContentMutation, updateStoryTitleMutation, isSignedIn])

  if (isCreatingStory || !currentStory) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Creating your story...</p>
        </div>
      </div>
    )
  }

  const currentBeat = currentStory.beats[currentBeatIndex]

  const handleBeatChange = (newBeatIndex: number) => {
    setCurrentBeat(newBeatIndex)
  }

  const completedBeats = currentStory.beats.filter(beat => beat.completed).length
  const progress = (completedBeats / currentStory.beats.length) * 100

  const handleUpdateBeatContent = (content: string) => {
    updateLocalBeatContent(content)
  }

  const handleTitleChange = (newTitle: string) => {
    updateLocalTitle(newTitle)
  }

  const handleNextBeat = () => {
    handleBeatChange(currentBeatIndex + 1)
  }

  const handleOpenCharacterDialog = (character: Character | null = null) => {
    setEditingCharacter(character)
    setIsCharacterDialogOpen(true)
  }

  const handleSaveCharacter = (characterData: Omit<Character, 'id'>) => {
    if (currentStory) {
      if (editingCharacter) {
        const updatedCharacter = { ...editingCharacter, ...characterData }
        updateLocalCharacter(updatedCharacter)
        if (isSignedIn && typeof currentStory._id !== 'string') {
          updateCharacterMutation({ storyId: currentStory._id as Id<"stories">, ...updatedCharacter })
        }
      } else {
        const newCharacter = { ...characterData, id: crypto.randomUUID() }
        addLocalCharacter(newCharacter)
        if (isSignedIn && typeof currentStory._id !== 'string') {
          addCharacterMutation({ storyId: currentStory._id as Id<"stories">, ...newCharacter })
        }
      }
    }
    setIsCharacterDialogOpen(false)
    setEditingCharacter(null)
  }

  const handleDeleteCharacter = () => {
    if (characterToDelete && currentStory) {
      deleteLocalCharacter(characterToDelete.id)
      if (isSignedIn && typeof currentStory._id !== 'string') {
        deleteCharacterMutation({ storyId: currentStory._id as Id<"stories">, characterId: characterToDelete.id })
      }
    }
    setCharacterToDelete(null)
  }

  const generateAISuggestion = () => {
    const suggestion = getSuggestion(currentBeat.id)
    setCurrentSuggestion(suggestion)
  }

  const refreshSuggestion = () => {
    const suggestion = getSuggestion(currentBeat.id)
    setCurrentSuggestion(suggestion)
  }

  const dismissSuggestion = () => {
    setCurrentSuggestion(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <StoryOnboarding />
      <div className="border-b p-3 lg:p-4">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 lg:gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Input value={currentStory.title} onChange={(e) => handleTitleChange(e.target.value)} className="text-lg lg:text-xl xl:text-2xl font-bold truncate bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0" />
            <Badge variant="secondary" className="hidden sm:inline-flex">Hero&apos;s Journey</Badge>
          </div>
          <div className="flex items-center gap-2 lg:gap-4 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/framework')}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Story
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportToTxt(currentStory)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as TXT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToPdf(currentStory)}>
                  <FileImage className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
              {completedBeats}/{currentStory.beats.length} beats completed
            </span>
            <Progress value={progress} className="w-24 lg:w-32 xl:w-40" />
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6 p-4 lg:p-6">
        <div className="lg:col-span-1 xl:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base lg:text-lg">Story Structure</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              <Accordion type="single" value={`beat-${currentBeatIndex}`}>
                {currentStory.beats.map((beat, index) => (
                  <AccordionItem key={beat.id} value={`beat-${index}`}>
                    <AccordionTrigger 
                      className={`text-left text-sm ${index === currentBeatIndex ? 'text-primary' : ''}`}
                      onClick={() => handleBeatChange(index)}
                    >
                      <div className="flex items-center gap-2">
                        {beat.completed && <span className="text-green-500 text-xs">✓</span>}
                        <span className="text-xs lg:text-sm">{beat.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-xs text-muted-foreground">{beat.description}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 xl:col-span-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg lg:text-xl flex items-center justify-between">
                {currentBeat.title}
                <div className="flex items-center gap-2">
                  {isSaving && <span className="text-xs text-muted-foreground">Saving...</span>}
                  {isSaved && <span className="text-xs text-green-500">Saved</span>}
                </div>
              </CardTitle>
              <CardDescription className="text-sm lg:text-base">{currentBeat.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Start writing this beat of your story..."
                value={currentBeat.content}
                onChange={(e) => handleUpdateBeatContent(e.target.value)}
                className="min-h-[300px] lg:min-h-[400px] xl:min-h-[500px] resize-y text-sm lg:text-base"
              />
              
              {currentSuggestion && (
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">AI Suggestion</CardTitle>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={refreshSuggestion} className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={dismissSuggestion} className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-blue-800 dark:text-blue-200">{currentSuggestion}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={generateAISuggestion} variant="outline" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Suggest
                </Button>
                {currentBeatIndex < currentStory.beats.length - 1 && (
                  <Button onClick={handleNextBeat}>Next Beat →</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 xl:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-base lg:text-lg">
                <span className="flex items-center gap-2"><Users className="h-4 w-4" />Characters</span>
                <Button size="sm" variant="outline" onClick={() => handleOpenCharacterDialog()}>Add</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              <div className="space-y-3">
                {currentStory.characters.map((character) => (
                  <Card key={character.id} className="p-3 group">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{character.name}</h4>
                          <Badge variant="secondary" className="text-xs">{character.role}</Badge>
                        </div>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenCharacterDialog(character)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setCharacterToDelete(character)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pt-1">{character.description}</p>
                    </div>
                  </Card>
                ))}
                {currentStory.characters.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No characters yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CharacterDialog 
        open={isCharacterDialogOpen} 
        onOpenChange={setIsCharacterDialogOpen} 
        onSave={handleSaveCharacter} 
        character={editingCharacter}
      />

      <AlertDialog open={!!characterToDelete} onOpenChange={(open) => !open && setCharacterToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the character "{characterToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCharacter}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface CharacterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (character: Omit<Character, 'id'>) => void
  character: Character | null
}

function CharacterDialog({ open, onOpenChange, onSave, character }: CharacterDialogProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (character) {
      setName(character.name)
      setRole(character.role)
      setDescription(character.description)
    } else {
      setName('')
      setRole('')
      setDescription('')
    }
  }, [character])

  const handleSave = () => {
    if (name.trim()) {
      onSave({ name, role, description })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle>{character ? 'Edit Character' : 'Add Character'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="char-name">Name</Label>
            <Input id="char-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="char-role">Role</Label>
            <Input id="char-role" placeholder="e.g., Hero, Mentor, Villain" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="char-desc">Description</Label>
            <Textarea id="char-desc" placeholder="Brief character description..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px]" />
          </div>
          <Button onClick={handleSave} className="w-full mt-6">{character ? 'Save Changes' : 'Add Character'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}