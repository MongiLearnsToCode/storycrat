import jsPDF from 'jspdf'
import { Story } from './convex-store'

export function exportToTxt(story: Story) {
  let content = `${story.title}\n`
  content += `Framework: ${story.framework}\n`
  content += `Last Edited: ${new Date(story.lastEdited).toLocaleDateString()}\n\n`
  
  content += "STORY BEATS\n"
  content += "=".repeat(50) + "\n\n"
  
  story.beats.forEach((beat, index) => {
    content += `${index + 1}. ${beat.title.toUpperCase()}\n`
    content += `${beat.description}\n\n`
    content += `${beat.content || '[Not written yet]'}\n\n`
    content += "-".repeat(30) + "\n\n"
  })
  
  if (story.characters.length > 0) {
    content += "CHARACTERS\n"
    content += "=".repeat(50) + "\n\n"
    
    story.characters.forEach(char => {
      content += `${char.name} (${char.role})\n`
      content += `${char.description}\n\n`
    })
  }
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${story.title.replace(/[^a-z0-9]/gi, '_')}_beatsheet.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToPdf(story: Story) {
  const pdf = new jsPDF()
  let yPosition = 20
  
  // Title
  pdf.setFontSize(20)
  pdf.text(story.title, 20, yPosition)
  yPosition += 15
  
  // Metadata
  pdf.setFontSize(12)
  pdf.text(`Framework: ${story.framework}`, 20, yPosition)
  yPosition += 10
  pdf.text(`Last Edited: ${new Date(story.lastEdited).toLocaleDateString()}`, 20, yPosition)
  yPosition += 20
  
  // Story Beats
  pdf.setFontSize(16)
  pdf.text('STORY BEATS', 20, yPosition)
  yPosition += 15
  
  story.beats.forEach((beat, index) => {
    if (yPosition > 250) {
      pdf.addPage()
      yPosition = 20
    }
    
    pdf.setFontSize(14)
    pdf.text(`${index + 1}. ${beat.title}`, 20, yPosition)
    yPosition += 10
    
    pdf.setFontSize(10)
    const descLines = pdf.splitTextToSize(beat.description, 170)
    pdf.text(descLines, 20, yPosition)
    yPosition += descLines.length * 5 + 5
    
    pdf.setFontSize(11)
    const contentLines = pdf.splitTextToSize(beat.content || '[Not written yet]', 170)
    pdf.text(contentLines, 20, yPosition)
    yPosition += contentLines.length * 5 + 15
  })
  
  // Characters
  if (story.characters.length > 0) {
    if (yPosition > 200) {
      pdf.addPage()
      yPosition = 20
    }
    
    pdf.setFontSize(16)
    pdf.text('CHARACTERS', 20, yPosition)
    yPosition += 15
    
    story.characters.forEach(char => {
      if (yPosition > 250) {
        pdf.addPage()
        yPosition = 20
      }
      
      pdf.setFontSize(12)
      pdf.text(`${char.name} (${char.role})`, 20, yPosition)
      yPosition += 8
      
      pdf.setFontSize(10)
      const charLines = pdf.splitTextToSize(char.description, 170)
      pdf.text(charLines, 20, yPosition)
      yPosition += charLines.length * 5 + 10
    })
  }
  
  pdf.save(`${story.title.replace(/[^a-z0-9]/gi, '_')}_beatsheet.pdf`)
}
