import { jsPDF } from "jspdf";
import { Story } from "./convex-store";

export const exportToPdf = (story: Story) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(story.title, 10, 20);
  doc.setFontSize(12);
  let y = 30;
  story.beats.forEach((beat) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.text(`## ${beat.title}`, 10, y);
    y += 10;
    doc.setFontSize(12);
    const splitContent = doc.splitTextToSize(beat.content, 180);
    doc.text(splitContent, 10, y);
    y += splitContent.length * 5 + 10;
  });
  doc.save(`${story.title}.pdf`);
};