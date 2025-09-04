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
import { useConvexStoryStore } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { getRandomSuggestion } from "@/lib/ai-suggestions"
import { exportToTxt, exportToPdf } from "@/lib/export-utils"
import { Sparkles, Users, ArrowLeft, X, RefreshCw, Download, FileText, FileImage } from "lucide-react"

export default function StoryPage() {
  const router = useRouter()
  const { 
    currentStory, 
    currentBeatIndex, 
    setCurrentBeat 
  } = useConvexStoryStore()
  
  const updateBeatContent = useMutation(api.stories.updateBeatContent)
  const addCharacter = useMutation(api.stories.addCharacter)
  
  const [newCharacter, setNewCharacter] = useState({ name: '', role: '', description: '' })
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false)
  const [currentSuggestion, setCurrentSuggestion] = useState<string | null>(null)
  const [beatContent, setBeatContent] = useState('')

  useEffect(() => {
    if (!currentStory) {
      router.push('/framework')
    }
  }, [currentStory, router])

  if (!currentStory) return null

  const currentBeat = currentStory.beats[currentBeatIndex]
  const completedBeats = currentStory.beats.filter(beat => beat.completed).length
  const progress = (completedBeats / currentStory.beats.length) * 100

  useEffect(() => {
    if (currentBeat) {
      setBeatContent(currentBeat.content || '')
    }
  }, [currentBeat])

  const handleUpdateBeatContent = (content: string) => {
    setBeatContent(content)
    updateBeatContent({ 
      storyId: currentStory._id, 
      beatId: currentBeat.id, 
      content 
    })
  }

  const handleAddCharacter = () => {
    if (newCharacter.name.trim()) {
      addCharacter({
        storyId: currentStory._id,
        name: newCharacter.name,
        role: newCharacter.role,
        description: newCharacter.description
      })
      setNewCharacter({ name: '', role: '', description: '' })
      setIsCharacterDialogOpen(false)
    }
  }

  const generateAISuggestion = () => {
    const suggestion = getRandomSuggestion(currentBeat.id)
    setCurrentSuggestion(suggestion)
  }

  const refreshSuggestion = () => {
    const suggestion = getRandomSuggestion(currentBeat.id)
    setCurrentSuggestion(suggestion)
  }

  const dismissSuggestion = () => {
    setCurrentSuggestion(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b p-3 lg:p-4">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 lg:gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home
            </Button>
            <h1 className="text-lg lg:text-xl xl:text-2xl font-bold truncate">{currentStory.title}</h1>
            <Badge variant="secondary" className="hidden sm:inline-flex">Hero's Journey</Badge>
          </div>
          <div className="flex items-center gap-2 lg:gap-4 w-full sm:w-auto">
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
        {/* Left Sidebar - Story Beats */}
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
                      onClick={() => setCurrentBeat(index)}
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

        {/* Main Panel - Writing Area */}
        <div className="lg:col-span-3 xl:col-span-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg lg:text-xl">{currentBeat.title}</CardTitle>
              <CardDescription className="text-sm lg:text-base">{currentBeat.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Start writing this beat of your story..."
                value={beatContent}
                onChange={(e) => handleUpdateBeatContent(e.target.value)}
                className="min-h-[300px] lg:min-h-[400px] xl:min-h-[500px] resize-y text-sm lg:text-base"
              />
              
              {currentSuggestion && (
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        AI Suggestion
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={refreshSuggestion}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={dismissSuggestion}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
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
                  <Button onClick={() => setCurrentBeat(currentBeatIndex + 1)}>
                    Next Beat →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Characters */}
        <div className="lg:col-span-1 xl:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-base lg:text-lg">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Characters
                </span>
                <Dialog open={isCharacterDialogOpen} onOpenChange={setIsCharacterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">Add</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader className="pb-4">
                      <DialogTitle>Add Character</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="char-name">Name</Label>
                        <Input
                          id="char-name"
                          value={newCharacter.name}
                          onChange={(e) => setNewCharacter({...newCharacter, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="char-role">Role</Label>
                        <Input
                          id="char-role"
                          placeholder="e.g., Hero, Mentor, Villain"
                          value={newCharacter.role}
                          onChange={(e) => setNewCharacter({...newCharacter, role: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="char-desc">Description</Label>
                        <Textarea
                          id="char-desc"
                          placeholder="Brief character description..."
                          value={newCharacter.description}
                          onChange={(e) => setNewCharacter({...newCharacter, description: e.target.value})}
                          className="min-h-[80px]"
                        />
                      </div>
                      <Button onClick={handleAddCharacter} className="w-full mt-6">
                        Add Character
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              <div className="space-y-3">
                {currentStory.characters.map((character) => (
                  <Card key={character.id} className="p-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{character.name}</h4>
                        <Badge variant="secondary" className="text-xs">{character.role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{character.description}</p>
                    </div>
                  </Card>
                ))}
                {currentStory.characters.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No characters yet. Add some to keep track of your story's cast.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
