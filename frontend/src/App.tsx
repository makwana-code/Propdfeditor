import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const FONT_FAMILIES = [
  'Arial','Arial Narrow','Calibri','Calibri Body','Calibri Light','Aptos','Aptos Display','Aptos Narrow',
  'Times New Roman','Cambria','Georgia','Verdana','Tahoma','Trebuchet MS','Segoe UI','Franklin Gothic',
  'Courier New','Consolas','Garamond','Book Antiqua','Palatino Linotype','Century Gothic','Lucida Sans','Bookman Old Style','Comic Sans MS'
];
const PDF_FONT: Record<string, string> = {
  'Times New Roman': StandardFonts.TimesRoman, Cambria: StandardFonts.TimesRoman,
  Georgia: StandardFonts.TimesRoman, Garamond: StandardFonts.TimesRoman,
  'Book Antiqua': StandardFonts.TimesRoman, 'Courier New': StandardFonts.Courier
};
type PdfDocument = { file: File; bytes: ArrayBuffer; pages: number };
type TextStyle = { id: string; label: string; font: string; size: number; color: string; bold: boolean; italic: boolean; underline: boolean; align: 'left' | 'center' | 'right' };
const TEXT_STYLES: TextStyle[] = [
  {
    "id": "title",
    "label": "Title",
    "font": "Aptos Display",
    "size": 30,
    "color": "#17365D",
    "bold": true,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "subtitle",
    "label": "Subtitle",
    "font": "Aptos",
    "size": 20,
    "color": "#4472C4",
    "bold": false,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "heading1",
    "label": "Heading 1",
    "font": "Arial",
    "size": 24,
    "color": "#1F4E78",
    "bold": true,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "heading2",
    "label": "Heading 2",
    "font": "Arial",
    "size": 20,
    "color": "#2F5597",
    "bold": true,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "heading3",
    "label": "Heading 3",
    "font": "Calibri",
    "size": 16,
    "color": "#4472C4",
    "bold": true,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "heading4",
    "label": "Heading 4",
    "font": "Calibri",
    "size": 14,
    "color": "#5B9BD5",
    "bold": true,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "body",
    "label": "Body Text",
    "font": "Calibri",
    "size": 12,
    "color": "#222222",
    "bold": false,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "bodycompact",
    "label": "Compact Body",
    "font": "Arial",
    "size": 10,
    "color": "#333333",
    "bold": false,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "caption",
    "label": "Caption",
    "font": "Arial",
    "size": 9,
    "color": "#666666",
    "bold": false,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "quote",
    "label": "Quote",
    "font": "Georgia",
    "size": 14,
    "color": "#595959",
    "bold": false,
    "italic": true,
    "underline": false,
    "align": "left"
  },
  {
    "id": "pullquote",
    "label": "Pull Quote",
    "font": "Georgia",
    "size": 20,
    "color": "#7030A0",
    "bold": false,
    "italic": true,
    "underline": false,
    "align": "center"
  },
  {
    "id": "emphasis",
    "label": "Emphasis",
    "font": "Calibri",
    "size": 12,
    "color": "#C00000",
    "bold": true,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "strong",
    "label": "Strong",
    "font": "Arial",
    "size": 12,
    "color": "#1F1F1F",
    "bold": true,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "subtle",
    "label": "Subtle",
    "font": "Calibri Light",
    "size": 11,
    "color": "#7F7F7F",
    "bold": false,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "highlight",
    "label": "Highlight",
    "font": "Arial",
    "size": 12,
    "color": "#BF9000",
    "bold": true,
    "italic": false,
    "underline": true,
    "align": "left"
  },
  {
    "id": "bluecallout",
    "label": "Blue Callout",
    "font": "Aptos",
    "size": 14,
    "color": "#1F4E79",
    "bold": true,
    "italic": false,
    "underline": false,
    "align": "center"
  },
  {
    "id": "success",
    "label": "Success",
    "font": "Arial",
    "size": 12,
    "color": "#548235",
    "bold": true,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "warning",
    "label": "Warning",
    "font": "Arial",
    "size": 12,
    "color": "#C65911",
    "bold": true,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "legal",
    "label": "Legal / Formal",
    "font": "Times New Roman",
    "size": 11,
    "color": "#222222",
    "bold": false,
    "italic": false,
    "underline": false,
    "align": "left"
  },
  {
    "id": "mono",
    "label": "Code / Monospace",
    "font": "Courier New",
    "size": 11,
    "color": "#375623",
    "bold": false,
    "italic": false,
    "underline": false,
    "align": "left"
  }
] as const;
const PDF_FONT_STYLE: Record<string, { regular: string; bold: string; italic: string; boldItalic: string }> = {
  serif: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold, italic: StandardFonts.TimesRomanItalic, boldItalic: StandardFonts.TimesRomanBoldItalic },
  sans: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold, italic: StandardFonts.HelveticaOblique, boldItalic: StandardFonts.HelveticaBoldOblique },
  mono: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold, italic: StandardFonts.CourierOblique, boldItalic: StandardFonts.CourierBoldOblique }
};
function fontStyleFor(annotation: TextAnnotation) {
  const family = annotation.font.toLowerCase();
  const kind = family.includes('courier') || family.includes('consolas') ? 'mono' : ['times','cambria','georgia','garamond','antiqua','palatino','bookman'].some(v => family.includes(v)) ? 'serif' : 'sans';
  const style = PDF_FONT_STYLE[kind];
  return annotation.bold && annotation.italic ? style.boldItalic : annotation.bold ? style.bold : annotation.italic ? style.italic : style.regular;
};

type TextAnnotation = { id: string; page: number; text: string; x: number; y: number; w: number; h: number; maskColor?: string; font: string; size: number; color: string; styleId?: string; bold?: boolean; italic?: boolean; underline?: boolean; align?: 'left'|'center'|'right'; coverOriginal?: boolean; sourceHitId?: string };
type PdfTextHit = { id: string; page: number; text: string; x: number; y: number; w: number; h: number; fontSize: number };
type PdfComment = { id: string; page: number; x: number; y: number; boxX?: number; boxY?: number; text: string };
type OcrWord = { text: string; x: number; y: number; w: number; h: number };
type DrawStroke = { id: string; page: number; color: string; width: number; points: Array<{x:number;y:number}> };
type EditorSnapshot = { annotations: TextAnnotation[]; comments: PdfComment[]; strokes: DrawStroke[] };
type ResizeSession = { id: string; edge: string; startX: number; startY: number; start: TextAnnotation; pageWidth: number; pageHeight: number };

