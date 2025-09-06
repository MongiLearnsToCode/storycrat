'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Character } from '@/lib/convex-store'

interface CharacterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (character: Omit<Character, 'id'>) => void
  character: Character | null
}

export function CharacterDialog({ open, onOpenChange, onSave, character }: CharacterDialogProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [description, setDescription] = useState('')
  const [appearance, setAppearance] = useState('')
  const [backstory, setBackstory] = useState('')

  useEffect(() => {
    if (character) {
      setName(character.name)
      setRole(character.role)
      setDescription(character.description)
      setAppearance(character.appearance || '')
      setBackstory(character.backstory || '')
    } else {
      setName('')
      setRole('')
      setDescription('')
      setAppearance('')
      setBackstory('')
    }
  }, [character])

  const handleSave = () => {
    if (name.trim()) {
      onSave({ name, role, description, appearance, backstory })
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
          <div className="space-y-2">
            <Label htmlFor="char-appearance">Appearance</Label>
            <Textarea id="char-appearance" placeholder="Physical appearance, clothing, etc..." value={appearance} onChange={(e) => setAppearance(e.target.value)} className="min-h-[80px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="char-backstory">Backstory</Label>
            <Textarea id="char-backstory" placeholder="Relevant history, motivations, etc..." value={backstory} onChange={(e) => setBackstory(e.target.value)} className="min-h-[80px]" />
          </div>
          <Button onClick={handleSave} className="w-full mt-6">{character ? 'Save Changes' : 'Add Character'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
