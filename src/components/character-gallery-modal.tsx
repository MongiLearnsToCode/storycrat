'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Character } from "@/lib/convex-store"
import { CharacterCard } from "./character-card"
import { Plus, Search } from "lucide-react"

interface CharacterGalleryModalProps {
  characters: Character[]
  onAddCharacter: () => void
  onEditCharacter: (character: Character) => void
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CharacterGalleryModal({ 
  characters, 
  onAddCharacter, 
  onEditCharacter, 
  children,
  open,
  onOpenChange
}: CharacterGalleryModalProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCharacters = characters.filter(char => 
    char.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Character Directory</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search characters..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={onAddCharacter}>
            <Plus className="h-4 w-4 mr-2" />
            Add Character
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 -mr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {filteredCharacters.map(char => (
              <CharacterCard key={char.id} character={char} onEdit={onEditCharacter} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
