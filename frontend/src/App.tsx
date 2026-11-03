import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const FONT_FAMILIES = [
  'Arial','Arial Narrow','Calibri','Calibri Light','Aptos','Aptos Display',
  'Times New Roman','Cambria','Georgia','Verdana','Tahoma','Trebuchet MS',
  'Courier New','Garamond','Book Antiqua','Century Gothic','Comic Sans MS'
];
const PDF_FONT: Record<string, string> = {
  'Times New Roman': StandardFonts.TimesRoman, Cambria: StandardFonts.TimesRoman,
  Georgia: StandardFonts.TimesRoman, Garamond: StandardFonts.TimesRoman,
  'Book Antiqua': StandardFonts.TimesRoman, 'Courier New': StandardFonts.Courier
};
type PdfDocument = { file: File; bytes: ArrayBuffer; pages: number };
type TextAnnotation = { id: string; page: number; text: string; x: number; y: number; w: number; h: number; font: string; size: number; color: string };
type PdfComment = { id: string; page: number; x: number; y: number; text: string };

export default function App() {
  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [fitZoom, setFitZoom] = useState(100);
  const [tool, setTool] = useState<'select'|'text'|'comment'>('select');
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [comments, setComments] = useState<PdfComment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(12);
  const [fontColor, setFontColor] = useState('#17243b');
  const [commentDraft, setCommentDraft] = useState('');
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Open a PDF to start editing.');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const pageSizeRef = useRef({ width: 0, height: 0 });
  const selected = useMemo(() => annotations.find(a => a.id === selectedId) || null, [annotations, selectedId]);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      if (!document) return;
      try {
        const task = pdfjs.getDocument({ data: new Uint8Array(document.bytes.slice(0)) });
        const pdf = await task.promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        const pdfPage = await pdf.getPage(page);
        const base = pdfPage.getViewport({ scale: 1 });
        const width = Math.min(900, Math.max(300, (stageRef.current?.clientWidth || 760) - 40));
        const fit = width / base.width;
        setFitZoom(Math.round(fit * 100));
        const viewport = pdfPage.getViewport({ scale: fit * zoom / 100 });
        pageSizeRef.current = { width: viewport.width, height: viewport.height };
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(viewport.width * dpr);
        canvas.height = Math.round(viewport.height * dpr);
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to render PDF page.');
      }
    }
    void renderPage();
    return () => { cancelled = true; };
  }, [document, page, zoom]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId && !(event.target instanceof HTMLTextAreaElement)) {
        setAnnotations(old => old.filter(a => a.id !== selectedId));
        setSelectedId(null);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === '+') setZoom(z => Math.min(300, z + 10));
      if ((event.ctrlKey || event.metaKey) && event.key === '-') setZoom(z => Math.max(25, z - 10));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  async function openPdf(file?: File) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setStatus('Please select a PDF file.'); return; }
    try {
      setStatus('Loading PDF…');
      const bytes = await file.arrayBuffer();
      const parsed = await PDFDocument.load(bytes);
      setDocument({ file, bytes, pages: parsed.getPageCount() });
      setPage(1); setZoom(100); setAnnotations([]); setComments([]); setSelectedId(null);
      setStatus(file.name + ' · ' + parsed.getPageCount() + ' pages');
    } catch { setStatus('Could not open this PDF. It may be damaged or password protected.'); }
  }

  function normalizedPoint(event: MouseEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }

  function handleStageClick(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('.pdf-annotation, .comment-pin, .comment-note')) return;
    const point = normalizedPoint(event);
    if (!point) return;
    if (tool === 'text') {
      const id = crypto.randomUUID();
      setAnnotations(old => [...old, { id, page, text: 'Type here', x: point.x, y: point.y, w: .34, h: .12, font, size: fontSize, color: fontColor }]);
      setSelectedId(id);
      setTool('select');
      setStatus('Text box added. Edit it, then resize using its bottom-right handle.');
    } else if (tool === 'comment') {
      if (!commentDraft.trim()) { setStatus('Write a comment in the right panel first.'); return; }
      setComments(old => [...old, { id: crypto.randomUUID(), page, x: point.x, y: point.y, text: commentDraft.trim() }]);
      setCommentDraft('');
      setTool('select');
      setStatus('Comment anchored to the selected PDF location.');
    }
  }

  function updateAnnotation(id: string, patch: Partial<TextAnnotation>) {
    setAnnotations(old => old.map(a => a.id === id ? { ...a, ...patch } : a));
  }

  function saveResizedBox(id: string, element: HTMLTextAreaElement) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = element.getBoundingClientRect();
    const pageRect = canvas.getBoundingClientRect();
    updateAnnotation(id, { w: Math.max(.08, Math.min(.95, rect.width / pageRect.width)), h: Math.max(.04, Math.min(.8, rect.height / pageRect.height)) });
  }

  async function exportPdf() {
    if (!document) return;
    setBusy(true);
    try {
      const pdf = await PDFDocument.load(document.bytes.slice(0));
      for (const annotation of annotations) {
        const target = pdf.getPage(annotation.page - 1);
        const { width, height } = target.getSize();
        const embedded = await pdf.embedFont(PDF_FONT[annotation.font] || StandardFonts.Helvetica);
        const x = annotation.x * width;
        const top = annotation.y * height;
        const size = annotation.size;
        const lines = annotation.text.split('\n');
        const color = rgb(parseInt(annotation.color.slice(1,3),16)/255, parseInt(annotation.color.slice(3,5),16)/255, parseInt(annotation.color.slice(5,7),16)/255);
        let y = height - top - size * 1.2;
        const maxWidth = Math.max(20, annotation.w * width - 8);
        for (const line of lines) {
          const words = line.split(/\s+/);
          let current = '';
          for (const word of words) {
            const candidate = current ? current + ' ' + word : word;
            if (embedded.widthOfTextAtSize(candidate, size) > maxWidth && current) {
              target.drawText(current, { x: x + 4, y, size, font: embedded, color });
              y -= size * 1.35;
              current = word;
            } else current = candidate;
          }
          if (current && y > height - (top + annotation.h * height)) {
            target.drawText(current, { x: x + 4, y, size, font: embedded, color, maxWidth });
          }
          y -= size * 1.35;
        }
      }
      const bytes = await pdf.save();
      const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }));
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = 'edited-' + document.file.name.replace(/\.pdf$/i, '') + '.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus('Export complete. Text annotations have been added to the PDF.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'PDF export failed.');
    } finally { setBusy(false); }
  }

  async function mergePdfs() {
    if (mergeFiles.length < 2) { setStatus('Select at least two PDF files.'); return; }
    setBusy(true);
    try {
      const merged = await PDFDocument.create();
      for (const file of mergeFiles) {
        const source = await PDFDocument.load(await file.arrayBuffer());
        const copied = await merged.copyPages(source, source.getPageIndices());
        copied.forEach(p => merged.addPage(p));
      }
      const bytes = await merged.save();
      const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }));
      const a = window.document.createElement('a'); a.href = url; a.download = 'merged.pdf'; a.click(); URL.revokeObjectURL(url);
      setStatus('Merged ' + mergeFiles.length + ' PDFs successfully.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Merge failed.'); }
    finally { setBusy(false); }
  }

  return <main className="app-shell">
    <header><div className="brand"><span className="logo">P</span><div><b>ProPDF Studio</b><small>Professional PDF workspace</small></div></div><span className="pill">PDF EDITOR</span></header>
    <section className="welcome"><div><p className="eyebrow">YOUR DOCUMENT WORKSPACE</p><h1>Make every PDF<br/><em>work harder.</em></h1><p className="sub">Edit, annotate, format and export your PDF documents.</p></div><label className="upload"><input type="file" accept="application/pdf,.pdf" onChange={e => void openPdf(e.target.files?.[0])}/><strong>＋ Open a PDF</strong><span>Choose a file from your device</span></label></section>
    <section className="workspace">
      <aside className="left-tools"><h3>TOOLS</h3>
        <button className={tool==='select'?'tool active':'tool'} onClick={()=>setTool('select')}>↖ Select</button>
        <button className={tool==='text'?'tool active':'tool'} onClick={()=>setTool('text')}>T Add text box</button>
        <button className={tool==='comment'?'tool active':'tool'} onClick={()=>setTool('comment')}>▱ Add comment</button>
        <div className="tip"><b>Quick guide</b><p>Choose Add text box and click on the page. Choose Add comment, write a note and click its exact location.</p></div>
        <h3 className="section-label">MERGE PDFS</h3><label className="file-picker">Choose PDF files<input type="file" accept="application/pdf,.pdf" multiple onChange={e=>setMergeFiles(Array.from(e.target.files||[]))}/></label><p className="small-note">{mergeFiles.length ? mergeFiles.length+' file(s) selected' : 'Select at least 2 files'}</p><button className="wide-button" disabled={busy||mergeFiles.length<2} onClick={()=>void mergePdfs()}>Merge & download</button>
      </aside>
      <article className="viewer">
        <div className="viewbar"><span title={document?.file.name}>{document?.file.name||'No document opened'}</span><div className="view-actions">
          <button disabled={!document||page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button><span>{page} / {document?.pages||0}</span><button disabled={!document||page>=(document?.pages||1)} onClick={()=>setPage(p=>Math.min(document?.pages||1,p+1))}>›</button><i/>
          <button disabled={!document} onClick={()=>setZoom(z=>Math.max(25,z-10))}>−</button><span className="zoom-value">{Math.round(fitZoom*zoom/100)}%</span><button disabled={!document} onClick={()=>setZoom(z=>Math.min(300,z+10))}>＋</button><button disabled={!document} onClick={()=>setZoom(100)}>Fit</button>
        </div></div>
        {document ? <div className="page-scroll" ref={stageRef}><div className="pdf-page-stage" onClick={handleStageClick}>
          <canvas ref={canvasRef}/>
          {annotations.filter(a=>a.page===page).map(a=><div key={a.id} className={'pdf-annotation '+(selectedId===a.id?'selected':'')} style={{left:(a.x*100)+'%',top:(a.y*100)+'%',width:(a.w*100)+'%',height:(a.h*100)+'%',fontFamily:a.font,fontSize:(a.size*zoom/100)+'px',color:a.color}} onClick={e=>{e.stopPropagation();setSelectedId(a.id);setTool('select')}}>
            <textarea value={a.text} onChange={e=>updateAnnotation(a.id,{text:e.target.value})} onPointerUp={e=>saveResizedBox(a.id,e.currentTarget)} onClick={e=>e.stopPropagation()} onBlur={e=>saveResizedBox(a.id,e.currentTarget)} aria-label="Editable PDF text box"/>
            <span className="resize-label">↘ resize</span>
          </div>)}
          <svg className="comment-connectors" viewBox="0 0 1000 1000" preserveAspectRatio="none">{comments.filter(c=>c.page===page).map((c,i)=><g key={c.id}><path d={'M '+(c.x*1000)+' '+(c.y*1000)+' L '+(Math.min(920, 690+i*12))+' '+(70+i*70)} stroke="#d28b27" strokeWidth="2.4" fill="none" strokeDasharray="6 5"/><circle cx={c.x*1000} cy={c.y*1000} r="8" fill="#d28b27" stroke="#fff" strokeWidth="3"/></g>)}</svg>
          {comments.filter(c=>c.page===page).map((c,i)=><div key={c.id} className="comment-note" style={{top:(4+i*12)+'%',right:'2%'}}><b>Comment {i+1}</b><span>{c.text}</span><button onClick={e=>{e.stopPropagation();setComments(old=>old.filter(v=>v.id!==c.id))}}>×</button></div>)}
        </div></div> : <div className="empty"><div className="fileicon">PDF</div><h2>Your workspace is ready</h2><p>Open a PDF to start editing.</p></div>}
      </article>
      <aside className="properties"><h3>TEXT FORMATTING</h3>
        <label htmlFor="font-family">Font family</label><select id="font-family" value={selected?.font||font} onChange={e=>{setFont(e.target.value);if(selected)updateAnnotation(selected.id,{font:e.target.value})}}>{FONT_FAMILIES.map(f=><option key={f} value={f} style={{fontFamily:f}}>{f}</option>)}</select>
        <label htmlFor="font-size">Font size (pt)</label><div className="size-row"><button onClick={()=>{const v=Math.max(6,(selected?.size||fontSize)-1);setFontSize(v);if(selected)updateAnnotation(selected.id,{size:v})}}>−</button><input id="font-size" type="number" min="6" max="96" value={selected?.size||fontSize} onChange={e=>{const v=Math.max(6,Math.min(96,Number(e.target.value)||6));setFontSize(v);if(selected)updateAnnotation(selected.id,{size:v})}}/><button onClick={()=>{const v=Math.min(96,(selected?.size||fontSize)+1);setFontSize(v);if(selected)updateAnnotation(selected.id,{size:v})}}>＋</button></div>
        <label htmlFor="font-color">Text colour</label><input id="font-color" type="color" value={selected?.color||fontColor} onChange={e=>{setFontColor(e.target.value);if(selected)updateAnnotation(selected.id,{color:e.target.value})}}/>
        <h3 className="section-label">SELECTED TEXT BOX</h3><label htmlFor="box-width">Width (%)</label><input id="box-width" type="range" min="8" max="95" value={Math.round((selected?.w||.34)*100)} disabled={!selected} onChange={e=>selected&&updateAnnotation(selected.id,{w:Number(e.target.value)/100})}/><label htmlFor="box-height">Height (%)</label><input id="box-height" type="range" min="4" max="80" value={Math.round((selected?.h||.12)*100)} disabled={!selected} onChange={e=>selected&&updateAnnotation(selected.id,{h:Number(e.target.value)/100})}/><p className="small-note">{selected?'Resize with the corner handle or use these width and height controls.':'Select a text box to resize it.'}</p>
        <button disabled={!selected} onClick={()=>{if(selected){setAnnotations(old=>old.filter(a=>a.id!==selected.id));setSelectedId(null)}}}>Delete selected text box</button>
        <h3 className="section-label">COMMENTS</h3><textarea className="comment-input" value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} placeholder="Write a comment, then click Add comment and select its position…"/><p className="small-note">{comments.length} comment(s) saved in this editing session</p>
        <button className="primary" disabled={!document||busy} onClick={()=>void exportPdf()}>{busy?'Exporting…':'Export edited PDF'}</button>
        <div className="tip"><b>PDF font compatibility</b><p>Font choices are shown in the editor. PDF export maps families to the closest built-in PDF fonts (Times, Helvetica or Courier). Exact proprietary font matching requires the corresponding licensed font files.</p></div>
      </aside>
    </section>
    <footer><span role="status">{status}</span><span>ProPDF Studio · Editor</span></footer>
  </main>;
}
