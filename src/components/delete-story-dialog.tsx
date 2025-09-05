"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"

interface DeleteStoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storyTitle: string
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteStoryDialog({
  open,
  onOpenChange,
  storyTitle,
  onConfirm,
  isDeleting = false
}: DeleteStoryDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const safeStoryTitle = storyTitle || ""
  const isConfirmed = confirmText === safeStoryTitle

  const handleConfirm = () => {
    if (isConfirmed && safeStoryTitle) {
      onConfirm()
      setConfirmText("")
    }
  }

  const handleCancel = () => {
    setConfirmText("")
    onOpenChange(false)
  }

  // Don't render if no story title
  if (!safeStoryTitle && open) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Story
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your story and all its content.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Story to delete:</p>
            <p className="text-sm text-muted-foreground">{safeStoryTitle}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Type <span className="font-mono font-semibold">{safeStoryTitle}</span> to confirm:
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter story title"
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Story"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
