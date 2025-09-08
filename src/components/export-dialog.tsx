'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"

export interface ExportOptions {
  fileType: 'txt' | 'pdf' | 'docx' | 'md';
  includeCharacters: boolean;
  includeFramework: boolean;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => void;
}

export function ExportDialog({ open, onOpenChange, onExport }: ExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    fileType: 'pdf',
    includeCharacters: true,
    includeFramework: true,
  });

  const handleExport = () => {
    onExport(options);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Story</DialogTitle>
          <DialogDescription>
            Choose your export options.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>File Type</Label>
            <RadioGroup
              value={options.fileType}
              onValueChange={(value) => setOptions({ ...options, fileType: value as ExportOptions['fileType'] })}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf">PDF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="docx" id="docx" />
                <Label htmlFor="docx">DOCX</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="txt" id="txt" />
                <Label htmlFor="txt">TXT</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="md" id="md" />
                <Label htmlFor="md">Markdown</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeCharacters"
              checked={options.includeCharacters}
              onCheckedChange={(checked) => setOptions({ ...options, includeCharacters: !!checked })}
            />
            <Label htmlFor="includeCharacters">Include character bios</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeFramework"
              checked={options.includeFramework}
              onCheckedChange={(checked) => setOptions({ ...options, includeFramework: !!checked })}
            />
            <Label htmlFor="includeFramework">Include framework notes</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleExport}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
