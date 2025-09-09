'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

import { Input } from "@/components/ui/input"

import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { saveLocalStory } from "@/lib/local-storage"
import { useAuth } from "@clerk/nextjs"
import { Id } from "../../../convex/_generated/dataModel"
import { useConvexStoryStore, Character, StoryBeat } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { exportToTxt, exportToDocx, exportToMarkdown } from "@/lib/export-utils";
import { Users, ArrowLeft, ArrowRight, Download, Plus, Trash2, Edit } from "lucide-react"
import { ExportDialog, type ExportOptions } from "@/components/export-dialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { default as dynamicImport } from 'next/dynamic'
import { promptTemplates } from "@/lib/ai-prompts";

const StoryOnboarding = dynamicImport(() => import('@/components/onboarding').then(mod => mod.StoryOnboarding), { ssr: false })
const DeleteCharacterDialog = dynamicImport(() => import('@/components/delete-character-dialog').then(mod => mod.DeleteCharacterDialog), { ssr: false })
const CharacterDialog = dynamicImport(() => import('@/components/character-dialog').then(mod => mod.CharacterDialog), { ssr: false })
const FloatingToolbar = dynamicImport(() => import('@/components/floating-toolbar').then(mod => mod.FloatingToolbar), { ssr: false })

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
    undo,
    redo,
    past,
    future
  } = useConvexStoryStore()
  
  const updateBeatContentMutation = useMutation(api.stories.updateBeatContent)
  const addCharacterMutation = useMutation(api.stories.addCharacter)
  const updateCharacterMutation = useMutation(api.stories.updateCharacter)
  const deleteCharacterMutation = useMutation(api.stories.deleteCharacter)
  const updateStoryTitleMutation = useMutation(api.stories.updateStoryTitle)
  
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null)
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [columnHeight, setColumnHeight] = useState('auto');

  const middlePanelRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const debouncedStory = useDebounce(currentStory, 500)

  useEffect(() => {
    if (!currentStory) {
      router.push('/framework')
    }
  }, [currentStory, router])

  const { isSignedIn } = useAuth()

  useEffect(() => {
    if (debouncedStory) {
      setIsSaving(true)
      const { _id, beats, title } = debouncedStory
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

  useLayoutEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        setColumnHeight(`${newHeight}px`);
      }
    });

    if (middlePanelRef.current) {
      observer.observe(middlePanelRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleBeatChange = useCallback((newBeatIndex: number) => {
    setCurrentBeat(newBeatIndex)
  }, [setCurrentBeat])

  const handleNextBeat = useCallback(() => {
    if (currentStory && currentBeatIndex < currentStory.beats.length - 1) {
      handleBeatChange(currentBeatIndex + 1)
    }
  }, [currentStory, currentBeatIndex, handleBeatChange])

  const handlePreviousBeat = useCallback(() => {
    if (currentStory && currentBeatIndex > 0) {
      handleBeatChange(currentBeatIndex - 1)
    }
  }, [currentStory, currentBeatIndex, handleBeatChange])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextBeat();
      } else if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePreviousBeat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNextBeat, handlePreviousBeat]);

  if (!currentStory) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading story...</p>
        </div>
      </div>
    )
  }

  const showOnboarding = false

  const currentBeat = currentStory.beats[currentBeatIndex]

  const completedBeats = currentStory.beats.filter(beat => beat.completed).length
  const progress = (completedBeats / currentStory.beats.length) * 100

  const handleUpdateBeatContent = (content: string) => {
    updateLocalBeatContent(content)
  }

  const handleTitleChange = (newTitle: string) => {
    updateLocalTitle(newTitle)
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
          updateCharacterMutation({ 
            storyId: currentStory._id as Id<"stories">, 
            characterId: updatedCharacter.id,
            name: updatedCharacter.name,
            role: updatedCharacter.role,
            description: updatedCharacter.description,
            appearance: updatedCharacter.appearance,
            backstory: updatedCharacter.backstory
          })
        }
      } else {
        const newCharacter = { ...characterData, id: crypto.randomUUID() }
        addLocalCharacter(newCharacter)
        if (isSignedIn && typeof currentStory._id !== 'string') {
          addCharacterMutation({ 
            storyId: currentStory._id as Id<"stories">,
            name: newCharacter.name,
            role: newCharacter.role,
            description: newCharacter.description,
            appearance: newCharacter.appearance,
            backstory: newCharacter.backstory
          })
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

  const handleAiSuggest = () => {
    if (!currentStory) return;

    const framework = currentStory.framework as keyof typeof promptTemplates;
    const templates = promptTemplates[framework];
    if (!templates) {
      console.log("No templates for this framework");
      return;
    }

    const promptType = ['dialogue', 'action', 'description'][Math.floor(Math.random() * 3)] as keyof typeof templates;
    const promptTemplate = templates[promptType][Math.floor(Math.random() * templates[promptType].length)];

    const characters = currentStory.characters;
    const character1 = characters.length > 0 ? characters[Math.floor(Math.random() * characters.length)] : { name: "a character" };
    const character2 = characters.length > 1 ? characters.filter(c => c.id !== character1.id)[Math.floor(Math.random() * (characters.length - 1))] : { name: "another character" };

    const prompt = promptTemplate
      .replace('{characterName}', character1.name)
      .replace('{otherCharacterName}', character2.name);

    console.log("AI Suggestion Prompt:", prompt);
    // In the future, this will make an API call to an AI service
    // and display the suggestion in a dialog or inline.
    alert(`AI Suggestion Prompt:\n\n${prompt}`);
  };


  const handleExport = (options: ExportOptions) => {
    if (!currentStory) return;
    let storyToExport = { ...currentStory };

    if (!options.includeCharacters) {
      storyToExport = { ...storyToExport, characters: [] };
    }
    if (!options.includeFramework) {
      storyToExport = {
        ...storyToExport,
        beats: storyToExport.beats.map(beat => ({ ...beat, description: '' }))
      };
    }

    switch (options.fileType) {
      case 'txt':
        exportToTxt(storyToExport);
        break;
      case 'pdf':
        import("@/lib/pdf-export").then(({ exportToPdf }) => {
          exportToPdf(storyToExport);
        });
        break;
      case 'docx':
        exportToDocx(storyToExport);
        break;
      case 'md':
        exportToMarkdown(storyToExport);
        break;
    }
  };


  const getFrameworkDisplayName = (frameworkId: string) => {
    switch (frameworkId) {
      case 'hero-journey':
        return "Hero's Journey"
      case 'three-act':
        return "Three-Act Structure"
      case 'hauge-6-stage':
        return "6-Stage Structure"
      case 'story-circle':
        return "Story Circle"
      default:
        return "Unknown Framework"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {showOnboarding && <StoryOnboarding />}
      <div className="border-b p-3 lg:p-4 mb-4">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 lg:gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}> 
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Stories
            </Button>
            {isEditingTitle ? (
              <Input
                value={currentStory.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    setIsEditingTitle(false)
                  }
                }}
                autoFocus
                className="text-lg lg:text-xl xl:text-2xl font-bold truncate bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-lg lg:text-xl xl:text-2xl font-bold truncate cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2"
              >
                {currentStory.title}
              </h1>
            )}
            <Badge variant="secondary" className="hidden sm:inline-flex">{getFrameworkDisplayName(currentStory.framework)}</Badge>
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
            <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <span className="text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
              {completedBeats}/{currentStory.beats.length} beats completed
            </span>
            <Progress value={progress} className="w-24 lg:w-32 xl:w-40" />
          </div>
        </div>
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="max-w-[1600px] mx-auto rounded-lg border"
      >
        <ResizablePanel defaultSize={20}>
          <div ref={leftPanelRef} className="p-4 min-h-full overflow-y-auto" style={{ height: columnHeight }}>
            <Card className="shadow-none border-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base lg:text-lg">Story Structure</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(
                  currentStory.beats.reduce((acc, beat) => {
                    const act = beat.act || 1;
                    if (!acc[act]) {
                      acc[act] = [];
                    }
                    acc[act].push(beat);
                    return acc;
                  }, {} as { [key: number]: StoryBeat[] }))
                .map(([actNumber, beatsInAct]) => (
                  <Collapsible key={actNumber} defaultOpen className="mb-4">
                    <CollapsibleTrigger className="w-full text-left">
                      <h4 className="text-md font-semibold mb-2 p-2 rounded-md hover:bg-muted/50">Act {actNumber}</h4>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Accordion type="single" value={`beat-${currentBeatIndex}`}>
                        {beatsInAct.map((beat) => {
                          const globalIndex = currentStory.beats.findIndex(b => b.id === beat.id);
                          return (
                            <AccordionItem key={beat.id} value={`beat-${globalIndex}`}>
                              <AccordionTrigger
                                className={`text-left text-sm ${globalIndex === currentBeatIndex ? 'text-primary' : ''}`}
                                onClick={() => handleBeatChange(globalIndex)}
                              >
                                <div className={`flex items-center gap-2 ${beat.completed ? 'text-primary font-semibold' : ''}`}>
                                  {beat.completed && <span className="text-xs">✓</span>}
                                  <span className="text-xs lg:text-sm">{beat.title}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <p className="text-xs text-muted-foreground">{beat.description}</p>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        })}
                      </Accordion>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60}>
          <div ref={middlePanelRef} className="p-4 h-full overflow-y-auto">
            <Card className="shadow-none border-none">
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
                
                <div className="flex flex-col sm:flex-row gap-2 justify-between">
                  <div className="flex gap-2">
                    {currentBeatIndex > 0 && (
                                          <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button onClick={handlePreviousBeat} variant="outline" className="flex items-center gap-2">
                              <ArrowLeft className="h-4 w-4" />
                              Previous Beat
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Alt + Left Arrow</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {currentBeatIndex < currentStory.beats.length - 1 && (
                                          <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button onClick={handleNextBeat} className="flex items-center gap-2">
                              Next Beat
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Alt + Right Arrow</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={20}>
          <div className="p-4 h-full overflow-y-auto">
            <Card className="sticky top-0 shadow-none border-none">
              <Tabs defaultValue="characters" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="characters">Characters</TabsTrigger>
                  <TabsTrigger value="conflicts" disabled>Conflicts</TabsTrigger>
                </TabsList>
                <TabsContent value="characters">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-base lg:text-lg">
                      <span className="flex items-center gap-2"><Users className="h-4 w-4" />Characters</span>
                      <Button size="sm" variant="outline" onClick={() => handleOpenCharacterDialog()}>Add</Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-y-auto">
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
                </TabsContent>
                <TabsContent value="conflicts">
                  <CardHeader>
                    <CardTitle>Conflicts</CardTitle>
                    <CardDescription>
                      Track overlapping goals and tensions between your characters.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground text-center py-4">Coming soon.</p>
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <CharacterDialog 
        open={isCharacterDialogOpen} 
        onOpenChange={setIsCharacterDialogOpen} 
        onSave={handleSaveCharacter} 
        character={editingCharacter}
      />

      <DeleteCharacterDialog
        open={!!characterToDelete}
        onOpenChange={(open) => !open && setCharacterToDelete(null)}
        onDelete={handleDeleteCharacter}
        character={characterToDelete}
      />

      <FloatingToolbar
        onUndo={() => undo()}
        onRedo={() => redo()}
        onAiSuggest={handleAiSuggest}
        canUndo={past && past.length > 0}
        canRedo={future && future.length > 0}
      />

      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        onExport={handleExport}
      />
    </div>
  )
}

function ProgressWidget() {
  // This is a placeholder for the actual data calculation.
  const streak = 3; // days
  const dailyGoal = 250; // words
  const dailyProgress = 150; // words

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <div>
        <span className="font-semibold text-primary">{streak}</span> days streak
      </div>
      <div className="w-24">
        <Progress value={(dailyProgress / dailyGoal) * 100} className="h-2" />
        <div className="text-xs text-right">{dailyProgress}/{dailyGoal} words</div>
      </div>
    </div>
  );
}