export default function App() {
  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [cloudUser, setCloudUser] = useState<{id:string;email?:string}|null>(null);
  const [page, setPage] = useState(1);
  const [continuousView, setContinuousView] = useState(false);
  const [continuousUrl, setContinuousUrl] = useState('');
  const [zoom, setZoom] = useState(100);
  const [fitZoom, setFitZoom] = useState(100);
  const [tool, setTool] = useState<'select'|'edit'|'text'|'comment'|'draw'>('select');
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [comments, setComments] = useState<PdfComment[]>([]);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [drawColor, setDrawColor] = useState('#d62728');
  const [drawWidth, setDrawWidth] = useState(2.5);
  const drawingRef = useRef<DrawStroke | null>(null);
  const drawingBaseRef = useRef<EditorSnapshot | null>(null);
  const undoRef = useRef<EditorSnapshot[]>([]);
  const redoRef = useRef<EditorSnapshot[]>([]);
  const lastSnapshotRef = useRef<EditorSnapshot | null>(null);
  const applyingHistoryRef = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(12);
  const [fontColor, setFontColor] = useState('#17243b');
  const [fontAssets, setFontAssets] = useState<Record<string, Uint8Array>>({});
  const [activeStyleId, setActiveStyleId] = useState('body');
  const [commentDraft, setCommentDraft] = useState('');
  const [contextMenu, setContextMenu] = useState<{x:number;y:number;hit:PdfTextHit|null;annotation:TextAnnotation|null;point:{x:number;y:number}}|null>(null);
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Open a PDF to start editing.');
  const [activePanel, setActivePanel] = useState<'pages'|'bookmarks'|'outline'|'search'>('pages');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [bookmarks, setBookmarks] = useState<Array<{title:string; page:number}>>([]);
  const [textHits, setTextHits] = useState<PdfTextHit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{page:number;text:string}>>([]);
  const [ocrPages, setOcrPages] = useState<Record<number,string>>({});
  const [ocrWords, setOcrWords] = useState<Record<number,OcrWord[]>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const resizeRef = useRef<ResizeSession | null>(null);
  const moveRef = useRef<ResizeSession | null>(null);
  const commentMoveRef = useRef<{id:string;startX:number;startY:number;start:{x:number;y:number};pageWidth:number;pageHeight:number;cardWidth:number;cardHeight:number}|null>(null);
  const connectorMoveRef = useRef<{id:string;pageLeft:number;pageTop:number;pageWidth:number;pageHeight:number}|null>(null);
  const pageSizeRef = useRef({ width: 0, height: 0 });
  const selected = useMemo(() => annotations.find(a => a.id === selectedId) || null, [annotations, selectedId]);
  useEffect(() => {
    if (!document) { setContinuousUrl(''); return; }
    const url = URL.createObjectURL(new Blob([document.bytes], { type: 'application/pdf' }));
    setContinuousUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [document]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({data}) => setCloudUser(data.session?.user ? {id:data.session.user.id,email:data.session.user.email} : null));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => setCloudUser(session?.user ? {id:session.user.id,email:session.user.email} : null));
    return () => subscription.unsubscribe();
  }, []);
  async function signInOrUp() {
    if (!supabase) { setStatus('Cloud service is not configured.'); return; }
    const email = window.prompt('Enter your email address:'); if (!email) return;
    const password = window.prompt('Enter your password (minimum 6 characters):'); if (!password) return;
    try { setBusy(true); const createAccount = window.confirm('OK creates a new account; Cancel signs in.'); const result = createAccount ? await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}}) : await supabase.auth.signInWithPassword({email,password}); if (result.error) throw result.error; setStatus(createAccount && !result.data.session ? 'Account created. Check your email to confirm it.' : 'Signed in to ProPDF Cloud.'); }
    catch(error) { setStatus(error instanceof Error ? error.message : 'Authentication failed.'); } finally { setBusy(false); }
  }
  async function saveToCloud() {
    if (!document) { setStatus('Open a PDF before saving to cloud.'); return; }
    if (!supabase) { setStatus('Cloud service is not configured.'); return; }
    if (!cloudUser) { await signInOrUp(); return; }
    if (document.bytes.byteLength > 50*1024*1024) { setStatus('PDF exceeds the 50 MB cloud limit.'); return; }
    setBusy(true); setStatus('Saving PDF and edit progress to your private cloud…');
    try { const safeName=document.file.name.replace(/[^a-zA-Z0-9._-]/g,'_'); const path=cloudUser.id+'/'+crypto.randomUUID()+'-'+safeName; const upload=await supabase.storage.from('pdf-documents').upload(path,new Blob([document.bytes.slice(0)],{type:'application/pdf'}),{contentType:'application/pdf'}); if(upload.error) throw upload.error; const record=await supabase.from('saved_documents').insert({user_id:cloudUser.id,file_name:document.file.name,storage_path:path,file_size:document.bytes.byteLength,editor_state:{page,zoom,annotations,comments,strokes,ocrPages,ocrWords}}); if(record.error) { await supabase.storage.from('pdf-documents').remove([path]); throw record.error; } setStatus('Saved privately to ProPDF Cloud with your current edits.'); }
    catch(error) { setStatus(error instanceof Error ? 'Cloud save failed: '+error.message : 'Cloud save failed.'); } finally { setBusy(false); }
  }
  async function openFromCloud() {
    if (!supabase || !cloudUser) { await signInOrUp(); return; }
    setBusy(true);
    try { const {data,error}=await supabase.from('saved_documents').select('file_name,storage_path,editor_state,created_at').order('created_at',{ascending:false}).limit(30); if(error) throw error; if(!data?.length) { setStatus('No cloud documents found.'); return; } const promptText='Choose document number:\n'+data.map((item,index)=>(index+1)+'. '+item.file_name+' — '+new Date(item.created_at).toLocaleString()).join('\n'); const choice=window.prompt(promptText,'1'); if(choice===null) return; const record=data[Number(choice)-1]; if(!record) throw new Error('Invalid document number.'); const downloaded=await supabase.storage.from('pdf-documents').download(record.storage_path); if(downloaded.error) throw downloaded.error; await openPdf(new File([downloaded.data],record.file_name,{type:'application/pdf'})); const state=record.editor_state as any; setAnnotations(state.annotations||[]); setComments(state.comments||[]); setStrokes(state.strokes||[]); setOcrPages(state.ocrPages||{}); setOcrWords(state.ocrWords||{}); if(state.page) setPage(state.page); if(state.zoom) setZoom(state.zoom); setStatus('Loaded '+record.file_name+' from your private cloud.'); }
    catch(error) { setStatus(error instanceof Error ? 'Cloud open failed: '+error.message : 'Cloud open failed.'); } finally { setBusy(false); }
  }
  async function signOutCloud() { if(!supabase) return; const {error}=await supabase.auth.signOut(); setStatus(error ? error.message : 'Signed out of ProPDF Cloud.'); }
  const canUndo = undoRef.current.length > 0;
  const canRedo = redoRef.current.length > 0;

  useEffect(() => {
    const current: EditorSnapshot = { annotations, comments, strokes };
    if (!lastSnapshotRef.current) { lastSnapshotRef.current = current; return; }
    if (applyingHistoryRef.current) { applyingHistoryRef.current = false; lastSnapshotRef.current = current; return; }
    if (drawingRef.current) return;
    undoRef.current = [...undoRef.current.slice(-99), lastSnapshotRef.current];
    redoRef.current = [];
    lastSnapshotRef.current = current;
  }, [annotations, comments, strokes]);

  function undoEdit() {
    const previous = undoRef.current.pop(); if (!previous) return;
    const current: EditorSnapshot = { annotations, comments, strokes };
    redoRef.current.push(current); applyingHistoryRef.current = true;
    setAnnotations(previous.annotations); setComments(previous.comments); setStrokes(previous.strokes);
    lastSnapshotRef.current = previous; setStatus('Last edit undone.');
  }
  function redoEdit() {
    const next = redoRef.current.pop(); if (!next) return;
    const current: EditorSnapshot = { annotations, comments, strokes };
    undoRef.current.push(current); applyingHistoryRef.current = true;
    setAnnotations(next.annotations); setComments(next.comments); setStrokes(next.strokes);
    lastSnapshotRef.current = next; setStatus('Edit restored.');
  }
  const activeStyle: TextStyle = selected ? { id: selected.styleId || activeStyleId, label: TEXT_STYLES.find(style => style.id === selected.styleId)?.label || 'Custom', font:selected.font, size:selected.size, color:selected.color, bold:selected.bold||false, italic:selected.italic||false, underline:selected.underline||false, align:selected.align||'left' } : (TEXT_STYLES.find(style => style.id === activeStyleId) || TEXT_STYLES[6]);

  function applyTextStyle(styleId: string) {
    const preset = TEXT_STYLES.find(style => style.id === styleId);
    if (!preset) return;
    setActiveStyleId(styleId); setFont(preset.font); setFontSize(preset.size); setFontColor(preset.color);
    if (selected) updateAnnotation(selected.id, { styleId, font: preset.font, size: preset.size, color: preset.color, bold: preset.bold, italic: preset.italic, underline: preset.underline, align: preset.align });
  }

  function resizeSelectedBox(dimension: 'w'|'h', amount: number) {
    if (!selected) return;
    const next = Math.max(dimension === 'w' ? .08 : .04, Math.min(dimension === 'w' ? 1-selected.x : 1-selected.y, selected[dimension] + amount));
    if (dimension === 'w') updateAnnotation(selected.id, { w: next });
    else updateAnnotation(selected.id, { h: next });
  }

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
        const content = await pdfPage.getTextContent();
        const hits: PdfTextHit[] = (content.items as any[]).filter(item => typeof item.str === 'string' && item.str.trim()).map((item:any,index:number) => {
          const transform = pdfjs.Util.transform(viewport.transform, item.transform);
          const itemHeight = Math.max(8, Math.hypot(transform[2], transform[3]));
          const itemWidth = Math.max(8, (item.width || item.str.length * itemHeight * .45) * viewport.scale);
          return { id: page + '-' + index, page, text:item.str, x:Math.max(0,transform[4]/viewport.width), y:Math.max(0,(transform[5]-itemHeight)/viewport.height), w:Math.min(1,itemWidth/viewport.width), h:Math.min(1,itemHeight*1.35/viewport.height), fontSize:itemHeight/Math.max(.01,viewport.scale) };
        });
        if (!cancelled) setTextHits(hits);
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

  useEffect(() => {
    function moveResize(event: PointerEvent) {
      const movingConnector = connectorMoveRef.current;
      if (movingConnector) {
        const x = Math.max(0, Math.min(1, (event.clientX - movingConnector.pageLeft) / movingConnector.pageWidth));
        const y = Math.max(0, Math.min(1, (event.clientY - movingConnector.pageTop) / movingConnector.pageHeight));
        setComments(old => old.map(item => item.id === movingConnector.id ? {...item, x, y} : item));
        return;
      }
      const movingComment = commentMoveRef.current;
      if (movingComment) {
        const dx = (event.clientX - movingComment.startX) / movingComment.pageWidth;
        const dy = (event.clientY - movingComment.startY) / movingComment.pageHeight;
        const maxX = Math.max(0, 1 - movingComment.cardWidth / movingComment.pageWidth);
        const maxY = Math.max(0, 1 - movingComment.cardHeight / movingComment.pageHeight);
        const boxX = Math.max(0, Math.min(maxX, movingComment.start.x + dx));
        const boxY = Math.max(0, Math.min(maxY, movingComment.start.y + dy));
        setComments(old => old.map(item => item.id === movingComment.id ? {...item,boxX,boxY} : item));
        return;
      }
      const moving = moveRef.current;
      if (moving) {
        const dx = (event.clientX-moving.startX)/moving.pageWidth, dy=(event.clientY-moving.startY)/moving.pageHeight;
        const x=Math.max(0,Math.min(1-moving.start.w,moving.start.x+dx)), y=Math.max(0,Math.min(1-moving.start.h,moving.start.y+dy));
        setAnnotations(old=>old.map(item=>item.id===moving.id?{...item,x,y}:item)); return;
      }
      const session = resizeRef.current;
      if (!session) return;
      const dx = (event.clientX - session.startX) / session.pageWidth;
      const dy = (event.clientY - session.startY) / session.pageHeight;
      const a = session.start;
      let x = a.x, y = a.y, w = a.w, h = a.h;
      if (session.edge.includes('e')) w = Math.max(.08, Math.min(1 - x, a.w + dx));
      if (session.edge.includes('s')) h = Math.max(.04, Math.min(1 - y, a.h + dy));
      if (session.edge.includes('w')) {
        const right = a.x + a.w;
        x = Math.max(0, Math.min(right - .08, a.x + dx));
        w = right - x;
      }
      if (session.edge.includes('n')) {
        const bottom = a.y + a.h;
        y = Math.max(0, Math.min(bottom - .04, a.y + dy));
        h = bottom - y;
      }
      setAnnotations(old => old.map(item => item.id === session.id ? { ...item, x, y, w, h } : item));
    }
    function endResize() { resizeRef.current = null; moveRef.current = null; commentMoveRef.current = null; connectorMoveRef.current = null; }
    window.addEventListener('pointermove', moveResize);
    window.addEventListener('pointerup', endResize);
    window.addEventListener('pointercancel', endResize);
    return () => {
      window.removeEventListener('pointermove', moveResize);
      window.removeEventListener('pointerup', endResize);
      window.removeEventListener('pointercancel', endResize);
    };
  }, []);

  function beginConnectorMove(event: ReactPointerEvent<SVGPathElement>, comment: PdfComment) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const stage = (event.currentTarget as SVGPathElement).closest('.pdf-page-stage') as HTMLElement | null;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    connectorMoveRef.current = { id: comment.id, pageLeft: rect.left, pageTop: rect.top, pageWidth: rect.width, pageHeight: rect.height };
    try { (event.currentTarget as SVGPathElement).setPointerCapture(event.pointerId); } catch {}
  }

  function beginCommentMove(event: ReactPointerEvent<HTMLElement>, comment: PdfComment) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    event.stopPropagation();
    const stage = (event.currentTarget as HTMLElement).closest('.pdf-page-stage') as HTMLElement | null;
    const card = (event.currentTarget as HTMLElement).closest('.comment-note') as HTMLElement | null;
    if (!stage || !card) return;
    const pageRect = stage.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (!pageRect.width || !pageRect.height) return;
    // Read the rendered position so drag remains correct after zooming/resizing
    // and for comments created by older versions that have no saved boxX/boxY.
    const currentX = (cardRect.left - pageRect.left) / pageRect.width;
    const currentY = (cardRect.top - pageRect.top) / pageRect.height;
    commentMoveRef.current = {
      id: comment.id, startX: event.clientX, startY: event.clientY,
      start: {x: currentX, y: currentY},
      pageWidth: pageRect.width, pageHeight: pageRect.height,
      cardWidth: cardRect.width, cardHeight: cardRect.height
    };
    try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch {}
  }

  function beginMove(event: ReactPointerEvent<HTMLElement>, annotation: TextAnnotation) {
    event.preventDefault(); event.stopPropagation();
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    moveRef.current = { id: annotation.id, edge: 'move', startX: event.clientX, startY: event.clientY, start: { ...annotation }, pageWidth: rect.width, pageHeight: rect.height };
    setSelectedId(annotation.id);
  }

  function beginResize(event: ReactPointerEvent<HTMLButtonElement>, annotation: TextAnnotation, edge: string) {
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    resizeRef.current = {
      id: annotation.id, edge, startX: event.clientX, startY: event.clientY,
      start: { ...annotation }, pageWidth: rect.width, pageHeight: rect.height
    };
    setSelectedId(annotation.id);
  }

  async function openPdf(file?: File) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setStatus('Please select a PDF file.'); return; }
    try {
      setStatus('Loading PDF…');
      const bytes = await file.arrayBuffer();
      const parsed = await PDFDocument.load(bytes);
      setDocument({ file, bytes, pages: parsed.getPageCount() });
      setContinuousView(false);
      const loading = pdfjs.getDocument({data:new Uint8Array(bytes.slice(0))});
      const pdfView = await loading.promise;
      const outline = await pdfView.getOutline();
      const entries:Array<{title:string;page:number}> = [];
      const visit = async (nodes:any[]) => { for (const node of nodes || []) { let target:any=node.dest; if (typeof target === 'string') target=await pdfView.getDestination(target); let targetPage=1; if (Array.isArray(target) && target[0]) { try { targetPage=(await pdfView.getPageIndex(target[0]))+1; } catch {} } entries.push({title:String(node.title||'Untitled bookmark'),page:targetPage}); if (node.items?.length) await visit(node.items); } };
      await visit(outline || []); setBookmarks(entries); setSearchResults([]); setTextHits([]);
      setPage(1); setZoom(100); setAnnotations([]); setComments([]); setStrokes([]); setOcrPages({}); setOcrWords({}); undoRef.current=[]; redoRef.current=[]; lastSnapshotRef.current=null; setSelectedId(null);
      setStatus(file.name + ' · ' + parsed.getPageCount() + ' pages');
    } catch { setStatus('Could not open this PDF. It may be damaged or password protected.'); }
  }

  function normalizedPoint(event: { clientX: number; clientY: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }

  function handleStageClick(event: MouseEvent<HTMLDivElement>) {
    if (contextMenu) setContextMenu(null);
    if (tool === 'draw') return;
    if ((event.target as HTMLElement).closest('.pdf-annotation, .comment-pin, .comment-note, button, textarea, input')) return;
    const point = normalizedPoint(event);
    if (!point) return;
    if (tool === 'text') {
      const id = crypto.randomUUID();
      setAnnotations(old => [...old, { id, page, text: 'Type here', x: point.x, y: point.y, w: .34, h: .12, font, size: fontSize, color: fontColor, styleId: activeStyle.id, bold: activeStyle.bold, italic: activeStyle.italic, underline: activeStyle.underline, align: activeStyle.align }]);
      setSelectedId(id);
      setTool('edit');
      setStatus('Text box added. Type to edit; drag the text box itself to move it.');
    } else if (tool === 'comment') {
      addCommentAt(point);
    }
  }

  function editExistingText(hit: PdfTextHit) {
    const existing = annotations.find(item => item.sourceHitId === hit.id);
    if (existing) {
      setSelectedId(existing.id);
      setTool('edit');
      setStatus('Original text selected. Type your replacement; the background mask and text box will adjust as needed.');
      return;
    }
    const id = crypto.randomUUID();
    const style = TEXT_STYLES.find(item=>item.id==='body') || TEXT_STYLES[6];
    // PDF.js gives the baseline-based text bounds. Expand slightly upward/downward
    // so the opaque replacement layer fully covers glyph ascenders and descenders.
    const padX = Math.max(.001, Math.min(.003, hit.h * .08));
    const padY = Math.max(.0015, Math.min(.0035, hit.h * .18));
    const boxX = Math.max(0, hit.x - padX);
    const boxY = Math.max(0, hit.y - padY);
    const boxW = Math.min(1 - boxX, Math.max(.012, hit.w + padX * 2));
    const boxH = Math.min(1 - boxY, Math.max(.012, hit.h + padY * 2));
    // Sample nearby page pixels so replacement masks match white or tinted cells.
    let maskColor = '#ffffff';
    const canvas = canvasRef.current;
    if (canvas && canvas.width && canvas.height) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const px = hit.x * canvas.width, py = hit.y * canvas.height;
        const pw = hit.w * canvas.width, ph = hit.h * canvas.height;
        const samples = [[px - 2, py + ph * .5], [px + pw + 2, py + ph * .5], [px + pw * .5, py - 2], [px + pw * .5, py + ph + 2]];
        const colors = samples.map(([sx, sy]) => {
          const x = Math.max(0, Math.min(canvas.width - 1, Math.round(sx)));
          const y = Math.max(0, Math.min(canvas.height - 1, Math.round(sy)));
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          return { hex: '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join(''), light: pixel[0] + pixel[1] + pixel[2] };
        });
        maskColor = colors.sort((a, b) => b.light - a.light)[0]?.hex || maskColor;
      }
    }
    const annotation: TextAnnotation = {
      id, page: hit.page, text: hit.text, x: boxX, y: boxY, w: boxW, h: boxH, maskColor,
      font: style.font, size: Math.max(6, Math.min(36, hit.fontSize)),
      color: '#222222', styleId: 'body', align: 'left', coverOriginal: true, sourceHitId: hit.id
    };
    setAnnotations(old => [...old, annotation]);
    setSelectedId(id);
    setTool('edit');
    setStatus('Text selected. Edit while Edit Text is active; switch to Select by clicking the selected text again, then drag the text itself to move it.');
  }

  function addCommentAt(point: {x:number;y:number}) {
    // Ask for the note only after the user has chosen the exact page position.
    const entered = commentDraft.trim() || window.prompt('Enter your comment:')?.trim() || '';
    if (!entered) {
      setTool('select');
      setCommentDraft('');
      setStatus('Comment cancelled. Choose Comment and click the page to add a note.');
      return;
    }
    const comment: PdfComment = {
      id: crypto.randomUUID(), page, x: point.x, y: point.y,
      boxX: Math.min(.74, Math.max(.02, point.x + .02)),
      boxY: Math.min(.88, Math.max(.02, point.y + .01)), text: entered
    };
    setComments(old => [...old, comment]);
    setCommentDraft('');
    setTool('select');
    setStatus('Comment added at the selected position on page ' + page + '.');
  }

  async function runOcr() {
    if (!document) { setStatus('Open a PDF before running OCR.'); return; }
    setBusy(true);
    let worker: any = null;
    try {
      const pdf = pdfRef.current || await (async () => {
        const task = pdfjs.getDocument({ data: new Uint8Array(document.bytes.slice(0)) });
        return await task.promise;
      })();
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('eng');
      const extracted: Record<number,string> = {};
      const positionedWords: Record<number,OcrWord[]> = {};
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setStatus('OCR processing page ' + pageNumber + ' of ' + pdf.numPages + '…');
        const pdfPage = await pdf.getPage(pageNumber);
        const viewport = pdfPage.getViewport({ scale: 1.6 });
        const canvas = window.document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create an OCR canvas for page ' + pageNumber + '.');
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        const result: any = await worker.recognize(canvas);
        const text = result.data.text.trim();
        if (text) extracted[pageNumber] = text;
        const words = (result.data.words || []).filter((word: any) => word.text?.trim() && word.confidence >= 35).map((word: any) => ({
          text: word.text.trim(),
          x: Math.max(0, Math.min(1, word.bbox.x0 / viewport.width)),
          y: Math.max(0, Math.min(1, word.bbox.y0 / viewport.height)),
          w: Math.max(0, Math.min(1, (word.bbox.x1 - word.bbox.x0) / viewport.width)),
          h: Math.max(0, Math.min(1, (word.bbox.y1 - word.bbox.y0) / viewport.height))
        }));
        if (words.length) positionedWords[pageNumber] = words;
        canvas.width = 0;
        canvas.height = 0;
      }
      setOcrPages(old => ({ ...old, ...extracted }));
      setOcrWords(old => ({ ...old, ...positionedWords }));
      const found = Object.entries(extracted).map(([pageNumber,text]) => ({ page:Number(pageNumber), text:text.slice(0,500) }));
      setSearchResults(found);
      setSearchQuery(found.length ? found[0].text.split(/\s+/).slice(0,6).join(' ') : '');
      setActivePanel('search');
      setStatus('Full-document OCR completed. Recognized text is searchable across ' + pdf.numPages + ' page(s).');
    } catch (error) {
      setStatus(error instanceof Error ? 'OCR failed: ' + error.message : 'OCR failed.');
    } finally {
      if (worker) await worker.terminate();
      setBusy(false);
    }
  }
  async function runSearch() {
    if (!document || !searchQuery.trim()) { setSearchResults([]); return; }
    const query = searchQuery.trim().toLowerCase();
    const results: Array<{page:number;text:string}> = [];
    setBusy(true);
    try {
      const pdf = pdfRef.current || await (async () => {
        const task = pdfjs.getDocument({ data: new Uint8Array(document.bytes.slice(0)) });
        return await task.promise;
      })();
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const pdfPage = await pdf.getPage(pageNumber);
        const content = await pdfPage.getTextContent();
        const embeddedText = (content.items as any[]).map(item => item.str || '').join(' ');
        const text = [embeddedText, ocrPages[pageNumber] || ''].filter(Boolean).join(' ');
        const lower = text.toLowerCase();
        const at = lower.indexOf(query);
        if (at >= 0) results.push({ page:pageNumber, text:text.slice(Math.max(0,at-65), Math.min(text.length,at+query.length+100)) });
      }
      setSearchResults(results);
      setStatus(results.length + ' page(s) contain “' + searchQuery + '”.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Search failed.');
    } finally {
      setBusy(false);
    }
  }

  function updateAnnotation(id: string, patch: Partial<TextAnnotation>) {
    setAnnotations(old => old.map(a => {
      if (a.id !== id) return a;
      const next = { ...a, ...patch };
      // Grow original-text replacement boxes as the user types so the new
      // string is not squeezed into the old PDF run's narrow width.
      if (a.coverOriginal && typeof patch.text === 'string') {
        const pageWidth = canvasRef.current?.clientWidth || pageSizeRef.current.width || 1;
        const fontPx = Math.max(6, a.size * fitZoom * zoom / 10000);
        const longestLine = Math.max(...patch.text.split('\n').map(line => line.length), 1);
        const estimatedWidth = (longestLine * fontPx * .58 + 6) / pageWidth;
        const lineCount = Math.max(1, patch.text.split('\n').length);
        const estimatedHeight = (lineCount * fontPx * 1.2 + 4) / (canvasRef.current?.clientHeight || pageSizeRef.current.height || 1);
        next.w = Math.min(1 - a.x, Math.max(a.w, estimatedWidth));
        next.h = Math.min(1 - a.y, Math.max(a.h, estimatedHeight));
      }
      return next;
    }));
  }

  function saveResizedBox(id: string, element: HTMLTextAreaElement) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = element.getBoundingClientRect();
    const pageRect = canvas.getBoundingClientRect();
    const sourceText = annotations.find(item => item.id === id)?.coverOriginal;
    updateAnnotation(id, {
      w: Math.max(sourceText ? .012 : .08, Math.min(.95, rect.width / pageRect.width)),
      h: Math.max(sourceText ? .012 : .04, Math.min(.8, rect.height / pageRect.height))
    });
  }

  function beginDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    if (tool !== 'draw' || (event.target as HTMLElement).closest('.pdf-annotation,.comment-note')) return;
    const point = normalizedPoint(event); if (!point) return;
    event.preventDefault();
    const stroke: DrawStroke = { id: crypto.randomUUID(), page, color: drawColor, width: drawWidth, points: [point] };
    drawingBaseRef.current = lastSnapshotRef.current || { annotations, comments, strokes }; drawingRef.current = stroke; setStrokes(old => [...old, stroke]);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function continueDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drawingRef.current) return;
    const point = normalizedPoint(event); if (!point) return;
    const active = drawingRef.current;
    const next = { ...active, points: [...active.points, point] };
    drawingRef.current = next;
    setStrokes(old => old.map(item => item.id === next.id ? next : item));
  }
  function finishDrawing() {
    if (!drawingRef.current) return;
    const base = drawingBaseRef.current;
    if (base) { undoRef.current = [...undoRef.current.slice(-99), base]; redoRef.current = []; }
    drawingRef.current = null; drawingBaseRef.current = null;
    lastSnapshotRef.current = { annotations, comments, strokes };
    setStatus('Freehand stroke added.');
  }

  async function exportPdf() {
    if (!document) return;
    setBusy(true);
    try {
      const pdf = await PDFDocument.load(document.bytes.slice(0));
      pdf.registerFontkit(fontkit);
      const embeddedFonts = new Map<string, Awaited<ReturnType<typeof pdf.embedFont>>>();
      for (const annotation of annotations) {
        const target = pdf.getPage(annotation.page - 1);
        const { width, height } = target.getSize();
        const fontKey = annotation.font + ':' + (annotation.bold ? 'b' : '') + (annotation.italic ? 'i' : '');
        let embedded = embeddedFonts.get(fontKey);
        if (!embedded) {
          const uploadedFont = fontAssets[annotation.font];
          embedded = uploadedFont
            ? await pdf.embedFont(uploadedFont, { subset: true })
            : await pdf.embedFont(fontStyleFor(annotation));
          embeddedFonts.set(fontKey, embedded);
        }
        const x = annotation.x * width;
        const top = annotation.y * height;
        if (annotation.coverOriginal) {
          const mask = annotation.maskColor || '#ffffff';
          const maskRgb = rgb(parseInt(mask.slice(1,3),16)/255, parseInt(mask.slice(3,5),16)/255, parseInt(mask.slice(5,7),16)/255);
          target.drawRectangle({x:x-0.35,y:height-top-annotation.h*height-0.35,width:annotation.w*width+0.7,height:annotation.h*height+0.7,color:maskRgb,borderWidth:0});
        }
        const size = annotation.size;
        const color = rgb(parseInt(annotation.color.slice(1,3),16)/255, parseInt(annotation.color.slice(3,5),16)/255, parseInt(annotation.color.slice(5,7),16)/255);
        const boxWidth = Math.max(1, annotation.w * width);
        const boxHeight = Math.max(1, annotation.h * height);
        const inset = Math.min(4, boxWidth / 20);
        const maxWidth = Math.max(1, boxWidth - inset * 2);
        const lineHeight = size * 1.25;
        const maxLines = Math.max(1, Math.floor(boxHeight / lineHeight));
        const wrapped: string[] = [];
        for (const paragraph of annotation.text.split('\n')) {
          if (!paragraph) { wrapped.push(''); continue; }
          let current = '';
          for (const word of paragraph.split(/\s+/)) {
            const candidate = current ? current + ' ' + word : word;
            if (current && embedded.widthOfTextAtSize(candidate, size) > maxWidth) {
              wrapped.push(current);
              current = word;
            } else if (!current && embedded.widthOfTextAtSize(word, size) > maxWidth) {
              let chunk = '';
              for (const char of word) {
                if (chunk && embedded.widthOfTextAtSize(chunk + char, size) > maxWidth) {
                  wrapped.push(chunk);
                  chunk = char;
                } else chunk += char;
              }
              current = chunk;
            } else current = candidate;
          }
          if (current) wrapped.push(current);
        }
        wrapped.slice(0, maxLines).forEach((line, index) => {
          if (!line) return;
          const lineWidth = embedded.widthOfTextAtSize(line, size);
          const align = annotation.align || 'left';
          const alignedX = align === 'center' ? x + inset + Math.max(0,(maxWidth-lineWidth)/2) : align === 'right' ? x + inset + Math.max(0,maxWidth-lineWidth) : x + inset;
          const lineY = height - top - size - index * lineHeight;
          target.drawText(line, { x: alignedX, y: lineY, size, font: embedded, color });
          if (annotation.underline) target.drawLine({ start:{x:alignedX,y:lineY-1.5}, end:{x:alignedX+lineWidth,y:lineY-1.5}, thickness:0.6, color });
        });
      }
      for (const stroke of strokes) {
        const target = pdf.getPage(stroke.page - 1); const { width, height } = target.getSize();
        const color = rgb(parseInt(stroke.color.slice(1,3),16)/255, parseInt(stroke.color.slice(3,5),16)/255, parseInt(stroke.color.slice(5,7),16)/255);
        for (let i=1;i<stroke.points.length;i++) {
          const a=stroke.points[i-1], b=stroke.points[i];
          target.drawLine({ start:{x:a.x*width,y:height-a.y*height}, end:{x:b.x*width,y:height-b.y*height}, thickness:stroke.width, color, opacity:1 });
        }
      }
      // Embed OCR text invisibly so scanned pages become searchable in exported PDFs.
      const ocrFont = await pdf.embedFont(StandardFonts.Helvetica);
      for (const [pageNumber, words] of Object.entries(ocrWords)) {
        const target = pdf.getPage(Number(pageNumber) - 1);
        const { width, height } = target.getSize();
        for (const word of words) {
          if (!word.text || word.w <= 0 || word.h <= 0) continue;
          const size = Math.max(3, Math.min(48, word.h * height * 0.82));
          target.drawText(word.text, {
            x: word.x * width,
            y: height - (word.y + word.h) * height + size * 0.08,
            size,
            font: ocrFont,
            opacity: 0,
            maxWidth: Math.max(1, word.w * width * 1.15)
          });
        }
      }
      const commentFont = await pdf.embedFont(StandardFonts.Helvetica);
      for (const comment of comments) {
        const target = pdf.getPage(comment.page - 1);
        const { width, height } = target.getSize();
        const cardWidth = width * 0.24;
        const cardHeight = Math.max(34, height * 0.075);
        const anchor = { x: comment.x * width, y: height - comment.y * height };
        // Preserve the user's dragged comment-card position in the exported PDF.
        // boxX/boxY are normalized top-left coordinates in the on-screen page.
        const requestedX = (comment.boxX ?? Math.min(.74, Math.max(.02, comment.x + .02))) * width;
        const requestedTop = (comment.boxY ?? Math.min(.88, Math.max(.02, comment.y + .01))) * height;
        const cardX = Math.max(4, Math.min(width - cardWidth - 4, requestedX));
        const cardY = Math.max(4, Math.min(height - cardHeight - 4, height - requestedTop - cardHeight));
        const connectorEnd = { x: cardX, y: cardY + cardHeight / 2 };
        const commentColor = rgb(0.82, 0.54, 0.15);
        target.drawLine({ start: anchor, end: connectorEnd, thickness: 1.4, color: commentColor });
        target.drawCircle({ x: anchor.x, y: anchor.y, size: 4, color: commentColor });
        target.drawRectangle({
          x: cardX, y: cardY, width: cardWidth, height: cardHeight,
          color: rgb(1, 0.98, 0.93), borderColor: rgb(0.93, 0.81, 0.62), borderWidth: 0.8
        });
        target.drawText(comment.text, {
          x: cardX + 6, y: cardY + cardHeight - 13, size: 8, font: commentFont,
          color: rgb(0.42, 0.31, 0.13), maxWidth: cardWidth - 12, lineHeight: 10
        });
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


  async function splitPdf() {
    if (!document) { setStatus('Open a PDF before splitting.'); return; }
    const input = window.prompt('Enter pages/ranges to extract (example: 1-3,5):', '1-' + document.pages);
    if (input === null) return;
    try {
      const indices = new Set<number>();
      for (const part of input.split(',')) {
        const pieces = part.trim().split('-'); const first = Number(pieces[0]); const last = Number(pieces[1] || pieces[0]);
        if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last > document.pages || first > last) throw new Error('Enter valid page numbers within this PDF.');
        for (let n = first; n <= last; n++) indices.add(n - 1);
      }
      if (!indices.size) throw new Error('Select at least one page.');
      setBusy(true); setStatus('Splitting PDF…');
      const source = await PDFDocument.load(document.bytes.slice(0)); const output = await PDFDocument.create();
      const pages = await output.copyPages(source, [...indices].sort((a,b) => a-b)); pages.forEach(p => output.addPage(p));
      const bytes = await output.save(); const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }));
      const a = window.document.createElement('a'); a.href = url; a.download = 'split-pages.pdf'; a.click(); URL.revokeObjectURL(url);
      setStatus('Created a PDF with ' + pages.length + ' selected page(s).');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Split failed.'); } finally { setBusy(false); }
  }

  async function rotateCurrentPage() {
    if (!document) return;
    try {
      const pdf = await PDFDocument.load(document.bytes.slice(0)); const target = pdf.getPage(page - 1);
      target.setRotation(degrees((target.getRotation().angle + 90) % 360)); const bytes = await pdf.save();
      const file = new File([bytes as unknown as BlobPart], document.file.name, { type: 'application/pdf' });
      setDocument({ file, bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, pages: pdf.getPageCount() });
      setStatus('Page ' + page + ' rotated 90 degrees clockwise.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not rotate page.'); }
  }

  async function deleteCurrentPage() {
    if (!document) return;
    if (document.pages <= 1) { setStatus('A PDF must contain at least one page.'); return; }
    if (!window.confirm('Delete page ' + page + '?')) return;
    try {
      const pdf = await PDFDocument.load(document.bytes.slice(0)); pdf.removePage(page - 1); const bytes = await pdf.save();
      const file = new File([bytes as unknown as BlobPart], document.file.name, { type: 'application/pdf' });
      setDocument({ file, bytes: new Uint8Array(bytes).buffer as ArrayBuffer, pages: pdf.getPageCount() });
      setAnnotations(old => old.filter(a => a.page !== page).map(a => a.page > page ? { ...a, page: a.page - 1 } : a));
      setComments(old => old.filter(v => v.page !== page).map(v => v.page > page ? { ...v, page: v.page - 1 } : v));
      setStrokes(old => old.filter(v => v.page !== page).map(v => v.page > page ? { ...v, page: v.page - 1 } : v));
      setOcrPages(old => Object.fromEntries(Object.entries(old).filter(([key]) => Number(key) !== page).map(([key, value]) => [String(Number(key) > page ? Number(key) - 1 : Number(key)), value])));
      setOcrWords(old => Object.fromEntries(Object.entries(old).filter(([key]) => Number(key) !== page).map(([key, value]) => [String(Number(key) > page ? Number(key) - 1 : Number(key)), value])));
      setBookmarks(old => old.filter(item => item.page !== page).map(item => item.page > page ? { ...item, page: item.page - 1 } : item));
      setPage(p => Math.min(p, pdf.getPageCount())); setSelectedId(null); setStatus('Page deleted. Page-linked text, comments, drawings, OCR data and bookmarks were adjusted.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not delete page.'); }
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
      setMergeFiles([]);
      setStatus('Merged ' + mergeFiles.length + ' PDFs successfully.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Merge failed.'); }
    finally { setBusy(false); }
  }

  return <main className="app-shell pdf-studio">
    <header className="studio-header">
      <div className="brand"><span className="logo">P</span><div><b>ProPDF Studio</b><small>Edit PDFs in your browser</small></div></div>
      <div className="cloud-account">{cloudUser ? <><span>{cloudUser.email || "Signed in"}</span><button className="sign-in" type="button" onClick={()=>void openFromCloud()}>My cloud files</button><button className="sign-in" type="button" onClick={()=>void signOutCloud()}>Sign out</button></> : <button className="sign-in" type="button" onClick={()=>void signInOrUp()}>Sign in</button>}</div>
    </header>

    <nav className="studio-toolbar" aria-label="PDF editing toolbar">
      <label className="toolbar-button open-file"><input type="file" accept="application/pdf,.pdf" onChange={e=>void openPdf(e.target.files?.[0])}/>Open PDF</label>
      <button className={tool==='edit'?'toolbar-button active':'toolbar-button'} onClick={()=>{setTool('edit');setStatus('Edit Text mode: click original PDF text, then type to replace it.')}}>✎ Edit Text</button>
      <button className={tool==='comment'?'toolbar-button active':'toolbar-button'} disabled={!document} onClick={()=>{setCommentDraft('');setTool('comment');setStatus('Comment mode: click the exact position on the PDF page, then enter your note.');}}>▤ Comment</button>
      <button className={tool==='text'?'toolbar-button active':'toolbar-button'} onClick={()=>{setTool('text');setStatus('Click anywhere on the PDF page to add a new text box.')}}>T&nbsp; Add text</button>
      <button className={tool==='draw'?'toolbar-button active':'toolbar-button'} onClick={()=>{setTool('draw');setStatus('Draw freehand on the PDF page. Drawing is included in the downloaded PDF.')}}>✎ Draw</button>
      <button className={continuousView?'toolbar-button active':'toolbar-button'} disabled={!document||!continuousUrl} onClick={()=>{setContinuousView(v=>!v);setStatus(continuousView?'Returned to editing canvas.':'Continuous PDF view: scroll through every page; switch back to edit.')}}>▤ {continuousView?'Edit current page':'Continuous scroll'}</button>
      <button className="toolbar-button" disabled={!canUndo} onClick={undoEdit}>↶ Undo</button>
      <button className="toolbar-button" disabled={!canRedo} onClick={redoEdit}>↷ Redo</button>
      <input className="toolbar-color" aria-label="Drawing colour" type="color" value={drawColor} onChange={e=>setDrawColor(e.target.value)}/>
      <select className="toolbar-select" aria-label="Drawing width" value={drawWidth} onChange={e=>setDrawWidth(Number(e.target.value))}><option value={1}>1 px</option><option value={2.5}>2.5 px</option><option value={4}>4 px</option><option value={6}>6 px</option></select>
      <input className="toolbar-color" aria-label="Text colour" type="color" value={fontColor} onChange={e=>{setFontColor(e.target.value);if(selected)updateAnnotation(selected.id,{color:e.target.value})}}/>
      <select className="toolbar-select" aria-label="Font size" value={selected?.size||fontSize} onChange={e=>{const v=Number(e.target.value);setFontSize(v);if(selected)updateAnnotation(selected.id,{size:v})}}>{[8,9,10,11,12,14,16,18,20,24,28,32,36,48].map(v=><option key={v} value={v}>{v}px</option>)}</select>
      <span className="toolbar-divider"/>
      <button className="toolbar-button" disabled={!selected} onClick={()=>{if(selected){setAnnotations(old=>old.filter(x=>x.id!==selected.id));setSelectedId(null)}}}>▤ Remove</button>
      <span className="toolbar-divider"/>
      <button className="toolbar-button" disabled={!document||page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>◀</button>
      <label className="toolbar-page">Page <input aria-label="Go to page" type="number" min={1} max={document?.pages||1} disabled={!document} value={page} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=(document?.pages||1))setPage(n)}}/> / {document?.pages||'–'}</label>
      <button className="toolbar-button" disabled={!document||page>=(document?.pages||1)} onClick={()=>setPage(p=>Math.min(document?.pages||1,p+1))}>▶</button>
      <span className="toolbar-divider"/>
      <button className="toolbar-button" disabled={!document||busy} onClick={()=>void runOcr()}>{busy?'Processing OCR…':'OCR all pages'}</button>
      <button className="toolbar-button" disabled={!document} onClick={()=>void rotateCurrentPage()}>↻ Rotate page</button>
      <button className="toolbar-button" disabled={!document||document.pages<=1} onClick={()=>void deleteCurrentPage()}>▣ Delete page</button>
      <button className="toolbar-button" disabled={!document} onClick={()=>void splitPdf()}>⇱ Split PDF</button>
      <label className="toolbar-button merge-file-picker">＋ Add PDFs to merge<input type="file" accept="application/pdf,.pdf" multiple disabled={busy} onChange={event=>{setMergeFiles(Array.from(event.target.files||[]));event.currentTarget.value='';}} /></label>
      <button className="toolbar-button" disabled={mergeFiles.length<2||busy} onClick={()=>void mergePdfs()}>Merge ({mergeFiles.length})</button>
      <button className="toolbar-button" disabled={!document} onClick={()=>setZoom(z=>Math.max(25,z-10))}>−</button>
      <span className="toolbar-zoom">{Math.round(fitZoom*zoom/100)}%</span>
      <button className="toolbar-button" disabled={!document} onClick={()=>setZoom(z=>Math.min(300,z+10))}>＋</button>
      <button className="toolbar-button" type="button" onClick={()=>setShowLeftPanel(v=>!v)}>{showLeftPanel?'Hide left panels':'Show left panels'}</button>
      <button className="toolbar-button" type="button" onClick={()=>setShowRightPanel(v=>!v)}>{showRightPanel?'Hide right panel':'Show right panel'}</button>
      <button className="toolbar-button" disabled={!document||busy} onClick={()=>void saveToCloud()}>☁ Save to cloud</button>
      <button className="toolbar-button primary-toolbar" disabled={!document||busy} onClick={()=>void exportPdf()}>{busy?'Preparing…':'⬇ Download'}</button>
      
    </nav>

    <section className="studio-workspace" style={{gridTemplateColumns:`${showLeftPanel?'82px 112px ':''}minmax(0,1fr)${showRightPanel?' 355px':''}`}}>
      {showLeftPanel && <>
      <aside className="studio-pages">
        <button className={activePanel==='pages'?'side-tab active':'side-tab'} type="button" onClick={()=>setActivePanel('pages')}>▣<span>Pages</span></button>
        <button className={activePanel==='bookmarks'?'side-tab active':'side-tab'} type="button" disabled={!document} onClick={()=>setActivePanel('bookmarks')}>▤<span>Bookmarks</span></button>
        <button className={activePanel==='outline'?'side-tab active':'side-tab'} type="button" disabled={!document} onClick={()=>setActivePanel('outline')}>☷<span>Outline</span></button>
        <button className={activePanel==='search'?'side-tab active':'side-tab'} type="button" disabled={!document} onClick={()=>setActivePanel('search')}>⌕<span>Search</span></button>
      </aside>

      <aside className="studio-thumbnails" aria-label="PDF navigation panel">
        {activePanel==='pages' && (document ? <div className="page-mini-list">{Array.from({length:document.pages},(_,index)=><button key={index+1} className={page===index+1?'page-mini active':'page-mini'} onClick={()=>setPage(index+1)}><span>PDF</span><b>{index+1}</b></button>)}<small>{document.pages} page(s)</small></div> : <div className="thumbnail-empty">Page<br/>thumbnails</div>)}
        {activePanel==='bookmarks' && <div className="nav-results"><b>Bookmarks</b>{bookmarks.length?bookmarks.map((item,i)=><button key={i} onClick={()=>setPage(item.page)}>{item.title}<small>Page {item.page}</small></button>):<p>No PDF bookmarks found in this file.</p>}</div>}
        {activePanel==='outline' && <div className="nav-results"><b>Document outline</b>{bookmarks.length?bookmarks.map((item,i)=><button key={i} onClick={()=>setPage(item.page)}>{item.title}<small>Page {item.page}</small></button>):<p>This PDF does not contain a built-in outline. Use Search to find headings and topics across all pages.</p>}</div>}
        {activePanel==='search' && <div className="nav-results"><b>Find in document</b><div className="search-inline"><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void runSearch()}} placeholder="Search text…"/><button onClick={()=>void runSearch()} disabled={busy}>Find</button></div>{searchResults.map((item,i)=><button key={i} onClick={()=>setPage(item.page)}><span>{item.text}</span><small>Page {item.page}</small></button>)}{searchResults.length===0&&<p>Enter a word or phrase and select Find.</p>}</div>}
      </aside>
      </>}

      <article className="studio-viewer">
        <div className="studio-scroll">
          {document ? (continuousView && continuousUrl ? <iframe className="continuous-pdf-view" title="Continuous PDF pages" src={continuousUrl+'#toolbar=1&navpanes=0&view=FitH'} /> : <div className="page-scroll" ref={stageRef}><div className="pdf-page-stage" onContextMenu={event=>{event.preventDefault();const point=normalizedPoint(event);if(!point)return;const target=event.target as HTMLElement;const annotationEl=target.closest('.pdf-annotation') as HTMLElement|null;const annotation=annotationEl?annotations.find(a=>a.id===annotationEl.getAttribute('data-annotation-id'))||null:null;const hit=textHits.find(h=>h.page===page&&point.x>=h.x&&point.x<=h.x+h.w&&point.y>=h.y&&point.y<=h.y+h.h)||null;const rect=event.currentTarget.getBoundingClientRect();setContextMenu({x:event.clientX-rect.left,y:event.clientY-rect.top,hit,annotation,point});}} onClick={handleStageClick} onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={finishDrawing} onPointerCancel={finishDrawing}>
            <canvas ref={canvasRef}/>
            <svg className="freehand-layer" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Freehand drawing overlay" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',overflow:'visible'}}>{strokes.filter(stroke=>stroke.page===page).map(stroke=><polyline key={stroke.id} points={stroke.points.map(p=>(p.x*1000)+','+(p.y*1000)).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width*1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}</svg>
            {tool==='edit' ? textHits.filter(hit=>hit.page===page && !annotations.some(a=>a.sourceHitId===hit.id)).map(hit=><button key={hit.id} type="button" className="source-text-hit" style={{left:(hit.x*100)+'%',top:(hit.y*100)+'%',width:(Math.max(hit.w,.012)*100)+'%',height:(Math.max(hit.h,.018)*100)+'%'}} title={'Click to edit: '+hit.text} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.preventDefault();e.stopPropagation();editExistingText(hit)}} aria-label={'Edit original PDF text: '+hit.text}/>) : null}
            {annotations.filter(a=>a.page===page).map(a=><div key={a.id} data-annotation-id={a.id} className={'pdf-annotation '+(selectedId===a.id?'selected':'')+(a.coverOriginal?' source-text-edit':'')} style={{left:(a.x*100)+'%',top:(a.y*100)+'%',width:(a.w*100)+'%',height:(a.h*100)+'%',fontFamily:a.font,fontSize:(a.size*fitZoom*zoom/10000)+'px',color:a.color,fontWeight:a.bold?'700':'400',fontStyle:a.italic?'italic':'normal',textDecoration:a.underline?'underline':'none',textAlign:a.align||'left',cursor:'default','--source-mask-color':a.maskColor||'#ffffff'} as React.CSSProperties} onClick={e=>{e.stopPropagation();setSelectedId(a.id);if(tool!=='edit')setTool('select')}}>
              <div className="annotation-drag-strip" role="button" aria-label="Drag text box to move" title="Drag here to move this text box" onPointerDown={event=>beginMove(event,a)} />
              <textarea readOnly={tool!=='edit'} value={a.text} onChange={e=>updateAnnotation(a.id,{text:e.target.value})} onPointerDown={e=>{if(tool!=='edit' && e.button===0)beginMove(e,a)}} onPointerUp={e=>{if(tool==='edit')saveResizedBox(a.id,e.currentTarget)}} autoFocus={Boolean(a.coverOriginal && selectedId===a.id && tool==='edit')} onClick={e=>{e.stopPropagation();setSelectedId(a.id);if(tool!=='edit')setTool('select')}} onFocus={e=>{setSelectedId(a.id);if(a.coverOriginal && tool==='edit')e.currentTarget.select()}} onBlur={e=>saveResizedBox(a.id,e.currentTarget)} aria-label="Editable PDF text box" style={{display:'block',width:'100%',height:'100%',minWidth:0,minHeight:0,boxSizing:'border-box',margin:0,padding:'1px 2px',border:'1px solid '+(selectedId===a.id?'#2878d0':'transparent'),outline:'none',background:a.coverOriginal?'#ffffff':'rgba(255,255,255,.94)',color:a.color,fontFamily:a.font,fontSize:'inherit',fontWeight:a.bold?'700':'400',fontStyle:a.italic?'italic':'normal',textDecoration:a.underline?'underline':'none',textAlign:a.align||'left',lineHeight:1.05,resize:a.coverOriginal?'none':'both',overflow:a.coverOriginal?'hidden':'auto',whiteSpace:'pre-wrap'}}/>
              {(['n','s','e','w','ne','nw','se','sw'] as const).filter(edge=>!a.coverOriginal || ['e','s','se'].includes(edge)).map(edge=><button key={edge} type="button" aria-label={'Resize text box '+edge} className={'resize-handle resize-'+edge} onPointerDown={event=>beginResize(event,a,edge)}/>)}
              <span className="resize-label">Drag to resize</span>
            </div>)}
            {contextMenu && <div className="pdf-context-menu" style={{left:Math.min(contextMenu.x,Math.max(8,(canvasRef.current?.clientWidth||500)-170)),top:Math.min(contextMenu.y,Math.max(8,(canvasRef.current?.clientHeight||700)-100))}} onClick={e=>e.stopPropagation()}><button type="button" onClick={()=>{const hit=contextMenu.hit;const ann=contextMenu.annotation;setContextMenu(null);if(ann){setSelectedId(ann.id);setTool('edit');}else if(hit){editExistingText(hit);}else{setStatus('Right-click directly on text to edit it.');}}}>✎ Edit Text</button><button type="button" onClick={()=>{const point=contextMenu.point;setContextMenu(null);addCommentAt(point);}}>▤ Add Comment</button><button type="button" onClick={()=>setContextMenu(null)}>Cancel</button></div>}\n            <svg className="comment-connectors" viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{pointerEvents:'auto'}}>{comments.filter(c=>c.page===page).map(c=>{const bx=(c.boxX??Math.min(.74,Math.max(.02,c.x+.02)))*1000;const by=(c.boxY??Math.min(.88,Math.max(.02,c.y+.01)))*1000;const d='M '+(c.x*1000)+' '+(c.y*1000)+' L '+(bx+120)+' '+(by+35);return <g key={c.id}><path d={d} stroke="#d28b27" strokeOpacity="0.001" strokeWidth="24" fill="none" style={{pointerEvents:'stroke',cursor:'grab',touchAction:'none'}} onPointerDown={e=>beginConnectorMove(e,c)} aria-label="Drag dotted comment connector"/><path d={d} stroke="#d28b27" strokeWidth="2.4" fill="none" strokeDasharray="6 5" style={{pointerEvents:'none'}}/><circle cx={c.x*1000} cy={c.y*1000} r="8" fill="#d28b27" stroke="#fff" strokeWidth="3" style={{pointerEvents:'none'}}/></g>})}</svg>
            {comments.filter(c=>c.page===page).map((c,i)=><div key={c.id} className="comment-note" style={{'--comment-x':((c.boxX??Math.min(.74,Math.max(.02,c.x+.02)))*100)+'%','--comment-y':((c.boxY??Math.min(.88,Math.max(.02,c.y+.01)))*100)+'%'} as React.CSSProperties} onPointerDown={e=>beginCommentMove(e,c)} title="Drag anywhere on this comment box to move it"><b className="comment-drag-handle">Comment {i+1} · Page {c.page} <span>↕ Move</span></b><span>{c.text}</span><button type="button" aria-label="Delete comment" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setComments(old=>old.filter(v=>v.id!==c.id));setStatus('Comment deleted.')}}>×</button></div>)}
          </div></div>) : <div className="studio-empty">
            <div className="studio-pdf-icon">PDF</div><h2>Open a PDF to start</h2>
            <p>All pages open together. Edit text, add comments, highlight, white-out,<br/> draw, rotate, delete pages, merge, split and download. Everything happens<br/> in your browser.</p>
            <span>or drop a file here</span>
          </div>}
        </div>
        <div className="studio-statusbar"><span>{document?'Page '+page+' of '+document.pages:status}</span><div><button disabled={!document} onClick={()=>setPage(1)}>⏮</button><button disabled={!document||page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>◀</button><b>{document?page:'–'}</b><button disabled={!document||page>=(document?.pages||1)} onClick={()=>setPage(p=>Math.min(document?.pages||1,p+1))}>▶</button><button disabled={!document} onClick={()=>setPage(document?.pages||1)}>⏭</button></div><span className="bottom-zoom">⌕　{Math.round(fitZoom*zoom/100)}%　<button disabled={!document} onClick={()=>setZoom(100)}>⛶</button></span></div>
      </article>

      {showRightPanel && <aside className="studio-properties">
        <div className="property-heading"><b>Text Styles (20 styles)</b><span>⌃</span></div>
        <div className="style-grid">{TEXT_STYLES.map((style,i)=><button key={style.id} className={(selected?.styleId||activeStyleId)===style.id?'style-choice active':'style-choice'} onClick={()=>applyTextStyle(style.id)}><span>Aa</span><small>{i+1}. {style.label}</small></button>)}</div>
        <div className="property-heading size-heading"><b>↗　Text Box Size Controls</b><span>⌃</span></div>
        <div className="box-size-control"><label htmlFor="box-width">Width:</label><button disabled={!selected} onClick={()=>resizeSelectedBox('w',-.02)}>−</button><input id="box-width" type="range" min="8" max="95" value={Math.round((selected?.w||.34)*100)} disabled={!selected} onChange={e=>selected&&updateAnnotation(selected.id,{w:Number(e.target.value)/100})}/><button disabled={!selected} onClick={()=>resizeSelectedBox('w',.02)}>＋</button><b>{selected?Math.round(selected.w*100):100}%</b></div>
        <div className="box-size-control"><label htmlFor="box-height">Height:</label><button disabled={!selected} onClick={()=>resizeSelectedBox('h',-.02)}>−</button><input id="box-height" type="range" min="4" max="80" value={Math.round((selected?.h||.12)*100)} disabled={!selected} onChange={e=>selected&&updateAnnotation(selected.id,{h:Number(e.target.value)/100})}/><button disabled={!selected} onClick={()=>resizeSelectedBox('h',.02)}>＋</button><b>{selected?Math.round(selected.h*100):100}%</b></div>
        <label className="resize-check"><input type="checkbox" checked readOnly/> Show resize handles</label>
        <div className="property-heading size-heading"><b>⚙　Text Formatting</b><span>⌃</span></div>
        <div className="formatting-panel">
          <label htmlFor="font-family">Font family</label><select id="font-family" value={selected?.font||font} onChange={e=>{setFont(e.target.value);if(selected)updateAnnotation(selected.id,{font:e.target.value})}}>{FONT_FAMILIES.map(f=><option key={f} value={f}>{f}</option>)}</select>
          <label htmlFor="font-size">Font size (pt)</label><div className="format-size"><button onClick={()=>{const v=Math.max(6,(selected?.size||fontSize)-1);setFontSize(v);if(selected)updateAnnotation(selected.id,{size:v})}}>−</button><input id="font-size" type="number" min="6" max="96" value={selected?.size||fontSize} onChange={e=>{const v=Math.max(6,Math.min(96,Number(e.target.value)||6));setFontSize(v);if(selected)updateAnnotation(selected.id,{size:v})}}/><button onClick={()=>{const v=Math.min(96,(selected?.size||fontSize)+1);setFontSize(v);if(selected)updateAnnotation(selected.id,{size:v})}}>＋</button></div>
          <label htmlFor="font-color">Text colour</label><input id="font-color" type="color" value={selected?.color||fontColor} onChange={e=>{setFontColor(e.target.value);if(selected)updateAnnotation(selected.id,{color:e.target.value})}}/>

          <label>Selected text box</label><p className="selection-note">{selected?Math.round(selected.w*100)+'% wide × '+Math.round(selected.h*100)+'% high':'Select a text box on the page to edit its dimensions.'}</p>
          <small>{comments.length} comment(s) on this document. Use the top Comment button or right-click the page.</small>
        </div>
      </aside>}
    </section>
    <footer className="studio-footer"><span role="status">{status}</span><span>ProPDF Studio</span></footer>
  </main>;
}
