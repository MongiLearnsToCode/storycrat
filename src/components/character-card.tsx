'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Character } from "@/lib/convex-store"
import { Edit } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CharacterCardProps {
  character: Character
  onEdit: (character: Character) => void
}

export function CharacterCard({ character, onEdit }: CharacterCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>{character.name}</CardTitle>
          <Badge variant="secondary">{character.role}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onEdit(character)}>
          <Edit className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">{character.description}</p>
      </CardContent>
    </Card>
  )
}
