import { useEffect, useState } from 'react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

type PdfInfo = { file: File; url: string; pages: number };

export default function App() {
  const [document, setDocument] = useState<PdfInfo | null>(null);
  const [status, setStatus] = useState('Ready');
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (document?.url) URL.revokeObjectURL(document.url);
  }, [document?.url]);

  async function open(file?: File) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setStatus('Please choose a PDF file.');
      return;
    }
    try {
      setStatus('Validating PDF…');
      const { PDFDocument } = await import('pdf-lib');
      const parsed = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false });
      const nextUrl = URL.createObjectURL(file);
      setDocument({ file, url: nextUrl, pages: parsed.getPageCount() });
      setPage(1);
      setStatus(`${file.name} opened · ${parsed.getPageCount()} page(s)`);
    } catch {
      setStatus('This PDF is invalid, damaged, or password protected.');
    }
  }

  async function exportPdf() {
    if (!document) return;
    setBusy(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const pdf = await PDFDocument.load(await document.file.arrayBuffer());
      if (page < 1 || page > pdf.getPageCount()) throw new Error('Select a valid page number.');
      if (text.trim()) {
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const target = pdf.getPage(page - 1);
        const maxWidth = Math.max(40, target.getWidth() - 96);
        const lines = text.trim().split('\n');
        let y = 48;
        for (const line of lines) {
          if (y > target.getHeight() - 24) break;
          target.drawText(line.slice(0, 500), {
            x: 48, y, size: 12, font, maxWidth,
            color: rgb(0.08, 0.12, 0.2),
          });
          y += 16;
        }
      }
      const output = await pdf.save();
      const blob = new Blob([output], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `edited-${document.file.name.replace(/\.pdf$/i, '')}.pdf`;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
      setStatus(text.trim() ? 'Edited PDF exported successfully.' : 'PDF exported without changes.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'PDF export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    if (!document) return;
    setBusy(true);
    const form = new FormData();
    form.append('file', document.file);
    try {
      setStatus('Uploading PDF to backend…');
      const response = await fetch(`${API}/documents/upload`, { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Upload failed.');
      setStatus(`Uploaded: ${payload.document.originalName} · ${payload.document.pages} page(s)`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Backend unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function merge() {
    if (mergeFiles.length < 2) {
      setStatus('Choose at least two PDFs to merge.');
      return;
    }
    setBusy(true);
    const form = new FormData();
    mergeFiles.forEach((file) => form.append('files', file));
    try {
      setStatus('Merging PDFs on backend…');
      const response = await fetch(`${API}/pdf/merge`, { method: 'POST', body: form });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'PDF merge failed.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = 'merged.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus(`Merged ${mergeFiles.length} PDF files successfully.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Backend unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header>
        <div className="brand"><span className="logo">P</span><div><b>ProPDF Studio</b><small>Document workspace</small></div></div>
        <span className="pill">PDF WORKSPACE · MVP</span>
      </header>
      <section className="welcome">
        <div><p className="eyebrow">YOUR DOCUMENT WORKSPACE</p><h1>Make every PDF<br /><em>work harder.</em></h1><p className="sub">Open, preview, add text, merge and export PDF documents.</p></div>
        <label className="upload"><input type="file" accept="application/pdf,.pdf" onChange={(event) => void open(event.target.files?.[0])} /><strong>＋ Open a PDF</strong><span>Choose a file from your device</span></label>
      </section>
      <section className="workspace">
        <aside>
          <h3>DOCUMENT</h3>
          <div className="tool active">▤ &nbsp; PDF viewer</div>
          <div className="tool">✎ &nbsp; Add text</div>
          <div className="tip"><b>Privacy first</b><p>Opening and text insertion happen in your browser. Upload and merge are separate backend actions.</p></div>
          <h3 className="section-label">MERGE PDFS</h3>
          <label className="file-picker">Choose PDF files<input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => setMergeFiles(Array.from(event.target.files || []))} /></label>
          <p className="small-note">{mergeFiles.length ? `${mergeFiles.length} file(s) selected` : 'Select at least 2 files'}</p>
          <button className="wide-button" disabled={busy || mergeFiles.length < 2} onClick={() => void merge()}>Merge & download</button>
        </aside>
        <article className="viewer">
          <div className="viewbar"><span title={document?.file.name}>{document?.file.name || 'No document opened'}</span><div><button disabled={!document || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>−</button><span>{page} / {document?.pages || 0}</span><button disabled={!document || page >= (document?.pages || 1)} onClick={() => setPage((value) => Math.min(document?.pages || 1, value + 1))}>＋</button></div></div>
          {document ? <iframe title="PDF preview" src={`${document.url}#page=${page}`} /> : <div className="empty"><div className="fileicon">PDF</div><h2>Your workspace is ready</h2><p>Open a PDF to preview and edit it.</p></div>}
        </article>
        <aside className="properties">
          <h3>QUICK EDIT</h3>
          <label htmlFor="insert-text">Insert text on page {page}</label>
          <textarea id="insert-text" value={text} onChange={(event) => setText(event.target.value)} placeholder="Type text to add near the bottom-left of the current page…" />
          <button className="primary" disabled={!document || busy} onClick={() => void exportPdf()}>{busy ? 'Working…' : 'Export edited PDF'}</button>
          <button disabled={!document || busy} onClick={() => void upload()}>Upload to backend</button>
          <div className="tip"><b>Editing limitation</b><p>This version adds new text; it does not directly edit existing PDF text, OCR scans, or apply secure redactions.</p></div>
        </aside>
      </section>
      <footer><span role="status">{status}</span><span>ProPDF Studio · Build 1.1</span></footer>
    </main>
  );
}
