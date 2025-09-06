'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Character } from "@/lib/convex-store"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Edit } from "lucide-react"

interface CharacterSheetProps {
  characters: Character[]
  onAddCharacter: () => void
  onEditCharacter: (character: Character) => void
  children: React.ReactNode
}

export function CharacterSheet({ characters, onAddCharacter, onEditCharacter, children }: CharacterSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Character Directory</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <Button onClick={onAddCharacter} className="w-full mb-4">
            <Plus className="h-4 w-4 mr-2" />
            Add New Character
          </Button>
          <div className="space-y-4">
            {characters.map(char => (
              <div key={char.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>{char.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{char.name}</p>
                    <p className="text-sm text-muted-foreground">{char.role}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onEditCharacter(char)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
