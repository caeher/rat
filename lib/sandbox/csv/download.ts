/**
 * Trigger a client-side UTF-8 CSV download (GitHub Pages — no server).
 */
export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8'): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
