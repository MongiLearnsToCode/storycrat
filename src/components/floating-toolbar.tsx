'use client'

import { Button } from "@/components/ui/button";
import { Undo2, Redo2, Sparkles, Loader2 } from "lucide-react";

interface FloatingToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onAiSuggest: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isAiSuggesting?: boolean;
}

export function FloatingToolbar({ onUndo, onRedo, onAiSuggest, canUndo, canRedo, isAiSuggesting = false }: FloatingToolbarProps) {
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-2 p-2 bg-background border rounded-lg shadow-lg">
        <Button onClick={onUndo} variant="ghost" size="sm" disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button onClick={onRedo} variant="ghost" size="sm" disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button onClick={onAiSuggest} variant="ghost" size="sm" disabled={isAiSuggesting}>
          {isAiSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
