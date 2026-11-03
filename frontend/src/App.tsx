import { useEffect, useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const FONTS = ['Arial','Arial Narrow','Calibri','Calibri Light','Aptos','Aptos Display','Times New Roman','Cambria','Georgia','Verdana','Tahoma','Trebuchet MS','Courier New','Garamond','Book Antiqua','Century Gothic'];
const FONT_MAP: Record<string,string> = {'Times New Roman':StandardFonts.TimesRoman,'Cambria':StandardFonts.TimesRoman,'Georgia':StandardFonts.TimesRoman,'Garamond':StandardFonts.TimesRoman,'Book Antiqua':StandardFonts.TimesRoman,'Courier New':StandardFonts.Courier};
type PdfInfo = { file: File; url: string; pages: number };
type CommentPin = { id: number; x: number; y: number; text: string };

export default function App() {
  const [document, setDocument] = useState<PdfInfo | null>(null);
  const [status, setStatus] = useState('Ready');
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(12);
  const [boxWidth, setBoxWidth] = useState(320);
  const [boxHeight, setBoxHeight] = useState(130);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<CommentPin[]>([]);
  const [commentMode, setCommentMode] = useState(false);

  useEffect(() => () => { if (document?.url) URL.revokeObjectURL(document.url); }, [document?.url]);

  async function open(file?: File) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setStatus('Please choose a PDF file.'); return; }
    try {
      setStatus('Validating PDF…');
      const parsed = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false });
      const nextUrl = URL.createObjectURL(file);
      setDocument({ file, url: nextUrl, pages: parsed.getPageCount() });
      setPage(1); setZoom(100); setComments([]);
      setStatus(file.name + ' opened · ' + parsed.getPageCount() + ' page(s)');
    } catch { setStatus('This PDF is invalid, damaged, or password protected.'); }
  }

  async function exportPdf() {
    if (!document) return;
    setBusy(true);
    try {
      const pdf = await PDFDocument.load(await document.file.arrayBuffer());
      if (page < 1 || page > pdf.getPageCount()) throw new Error('Select a valid page number.');
      if (text.trim()) {
        const fontRef = await pdf.embedFont(FONT_MAP[font] || StandardFonts.Helvetica);
        const target = pdf.getPage(page - 1);
        const maxWidth = Math.max(40, Math.min(target.getWidth() - 96, boxWidth));
        const lines = text.trim().split('\n');
        let y = target.getHeight() - 48;
        for (const line of lines) {
          if (y < target.getHeight() - boxHeight - 48) break;
          target.drawText(line.slice(0, 500), { x: 48, y, size: fontSize, font: fontRef, maxWidth, color: rgb(0.08, 0.12, 0.2) });
          y -= fontSize * 1.4;
        }
      }
      const output = await pdf.save();
      const blob = new Blob([output], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = downloadUrl; anchor.download = 'edited-' + document.file.name.replace(/\.pdf$/i, '');
      anchor.click(); URL.revokeObjectURL(downloadUrl);
      setStatus(text.trim() ? 'Edited PDF exported successfully.' : 'PDF exported without changes.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'PDF export failed.'); }
    finally { setBusy(false); }
  }

  async function upload() {
    if (!document) return;
    setBusy(true);
    const form = new FormData(); form.append('file', document.file);
    try {
      setStatus('Uploading PDF to backend…');
      const response = await fetch(API + '/documents/upload', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Upload failed.');
      setStatus('Uploaded: ' + payload.document.originalName + ' · ' + payload.document.pages + ' page(s)');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Backend unavailable.'); }
    finally { setBusy(false); }
  }

  async function merge() {
    if (mergeFiles.length < 2) { setStatus('Choose at least two PDFs to merge.'); return; }
    setBusy(true);
    try {
      const merged = await PDFDocument.create();
      for (const file of mergeFiles) {
        const source = await PDFDocument.load(await file.arrayBuffer());
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const url = URL.createObjectURL(new Blob([await merged.save()], { type: 'application/pdf' }));
      const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = 'merged.pdf'; anchor.click(); URL.revokeObjectURL(url);
      setStatus('Merged ' + mergeFiles.length + ' PDF files successfully.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'PDF merge failed.'); }
    finally { setBusy(false); }
  }

  function addComment(event: React.MouseEvent<HTMLDivElement>) {
    if (!commentMode || !comment.trim()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setComments(old => [...old, { id: Date.now(), x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height, text: comment.trim() }]);
    setComment(''); setCommentMode(false); setStatus('Comment pinned. Connector line points to its location.');
  }

  return (
    <main>
      <header><div className="brand"><span className="logo">P</span><div><b>ProPDF Studio</b><small>Document workspace</small></div></div><span className="pill">PDF WORKSPACE</span></header>
      <section className="welcome"><div><p className="eyebrow">YOUR DOCUMENT WORKSPACE</p><h1>Make every PDF<br/><em>work harder.</em></h1><p className="sub">Open, preview, annotate and export PDF documents.</p></div><label className="upload"><input type="file" accept="application/pdf,.pdf" onChange={event => void open(event.target.files?.[0])}/><strong>＋ Open a PDF</strong><span>Choose a file from your device</span></label></section>
      <section className="workspace">
        <aside><h3>DOCUMENT</h3><div className="tool active">▤ &nbsp; PDF viewer</div><div className="tip"><b>Comment anchors</b><p>Write a comment, select Pin comment, then click the relevant position on the PDF. A connector line links the marker to its note.</p></div>
          <h3 className="section-label">MERGE PDFS</h3><label className="file-picker">Choose PDF files<input type="file" accept="application/pdf,.pdf" multiple onChange={event => setMergeFiles(Array.from(event.target.files || []))}/></label><p className="small-note">{mergeFiles.length ? mergeFiles.length + ' file(s) selected' : 'Select at least 2 files'}</p><button className="wide-button" disabled={busy || mergeFiles.length < 2} onClick={() => void merge()}>Merge & download</button>
        </aside>
        <article className="viewer">
          <div className="viewbar"><span title={document?.file.name}>{document?.file.name || 'No document opened'}</span><div className="view-actions"><button disabled={!document || page <= 1} onClick={() => setPage(v => Math.max(1, v - 1))}>−</button><span>{page} / {document?.pages || 0}</span><button disabled={!document || page >= (document?.pages || 1)} onClick={() => setPage(v => Math.min(document?.pages || 1, v + 1))}>＋</button><i></i><button disabled={!document} onClick={() => setZoom(v => Math.max(50, v - 10))}>−</button><span className="zoom-value">{zoom}%</span><button disabled={!document} onClick={() => setZoom(v => Math.min(200, v + 10))}>＋</button><button disabled={!document} onClick={() => setZoom(100)}>Fit</button></div></div>
          {document ? <div className="pdf-stage" style={{cursor:commentMode?'crosshair':'default'}}><iframe title="PDF preview" src={document.url + '#page=' + page + '&zoom=' + zoom}/>{commentMode && <div className="comment-capture" onClick={addComment} title="Click the PDF to place the comment anchor" />}<svg className="comment-lines" viewBox="0 0 1000 1000" preserveAspectRatio="none">{comments.map(c => <g key={c.id}><line x1={c.x*1000} y1={c.y*1000} x2="970" y2="45" stroke="#d98b27" strokeWidth="3" strokeDasharray="8 6"/><circle cx={c.x*1000} cy={c.y*1000} r="10" fill="#d98b27" stroke="#fff" strokeWidth="3"/></g>)}</svg></div> : <div className="empty"><div className="fileicon">PDF</div><h2>Your workspace is ready</h2><p>Open a PDF to preview and edit it.</p></div>}
        </article>
        <aside className="properties"><h3>TEXT FORMATTING</h3>
          <label htmlFor="font-family">Font family</label><select id="font-family" value={font} onChange={e => setFont(e.target.value)}>{FONTS.map(f => <option key={f} value={f} style={{fontFamily:f}}>{f}</option>)}</select>
          <label htmlFor="font-size">Font size (pt)</label><div className="size-row"><button onClick={() => setFontSize(v => Math.max(6,v-1))}>−</button><input id="font-size" type="number" min="6" max="72" value={fontSize} onChange={e => setFontSize(Math.max(6,Math.min(72,Number(e.target.value)||6)))}/><button onClick={() => setFontSize(v => Math.min(72,v+1))}>＋</button></div>
          <label htmlFor="box-width">Text box width</label><input id="box-width" type="range" min="120" max="650" value={boxWidth} onChange={e => setBoxWidth(Number(e.target.value))}/><label htmlFor="box-height">Text box height</label><input id="box-height" type="range" min="60" max="420" value={boxHeight} onChange={e => setBoxHeight(Number(e.target.value))}/><p className="small-note">{boxWidth}px × {boxHeight}px · use sliders to resize the text insertion area.</p>
          <label htmlFor="insert-text">Insert text on page {page}</label><textarea id="insert-text" value={text} onChange={event => setText(event.target.value)} style={{width:'100%',height:Math.min(260,Math.max(100,boxHeight))+'px',resize:'both',fontFamily:font,fontSize:fontSize+'px'}} placeholder="Type text to add to the current page…"/>
          <h3 className="section-label">COMMENTS</h3><textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Write a comment for this page…"/><button disabled={!document || !comment.trim()} onClick={()=>{setCommentMode(true);setStatus('Click the PDF where this comment should point.')}}>Pin comment to page</button><div className="comment-list">{comments.map((c,i)=><div className="comment-item" key={c.id}><b>Comment {i+1}</b><p>{c.text}</p></div>)}</div>
          <button className="primary" disabled={!document || busy} onClick={() => void exportPdf()}>{busy ? 'Working…' : 'Export edited PDF'}</button><button disabled={!document || busy} onClick={() => void upload()}>Upload to backend</button>
          <div className="tip"><b>Font export compatibility</b><p>PDF standard fonts are used for export. Times New Roman maps to Times, Arial/Calibri/Aptos map to Helvetica, and Courier New maps to Courier. Exact Calibri/Aptos font embedding requires licensed font files.</p></div>
        </aside>
      </section>
      <footer><span role="status">{status}</span><span>ProPDF Studio · Build 2.0</span></footer>
    </main>
  );
}
