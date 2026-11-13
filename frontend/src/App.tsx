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

type TextAnnotation = { id: string; page: number; kind?: 'whiteout'; text: string; x: number; y: number; w: number; h: number; maskColor?: string; font: string; size: number; color: string; styleId?: string; bold?: boolean; italic?: boolean; underline?: boolean; align?: 'left'|'center'|'right'; coverOriginal?: boolean; sourceHitId?: string; originalText?: string; sourceRect?: {x0:number;y0:number;x1:number;y1:number} };
type PdfTextHit = { id: string; page: number; text: string; x: number; y: number; w: number; h: number; fontSize: number; color?: string };
type PdfComment = { id: string; page: number; x: number; y: number; boxX?: number; boxY?: number; text: string };
type OcrWord = { text: string; x: number; y: number; w: number; h: number };
type DrawStroke = { id: string; page: number; color: string; width: number; points: Array<{x:number;y:number}> };
type EditorSnapshot = { annotations: TextAnnotation[]; comments: PdfComment[]; strokes: DrawStroke[] };
type ResizeSession = { id: string; edge: string; startX: number; startY: number; start: TextAnnotation; pageWidth: number; pageHeight: number };

export default function App() {
  const [document, setDocument] = useState<PdfDocument | null>(null);
  const sourceFileHandleRef = useRef<any>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [cloudUser, setCloudUser] = useState<{id:string;email?:string}|null>(null);
  const [page, setPage] = useState(1);
  const [continuousView, setContinuousView] = useState(false);
  const [continuousUrl, setContinuousUrl] = useState('');
  const [zoom, setZoom] = useState(100);
  const [fitZoom, setFitZoom] = useState(100);
  const [tool, setTool] = useState<'select'|'edit'|'text'|'comment'|'draw'|'erase'|'whiteout'>('edit');
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [comments, setComments] = useState<PdfComment[]>([]);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [drawColor, setDrawColor] = useState('#d62728');
  const [eraseBrushColor, setEraseBrushColor] = useState('#ffffff');
  const [searchHighlights, setSearchHighlights] = useState<PdfTextHit[]>([]);
  const [downloadFallback, setDownloadFallback] = useState<{url:string;name:string}|null>(null);
  const [drawWidth, setDrawWidth] = useState(2.5);
  const drawingRef = useRef<DrawStroke | null>(null);
  const drawingBaseRef = useRef<EditorSnapshot | null>(null);
  const whiteoutDragRef = useRef<{start:{x:number;y:number};current:{x:number;y:number};page:number}|null>(null);
  const [whiteoutDraft, setWhiteoutDraft] = useState<{x:number;y:number;w:number;h:number}|null>(null);
  const undoRef = useRef<EditorSnapshot[]>([]);
  const redoRef = useRef<EditorSnapshot[]>([]);
  const lastSnapshotRef = useRef<EditorSnapshot | null>(null);
  const applyingHistoryRef = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(12);
  const [fontColor, setFontColor] = useState('#17243b');
  const [fontAssets, setFontAssets] = useState<Record<string, Uint8Array>>({});
  const [activeStyleId, setActiveStyleId] = useState('body');
  const [commentDraft, setCommentDraft] = useState('');
  const [contextMenu, setContextMenu] = useState<{x:number;y:number;hit:PdfTextHit|null;annotation:TextAnnotation|null;point:{x:number;y:number}}|null>(null);
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const pageDragRef = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Open a PDF to start editing.');
  const [activePanel, setActivePanel] = useState<'pages'|'bookmarks'|'outline'|'search'>('pages');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(194);
  const [rightPanelWidth, setRightPanelWidth] = useState(355);
  const [resizingPanel, setResizingPanel] = useState<'left'|'right'|null>(null);
  const [zoomInput, setZoomInput] = useState('100');
  const [bookmarks, setBookmarks] = useState<Array<{title:string; page:number}>>([]);
  const [textHits, setTextHits] = useState<PdfTextHit[]>([]);
  const [continuousHits, setContinuousHits] = useState<PdfTextHit[]>([]);
  const continuousCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
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
  const pageMetricsRef = useRef<Map<number, {width:number;height:number;scale:number}>>(new Map());
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
    try { const {data,error}=await supabase.from('saved_documents').select('file_name,storage_path,editor_state,created_at').order('created_at',{ascending:false}).limit(30); if(error) throw error; if(!data?.length) { setStatus('No cloud documents found.'); return; } const promptText='Choose document number:\n'+data.map((item,index)=>(index+1)+'. '+item.file_name+' — '+new Date(item.created_at).toLocaleString()).join('\n'); const choice=window.prompt(promptText,'1'); if(choice===null) return; const record=data[Number(choice)-1]; if(!record) throw new Error('Invalid document number.'); const downloaded=await supabase.storage.from('pdf-documents').download(record.storage_path); if(downloaded.error) throw downloaded.error; await openPdf(new File([downloaded.data],record.file_name,{type:'application/pdf'})); const state=record.editor_state as any; setAnnotations(state.annotations||[]); setComments(state.comments||[]); setStrokes(state.strokes||[]); setOcrPages(state.ocrPages||{}); setOcrWords(state.ocrWords||{}); if(state.page) setPage(state.page); if(state.zoom) setZoom(state.zoom); setStatus('Loaded '+record.file_name+' from your private cloud.'); }    catch(error) { setStatus(error instanceof Error ? 'Cloud open failed: '+error.message : 'Cloud open failed.'); } finally { setBusy(false); }
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
    async function renderPage() {      if (!document) return;
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
        pageMetricsRef.current.set(page, { width: viewport.width, height: viewport.height, scale: viewport.scale });
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
        const rawHits: PdfTextHit[] = (content.items as any[])
          .filter(item => typeof item.str === 'string' && item.str.trim() && Array.isArray(item.transform))
          .map((item:any,index:number) => {
            const m = pdfjs.Util.transform(viewport.transform, item.transform);
            const glyphHeight = Math.max(3, Math.hypot(m[2], m[3]));
            const ux = Math.hypot(m[0], m[1]) || 1;
            const vx = Math.hypot(m[2], m[3]) || glyphHeight;
            const glyphWidth = Math.max(4, (Number(item.width) || item.str.length * glyphHeight * .45) * viewport.scale);
            const uxX = m[0] / ux, uxY = m[1] / ux;
            const vxX = m[2] / vx, vxY = m[3] / vx;
            const x0 = m[4], y0 = m[5];
            const corners = [
              [x0, y0], [x0 + uxX * glyphWidth, y0 + uxY * glyphWidth],
              [x0 + vxX * glyphHeight, y0 + vxY * glyphHeight],
              [x0 + uxX * glyphWidth + vxX * glyphHeight, y0 + uxY * glyphWidth + vxY * glyphHeight]
            ];
            const pad = .5 * (window.devicePixelRatio || 1);
            const left = Math.max(0, Math.min(...corners.map(p=>p[0])) - pad);
            const top = Math.max(0, Math.min(...corners.map(p=>p[1])) - pad);
            const right = Math.min(viewport.width, Math.max(...corners.map(p=>p[0])) + pad);
            const bottom = Math.min(viewport.height, Math.max(...corners.map(p=>p[1])) + pad);
            return { id: page + '-' + index, page, text:item.str, x:left/viewport.width, y:top/viewport.height,
              w:Math.max(.004,(right-left)/viewport.width), h:Math.max(.012,(bottom-top)/viewport.height),
              fontSize:glyphHeight/Math.max(.01,viewport.scale) };
          });
        // Build selectable text-line blocks from adjacent PDF text runs. This lets
        // users replace a whole visible line instead of fighting tiny per-run targets.
        const sortedHits = [...rawHits].sort((a,b) => (a.y+a.h/2)-(b.y+b.h/2) || a.x-b.x);
        const lineGroups: PdfTextHit[][] = [];
        for (const hit of sortedHits) {
          const line = lineGroups.find(group => {
            const first = group[0];
            const centerA = first.y + first.h/2, centerB = hit.y + hit.h/2;
            return Math.abs(centerA-centerB) <= Math.max(first.h,hit.h)*.55;
          });
          if (line) line.push(hit); else lineGroups.push([hit]);
        }
        const hits: PdfTextHit[] = [];
        for (const line of lineGroups) {
          line.sort((a,b)=>a.x-b.x);
          let block: PdfTextHit[] = [];
          const flush = () => {
            if (!block.length) return;
            const first=block[0];
            const x=Math.min(...block.map(v=>v.x)), y=Math.min(...block.map(v=>v.y));
            const right=Math.max(...block.map(v=>v.x+v.w)), bottom=Math.max(...block.map(v=>v.y+v.h));
            const text=block.map((v,i)=>i===0?v.text:((v.x-(block[i-1].x+block[i-1].w))>Math.max(v.h,block[i-1].h)*.18?' ':'')+v.text).join('');
            hits.push({id:first.id+'-line',page,text,x,y,w:right-x,h:bottom-y,fontSize:block.reduce((sum,v)=>sum+v.fontSize,0)/block.length});
            block=[];
          };
          for (const hit of line) {
            const previous=block[block.length-1];
            if (previous && hit.x-(previous.x+previous.w)>Math.max(hit.h,previous.h)*1.8) flush();
            block.push(hit);
          }
          flush();
        }
        if (!cancelled && hits.length) {
          setTextHits(hits);
        } else if (!cancelled) {
          // Image-only/scanned page: automatically OCR it so Edit Text can target recognized words.
          const cachedWords = ocrWords[page];
          if (cachedWords?.length) {
            setTextHits(cachedWords.map((word, index) => ({
              id: 'ocr-' + page + '-' + index, page, text: word.text,
              x: word.x, y: word.y, w: word.w, h: word.h,
              fontSize: Math.max(7, Math.min(24, word.h * viewport.height * 0.72 / Math.max(.01, viewport.scale)))
            })));
          } else {
            setTextHits([]);
            try {
              setStatus('Scanned page detected. Preparing editable text with OCR…');
              const { createWorker } = await import('tesseract.js');
              const worker = await createWorker('eng');
              const ocrViewport = pdfPage.getViewport({ scale: 2 });
              const ocrCanvas = window.document.createElement('canvas');
              ocrCanvas.width = Math.ceil(ocrViewport.width);
              ocrCanvas.height = Math.ceil(ocrViewport.height);
              const ocrContext = ocrCanvas.getContext('2d');
              if (!ocrContext) throw new Error('OCR canvas unavailable.');
              await pdfPage.render({ canvasContext: ocrContext, viewport: ocrViewport }).promise;
              const result: any = await worker.recognize(ocrCanvas);
              await worker.terminate();
              const words: OcrWord[] = (result.data.words || [])
                .filter((word: any) => word.text?.trim() && word.confidence >= 35)
                .map((word: any) => ({
                  text: word.text.trim(),
                  x: Math.max(0, Math.min(1, word.bbox.x0 / ocrViewport.width)),
                  y: Math.max(0, Math.min(1, word.bbox.y0 / ocrViewport.height)),
                  w: Math.max(.004, Math.min(1, (word.bbox.x1 - word.bbox.x0) / ocrViewport.width)),
                  h: Math.max(.008, Math.min(1, (word.bbox.y1 - word.bbox.y0) / ocrViewport.height))
                }));
              if (!cancelled) {
                setOcrWords(old => ({ ...old, [page]: words }));
                setOcrPages(old => ({ ...old, [page]: result.data.text || '' }));
                setTextHits(words.map((word, index) => ({
                  id: 'ocr-' + page + '-' + index, page, text: word.text,
                  x: word.x, y: word.y, w: word.w, h: word.h, fontSize: 10
                })));
                setStatus('OCR ready. Click any recognized word to edit it.');
              }
              ocrCanvas.width = 0; ocrCanvas.height = 0;
            } catch (ocrError) {
              if (!cancelled) setStatus('OCR could not process this page: ' + (ocrError instanceof Error ? ocrError.message : 'unknown error'));
            }
          }
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unable to render PDF page.');
      }
    }
    void renderPage();
    return () => { cancelled = true; };
  }, [document, page, zoom]);

  useEffect(() => {
    if (!continuousView || !document) return;
    const currentDocument = document;
    let cancelled = false;
    async function renderAllPages() {
      try {
        const loading = pdfjs.getDocument({ data: new Uint8Array(currentDocument.bytes.slice(0)) });
        const pdf = await loading.promise;
        const allHits: PdfTextHit[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) return;
          // React may still be attaching refs for a long document when this
          // effect starts. Wait for each page canvas instead of silently skipping it.
          let canvas = continuousCanvasRefs.current.get(pageNumber);
          for (let attempt = 0; !canvas && attempt < 30 && !cancelled; attempt++) {
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
            canvas = continuousCanvasRefs.current.get(pageNumber);
          }
          if (cancelled) return;
          if (!canvas) throw new Error('Continuous Scroll could not initialize page ' + pageNumber + ' of ' + pdf.numPages + '. Please switch Continuous Scroll off and on, then retry.');
          const pdfPage = await pdf.getPage(pageNumber);
          const base = pdfPage.getViewport({ scale: 1 });
          const availableWidth = Math.min(900, Math.max(300, (stageRef.current?.clientWidth || 760) - 40));
          const fitScale = availableWidth / base.width;
          const viewport = pdfPage.getViewport({ scale: fitScale * zoom / 100 });
          pageMetricsRef.current.set(pageNumber, { width: viewport.width, height: viewport.height, scale: viewport.scale });
          const dpr = Math.min(1.25, window.devicePixelRatio || 1);
          canvas.width = Math.round(viewport.width * dpr);
          canvas.height = Math.round(viewport.height * dpr);
          canvas.style.width = viewport.width + 'px';
          canvas.style.height = viewport.height + 'px';
          const slot = canvas.closest('.continuous-page-stage') as HTMLElement|null;
          if (slot) { slot.style.width = viewport.width + 'px'; slot.style.height = viewport.height + 'px'; }
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not create canvas context for page ' + pageNumber + '.');
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          await pdfPage.render({ canvasContext: ctx, viewport }).promise;
          const content = await pdfPage.getTextContent();
          (content.items as any[]).filter(item => typeof item.str === 'string' && item.str.trim() && Array.isArray(item.transform)).forEach((item:any,index:number) => {
            const m = pdfjs.Util.transform(viewport.transform, item.transform);
            const glyphHeight = Math.max(3, Math.hypot(m[2], m[3]));
            const ux = Math.hypot(m[0], m[1]) || 1, vx = Math.hypot(m[2], m[3]) || glyphHeight;
            const glyphWidth = Math.max(4, (Number(item.width) || item.str.length * glyphHeight * .45) * viewport.scale);
            const uxX=m[0]/ux, uxY=m[1]/ux, vxX=m[2]/vx, vxY=m[3]/vx, x0=m[4], y0=m[5];
            const corners=[[x0,y0],[x0+uxX*glyphWidth,y0+uxY*glyphWidth],[x0+vxX*glyphHeight,y0+vxY*glyphHeight],[x0+uxX*glyphWidth+vxX*glyphHeight,y0+uxY*glyphWidth+vxY*glyphHeight]];
            const pad=.75*(window.devicePixelRatio||1);
            const left=Math.max(0,Math.min(...corners.map(p=>p[0]))-pad), top=Math.max(0,Math.min(...corners.map(p=>p[1]))-pad);
            const right=Math.min(viewport.width,Math.max(...corners.map(p=>p[0]))+pad), bottom=Math.min(viewport.height,Math.max(...corners.map(p=>p[1]))+pad);
            allHits.push({id:pageNumber+'-'+index,page:pageNumber,text:item.str,x:left/viewport.width,y:top/viewport.height,w:Math.max(.004,(right-left)/viewport.width),h:Math.max(.012,(bottom-top)/viewport.height),fontSize:glyphHeight/Math.max(.01,viewport.scale)});
          });
        }
        if (!cancelled) {
          // Scanned pages still get selectable word targets when OCR has already been run.
          const embeddedPages = new Set(allHits.map(hit => hit.page));
          Object.entries(ocrWords).forEach(([pageKey, words]) => {
            const pageNumber = Number(pageKey);
            if (embeddedPages.has(pageNumber)) return;
            words.forEach((word, index) => allHits.push({ id:'ocr-'+pageNumber+'-'+index, page:pageNumber, text:word.text, x:word.x, y:word.y, w:word.w, h:word.h, fontSize:Math.max(7, Math.min(24, word.h * (pageMetricsRef.current.get(pageNumber)?.height || 700) * .72 / Math.max(.01, pageMetricsRef.current.get(pageNumber)?.scale || 1))) }));
          });
          setContinuousHits(allHits);
        }
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : 'Unable to render continuous PDF pages.');
      }
    }
    void renderAllPages();
    return () => { cancelled = true; };
  }, [continuousView, document, zoom, ocrWords]);

  useEffect(() => {
    if (!resizingPanel) return;
    const move = (event: PointerEvent) => {
      if (resizingPanel === 'left') setLeftPanelWidth(Math.max(150, Math.min(520, event.clientX - 82)));
      else setRightPanelWidth(Math.max(230, Math.min(620, window.innerWidth - event.clientX)));
    };
    const stop = () => setResizingPanel(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
    window.document.body.style.cursor = 'col-resize';
    window.document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.document.body.style.cursor = '';
      window.document.body.style.userSelect = '';
    };
  }, [resizingPanel]);

  useEffect(() => {
    // Capture at window level so Chromium never applies its native page zoom.
    // Only wheel gestures originating inside the PDF viewer change PDF zoom.
    const onPdfWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as Element | null;
      if (!target?.closest('.studio-viewer .studio-scroll')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setZoom(value => Math.max(25, Math.min(500, value + (event.deltaY < 0 ? 10 : -10))));
    };
    window.addEventListener('wheel', onPdfWheel, { passive: false, capture: true });
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (
        target.isContentEditable ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT'
      );
      const command = event.ctrlKey || event.metaKey;

      // Save always creates a downloadable, edited PDF. Avoid relying on the
      // optional File System Access API / overwrite permission for Ctrl+S.
      if (command && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        event.stopPropagation();
        if (document && !busy) void exportPdf(false);
        return;
      }
      if (command && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (document && !busy) void confirmAndSavePdf();
        return;
      }

      // Keep the browser's native undo while the user is typing in a field;
      // otherwise undo the latest editor operation.
      if (command && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        if (!isTyping) {
          event.preventDefault();
          if (!busy) undoEdit();
        }
        return;
      }

      // Delete removes the currently selected editor object, not characters
      // from a text field. Original PDF text edits are represented as objects.
      if (selectedId && !busy && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const step = event.shiftKey ? 0.01 : 0.004;
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        setAnnotations(old => old.map(item => item.id === selectedId ? {...item,x:Math.max(0,Math.min(1-item.w,item.x+dx)),y:Math.max(0,Math.min(1-item.h,item.y+dy))} : item));
        return;
      }

      if (event.key === 'Delete' && !isTyping && selectedId && !busy) {
        event.preventDefault();
        setAnnotations(old => old.filter(a => a.id !== selectedId));
        setSelectedId(null);
        setEditingTextId(null);
        setStatus('Selected text or object deleted.');
        return;
      }

      if (command && event.key === '+') setZoom(z => Math.min(300, z + 10));
      if (command && event.key === '-') setZoom(z => Math.max(25, z - 10));
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onPdfWheel, true);
    };
  }, [selectedId, document, busy, annotations, comments, strokes, ocrWords]);

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
        const didDrag = Math.hypot(event.clientX-moving.startX, event.clientY-moving.startY) > 3;
        setAnnotations(old=>old.map(item=>item.id===moving.id?{...item,x,y,...(didDrag && item.sourceHitId ? {coverOriginal:true} : {})}:item)); return;
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
    const canvas = continuousView ? (continuousCanvasRefs.current.get(annotation.page) || null) : canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    moveRef.current = { id: annotation.id, edge: 'move', startX: event.clientX, startY: event.clientY, start: { ...annotation }, pageWidth: rect.width, pageHeight: rect.height };
    setSelectedId(annotation.id);
  }

  function beginResize(event: ReactPointerEvent<HTMLButtonElement>, annotation: TextAnnotation, edge: string) {
    event.preventDefault();
    event.stopPropagation();
    const canvas = continuousView ? (continuousCanvasRefs.current.get(annotation.page) || null) : canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    resizeRef.current = {
      id: annotation.id, edge, startX: event.clientX, startY: event.clientY,
      start: { ...annotation }, pageWidth: rect.width, pageHeight: rect.height
    };
    setSelectedId(annotation.id);
  }

  async function openPdfFromPicker() {
    const picker = (window as any).showOpenFilePicker;
    if (typeof picker !== 'function') { documentInputRef.current?.click(); return; }
    try {
      const [handle] = await picker({ multiple: false, types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }] });
      if (!handle) return;
      await openPdf(await handle.getFile(), handle);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus(error instanceof Error ? error.message : 'Could not open the selected PDF.');
    }
  }

  async function openPdf(file?: File, fileHandle?: any) {
    if (!file) return;
    if (fileHandle) sourceFileHandleRef.current = fileHandle;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setStatus('Please select a PDF file.'); return; }
    try {
      setStatus('Loading PDF…');
      const bytes = await file.arrayBuffer();
      const parsed = await PDFDocument.load(bytes);
      setDocument({ file, bytes, pages: parsed.getPageCount() });
      setContinuousView(false);
      pageMetricsRef.current.clear();
      continuousCanvasRefs.current.clear();
      const loading = pdfjs.getDocument({data:new Uint8Array(bytes.slice(0))});
      const pdfView = await loading.promise;
      const outline = await pdfView.getOutline();
      const entries:Array<{title:string;page:number}> = [];
      const visit = async (nodes:any[]) => { for (const node of nodes || []) { let target:any=node.dest; if (typeof target === 'string') target=await pdfView.getDestination(target); let targetPage=1; if (Array.isArray(target) && target[0]) { try { targetPage=(await pdfView.getPageIndex(target[0]))+1; } catch {} } entries.push({title:String(node.title||'Untitled bookmark'),page:targetPage}); if (node.items?.length) await visit(node.items); } };
      await visit(outline || []); setBookmarks(entries); setSearchResults([]); setTextHits([]);
      setPage(1); setZoom(100); setActivePanel('pages'); setTool('edit'); setAnnotations([]); setComments([]); setStrokes([]); setOcrPages({}); setOcrWords({}); undoRef.current=[]; redoRef.current=[]; lastSnapshotRef.current=null; setSelectedId(null);
      setStatus(file.name + ' · ' + parsed.getPageCount() + ' pages. Edit Text is active: click any existing PDF text to change it.');
    } catch { setStatus('Could not open this PDF. It may be damaged or password protected.'); }
  }

  function normalizedPoint(event: { clientX: number; clientY: number; currentTarget?: EventTarget | null }) {
    const target = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    const stage = target?.closest('.continuous-page-stage') as HTMLElement|null;
    const canvas = stage?.querySelector('canvas') || canvasRef.current;
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
    // Page-level fallback: transparent hit buttons can be difficult to tap on dense tables.
    if (tool === 'edit') {
      const hit = textHits.filter(item => item.page === page).map(item => {
        const dx = point.x < item.x ? item.x - point.x : point.x > item.x + item.w ? point.x - (item.x + item.w) : 0;
        const dy = point.y < item.y ? item.y - point.y : point.y > item.y + item.h ? point.y - (item.y + item.h) : 0;
        return { item, distance: Math.hypot(dx, dy) };
      }).filter(entry => entry.distance <= .012).sort((a,b) => a.distance - b.distance)[0]?.item;
      if (hit) { editExistingText(hit); return; }
    }
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

  function sampleTextAppearance(hit: PdfTextHit) {
    const canvas = continuousView ? (continuousCanvasRefs.current.get(hit.page) || canvasRef.current) : canvasRef.current;
    if (!canvas || !canvas.width || !canvas.height) return { maskColor:'#ffffff', color:'#222222' };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { maskColor:'#ffffff', color:'#222222' };
    const x = hit.x * canvas.width, y = hit.y * canvas.height;
    const w = Math.max(2, hit.w * canvas.width), h = Math.max(2, hit.h * canvas.height);
    const margin = Math.max(2, Math.round((window.devicePixelRatio || 1) * 2));    const buckets = new Map<string,{count:number;rgb:[number,number,number]}>();
    const add = (data:Uint8ClampedArray) => {
      const rgbValue:[number,number,number] = [data[0],data[1],data[2]];
      const key = rgbValue.map(v=>Math.round(v/12)).join(',');
      const old = buckets.get(key) || {count:0,rgb:rgbValue};
      old.count++; buckets.set(key,old);
    };
    // Sample a perimeter outside the glyphs. It is less likely to mistake
    // antialiased letter pixels for the page/cell background.
    const steps = 24;
    for (let i=0;i<=steps;i++) {
      const t=i/steps;
      for (const [sx,sy] of [[x+w*t,y-margin],[x+w*t,y+h+margin],[x-margin,y+h*t],[x+w+margin,y+h*t]]) {
        const px=Math.max(0,Math.min(canvas.width-1,Math.round(sx)));
        const py=Math.max(0,Math.min(canvas.height-1,Math.round(sy)));
        add(ctx.getImageData(px,py,1,1).data);
      }
    }
    const bgEntry=[...buckets.values()].sort((a,b)=>b.count-a.count)[0];
    const bg=bgEntry?.rgb || [255,255,255];
    const bgL=bg[0]*.299+bg[1]*.587+bg[2]*.114;
    const inkBuckets=new Map<string,{count:number;rgb:[number,number,number]}>();
    const x0=Math.max(0,Math.floor(x)),y0=Math.max(0,Math.floor(y));
    const x1=Math.min(canvas.width,Math.ceil(x+w)),y1=Math.min(canvas.height,Math.ceil(y+h));
    const stride=Math.max(1,Math.floor(Math.min(w,h)/18));
    for(let py=y0;py<y1;py+=stride) for(let px=x0;px<x1;px+=stride) {
      const d=ctx.getImageData(px,py,1,1).data;
      const lum=d[0]*.299+d[1]*.587+d[2]*.114;
      if(Math.abs(lum-bgL)<35) continue;
      const rgbValue:[number,number,number]=[d[0],d[1],d[2]];
      const key=rgbValue.map(v=>Math.round(v/16)).join(',');
      const old=inkBuckets.get(key)||{count:0,rgb:rgbValue};
      old.count++;inkBuckets.set(key,old);
    }
    const inkEntry=[...inkBuckets.values()].sort((a,b)=>b.count-a.count)[0];
    const toHex=(c:number[])=>'#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
    return {maskColor:toHex(bg),color:inkEntry?toHex(inkEntry.rgb):'#222222'};
  }

  function editExistingText(hit: PdfTextHit) {
    const existing = annotations.find(item => item.sourceHitId === hit.id);
    if (existing) {
      setSelectedId(existing.id);
      setEditingTextId(existing.id);
      setTool('edit');
      setStatus('Original text selected. Type your replacement; the background mask and text box will adjust as needed.');
      return;
    }
    const id = crypto.randomUUID();
    const style = TEXT_STYLES.find(item=>item.id==='body') || TEXT_STYLES[6];
    // Edit in-place: anchor the replacement textarea to the exact original
    // PDF text run bounds. Do not create a separate, offset text box.
    // Give the on-screen mask a tiny safety margin around the glyphs.
    // Keep sourceRect unchanged: the export endpoint resolves and removes the
    // actual native PDF text independently from this visual editing overlay.
    const targetCanvas = continuousView ? continuousCanvasRefs.current.get(hit.page) : canvasRef.current;
    const pageWidth = targetCanvas?.clientWidth || pageMetricsRef.current.get(hit.page)?.width || 760;
    const pageHeight = targetCanvas?.clientHeight || pageMetricsRef.current.get(hit.page)?.height || 1000;
    const boxX = Math.max(0, hit.x);
    const boxY = Math.max(0, hit.y);
    const boxW = Math.min(1 - boxX, Math.max(2 / pageWidth, hit.w));
    const boxH = Math.min(1 - boxY, Math.max(3 / pageHeight, hit.h));
    // Estimate the cell/page background and original glyph colour from rendered pixels.
    const appearance = sampleTextAppearance(hit);
    const maskColor = appearance.maskColor;
    const annotation: TextAnnotation = {
      id, page: hit.page, text: hit.text, originalText: hit.text, sourceRect: { x0: hit.x, y0: hit.y, x1: hit.x + hit.w, y1: hit.y + hit.h }, x: boxX, y: boxY, w: boxW, h: boxH, maskColor,
      font: style.font, size: Math.max(6, Math.min(36, hit.fontSize)),
      color: appearance.color, styleId: 'body', align: 'left', coverOriginal: false, sourceHitId: hit.id
    };
    setAnnotations(old => [...old, annotation]);
    setSelectedId(id);
    setEditingTextId(id);
    setTool('edit');
    setStatus('Text selected. Edit while Edit Text is active; switch to Select by clicking the selected text again, then drag the text itself to move it.');
  }

  function markNativeTextDeleted(hit: PdfTextHit) {
    const existing = annotations.find(item => item.sourceHitId === hit.id);
    if (existing) {
      setAnnotations(old => old.map(item => item.id === existing.id ? { ...item, text: '' } : item));
    } else {
      const appearance = sampleTextAppearance(hit);
      const style = TEXT_STYLES.find(item => item.id === 'body') || TEXT_STYLES[6];
      const id = crypto.randomUUID();
      setAnnotations(old => [...old, {
        id, page: hit.page, text: '', originalText: hit.text,
        sourceRect: { x0: hit.x, y0: hit.y, x1: hit.x + hit.w, y1: hit.y + hit.h },
        x: hit.x, y: hit.y, w: Math.max(hit.w, .012), h: Math.max(hit.h, .012),
        maskColor: appearance.maskColor, font: style.font,
        size: Math.max(6, Math.min(36, hit.fontSize)), color: appearance.color,
        styleId: 'body', align: 'left', coverOriginal: true, sourceHitId: hit.id
      }]);
    }
    setSelectedId(null);
    setEditingTextId(null);
    setStatus('Original text marked for deletion. Download the PDF to apply it.');
  }

  function addCommentAt(point: {x:number;y:number}, targetPage = page) {
    // Ask for the note only after the user has chosen the exact page position.
    const entered = commentDraft.trim() || window.prompt('Enter your comment:')?.trim() || '';
    if (!entered) {
      setTool('select');
      setCommentDraft('');
      setStatus('Comment cancelled. Choose Comment and click the page to add a note.');
      return;
    }
    const comment: PdfComment = {
      id: crypto.randomUUID(), page: targetPage, x: point.x, y: point.y,
      boxX: Math.min(.74, Math.max(.02, point.x + .02)),
      boxY: Math.min(.88, Math.max(.02, point.y + .01)), text: entered
    };
    setComments(old => [...old, comment]);
    setCommentDraft('');
    setTool('select');
    setStatus('Comment added at the selected position on page ' + targetPage + '.');
  }

  async function runOcr() {
    if (!document) { setStatus('Open a PDF before running OCR.'); return; }
    setBusy(true);
    let worker: any = null;    try {
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
      // Make OCR words immediately clickable in Edit Text on the current scanned page.
      // Do not replace embedded PDF text hitboxes on pages that already have selectable text.
      if (!textHits.some(hit => hit.page === page) && positionedWords[page]?.length) {
        const currentWords = positionedWords[page];
        setTextHits(currentWords.map((word,index) => ({
          id:'ocr-'+page+'-'+index, page, text:word.text, x:word.x, y:word.y,
          w:word.w, h:word.h, fontSize:Math.max(7,Math.min(24,word.h*(pageSizeRef.current.height||700)*0.72/Math.max(0.01,fitZoom*zoom/100)))
        })));
        setStatus('OCR ready. Recognized words on this page are now clickable in Edit Text.');
      }
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
    const highlights: PdfTextHit[] = [];
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
        if (at >= 0) {
          results.push({ page:pageNumber, text:text.slice(Math.max(0,at-65), Math.min(text.length,at+query.length+100)) });
          const viewport = pdfPage.getViewport({scale:1});
          (content.items as any[]).forEach((item,index)=>{
            if(typeof item.str!=='string'||!item.str.toLowerCase().includes(query)) return;
            const m=pdfjs.Util.transform(viewport.transform,item.transform); const h=Math.max(3,Math.hypot(m[2],m[3])); const w=Math.max(4,Number(item.width)||item.str.length*h*.45);
            highlights.push({id:'search-'+pageNumber+'-'+index,page:pageNumber,text:item.str,x:Math.max(0,m[4]/viewport.width),y:Math.max(0,(m[5]-h)/viewport.height),w:Math.min(1,w/viewport.width),h:Math.min(1,h/viewport.height),fontSize:h});
          });
        }
      }
      setSearchResults(results);
      setSearchHighlights(highlights);
      if(results.length) setPage(results[0].page);
      setStatus(results.length + ' page(s) contain “' + searchQuery + '”. Matching text is highlighted.');
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
      if (a.sourceHitId && typeof patch.text === 'string') {
        // A click only selects the original text. Mask it only after its content
        // actually changes; restoring the original text removes the mask again.
        next.coverOriginal = patch.text !== (a.originalText ?? '');
      }
      if (a.sourceHitId && next.coverOriginal && typeof patch.text === 'string') {
        const targetCanvas = continuousView ? continuousCanvasRefs.current.get(a.page) : canvasRef.current;
        const metrics = pageMetricsRef.current.get(a.page);
        const pageWidth = targetCanvas?.clientWidth || metrics?.width || pageSizeRef.current.width || 1;
        const pageHeight = targetCanvas?.clientHeight || metrics?.height || pageSizeRef.current.height || 1;
        const pageScale = metrics?.scale || fitZoom * zoom / 10000;
        const fontPx = Math.max(6, a.size * pageScale);
        const measureCanvas = window.document.createElement('canvas');
        const measure = measureCanvas.getContext('2d');
        const fontWeight = next.bold ? '700' : '400';
        const fontStyle = next.italic ? 'italic' : 'normal';
        if (measure) measure.font = fontStyle+' '+fontWeight+' '+fontPx+'px "'+next.font+'"';
        const estimatedPixels = Math.max(...patch.text.split('\n').map(line => measure?.measureText(line || ' ').width || line.length*fontPx*.56), fontPx);
        const estimatedWidth = (estimatedPixels + 8) / pageWidth;
        const lineCount = Math.max(1, patch.text.split('\n').length);
        const estimatedHeight = (lineCount * fontPx * 1.2 + 4) / pageHeight;
        next.w = Math.min(1 - a.x, Math.max(a.w, estimatedWidth));
        next.h = Math.min(1 - a.y, Math.max(a.h, estimatedHeight));
      }
      return next;
    }));
  }

  function saveResizedBox(id: string, element: HTMLTextAreaElement) {
    const annotation = annotations.find(item => item.id === id);
    if (!annotation) return;
    const canvas = continuousView ? (continuousCanvasRefs.current.get(annotation.page) || null) : canvasRef.current;
    if (!canvas) return;
    const rect = element.getBoundingClientRect();
    const pageRect = canvas.getBoundingClientRect();
    const sourceText = annotation.coverOriginal;
    updateAnnotation(id, {
      w: Math.max(sourceText ? .012 : .08, Math.min(.95, rect.width / pageRect.width)),
      h: Math.max(sourceText ? .012 : .04, Math.min(.8, rect.height / pageRect.height))
    });
  }

  function beginDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    const targetPage = Number((event.currentTarget as HTMLElement).dataset.page) || page;
    if (tool === 'whiteout') {
      if ((event.target as HTMLElement).closest('.pdf-annotation,.comment-note')) return;
      const point = normalizedPoint(event); if (!point) return;
      event.preventDefault();
      whiteoutDragRef.current = { start: point, current: point, page: targetPage };
      setWhiteoutDraft({x:point.x,y:point.y,w:0,h:0});
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if ((tool !== 'draw' && tool !== 'erase') || (event.target as HTMLElement).closest('.pdf-annotation,.comment-note')) return;
    const point = normalizedPoint(event); if (!point) return;
    event.preventDefault();
    const stroke: DrawStroke = { id: crypto.randomUUID(), page: targetPage, color: tool === 'erase' ? eraseBrushColor : drawColor, width: drawWidth, points: [point] };
    drawingBaseRef.current = lastSnapshotRef.current || { annotations, comments, strokes }; drawingRef.current = stroke; setStrokes(old => [...old, stroke]);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function continueDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    if (whiteoutDragRef.current) {
      const point = normalizedPoint(event); if (!point) return;
      const start = whiteoutDragRef.current.start;
      whiteoutDragRef.current.current = point;
      setWhiteoutDraft({x:Math.min(start.x,point.x),y:Math.min(start.y,point.y),w:Math.abs(point.x-start.x),h:Math.abs(point.y-start.y)});
      return;
    }
    if (!drawingRef.current) return;
    const point = normalizedPoint(event); if (!point) return;
    const active = drawingRef.current;
    const next = { ...active, points: [...active.points, point] };
    drawingRef.current = next;
    setStrokes(old => old.map(item => item.id === next.id ? next : item));
  }
  function finishDrawing() {
    if (whiteoutDragRef.current) {
      const drag = whiteoutDragRef.current; whiteoutDragRef.current = null;
      const x=Math.min(drag.start.x,drag.current.x), y=Math.min(drag.start.y,drag.current.y);
      const w=Math.abs(drag.current.x-drag.start.x), h=Math.abs(drag.current.y-drag.start.y);
      setWhiteoutDraft(null);
      if (w >= .004 && h >= .004) {
        const id=crypto.randomUUID();
        setAnnotations(old=>[...old,{id,page:drag.page,kind:'whiteout',text:'',x,y,w,h,font:'Arial',size:12,color:'#ffffff'}]);
        setSelectedId(id); setStatus('Whiteout area added. It will cover the selected region in the exported PDF.');
      } else setStatus('Whiteout cancelled. Drag across an area to cover it.');
      return;
    }
    if (!drawingRef.current) return;
    const base = drawingBaseRef.current;
    if (base) { undoRef.current = [...undoRef.current.slice(-99), base]; redoRef.current = []; }
    drawingRef.current = null; drawingBaseRef.current = null;
    lastSnapshotRef.current = { annotations, comments, strokes };
    setStatus('Freehand stroke added.');
  }

  async function confirmAndSavePdf() {
    if (!document || busy) return;
    const confirmed = window.confirm(
      'Do you really want to save changes to "' + document.file.name + '"?\\n\\nOK = Save changes to the opened PDF file. Cancel = Keep editing.'
    );
    if (!confirmed) {
      setStatus('Save cancelled. Your edits are still available.');
      return;
    }
    await exportPdf(true);
  }

  function startPdfDownload() {
    if (!document || busy) return;
    // Always generate and validate a real PDF Blob for Download. The File
    // System Access API remains available through Save, but is deliberately
    // bypassed here to avoid browser-specific empty-file write behaviour.
    void exportPdf(false);
  }

  async function exportPdf(saveToFile = false, downloadHandle: any = null) {
    if (!document) return;
    let saveHandle: any = downloadHandle || (saveToFile ? sourceFileHandleRef.current : null);
    try {
      const picker = (window as any).showSaveFilePicker;
      // For Download, open the native save dialog immediately while the click
      // still has user activation. This avoids browsers blocking a delayed
      // download after the PDF has finished asynchronous processing.
      if (saveToFile && !saveHandle && typeof picker === 'function') {
        saveHandle = await picker({
          suggestedName: document.file.name.toLowerCase().endsWith('.pdf') ? document.file.name.replace(/\.pdf$/i, '-edited.pdf') : document.file.name + '-edited.pdf',
          types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }]
        });
        // Download/Save As always writes a new output file, never overwrites the source handle.
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('Download cancelled. Your edits are still available.');
        return;
      }
      setStatus(error instanceof Error ? 'Could not open the PDF save dialog: ' + error.message : 'Could not open Save dialog.');
      return;
    }
    setBusy(true);
    try {
      let sourceBytes = document.bytes.slice(0);
      const originalEdits = annotations.filter(item => item.coverOriginal && item.sourceRect && item.originalText);
      if (originalEdits.length) {
        setStatus('Replacing original PDF text content…');
        const form = new FormData();
        form.append('file', new Blob([sourceBytes], { type: 'application/pdf' }), document.file.name);
        form.append('edits', JSON.stringify(originalEdits.map(item => ({
          page: item.page,
          originalText: item.originalText,
          text: item.text,
          rect: item.sourceRect,
          box: { x0: item.x, y0: item.y, x1: item.x + item.w, y1: item.y + item.h },
          size: item.size,
          color: parseInt(item.color.replace('#',''), 16),
          font: item.font,
          bold: !!item.bold,
          italic: !!item.italic
        }))));
        const response = await fetch('/api/edit-original-text', { method: 'POST', body: form });
        if (!response.ok) {
          const failure = await response.json().catch(() => ({ error: 'Native PDF text editing failed.' }));
          throw new Error(failure.error || 'Native PDF text editing failed.');
        }
        sourceBytes = await response.arrayBuffer();
      }
      const pdf = await PDFDocument.load(sourceBytes);
      pdf.registerFontkit(fontkit);
      const embeddedFonts = new Map<string, Awaited<ReturnType<typeof pdf.embedFont>>>();
      for (const annotation of annotations) {
        if (annotation.kind === 'whiteout') {
          const target = pdf.getPage(annotation.page - 1); const { width, height } = target.getSize();
          target.drawRectangle({x:annotation.x*width,y:height-(annotation.y+annotation.h)*height,width:annotation.w*width,height:annotation.h*height,color:rgb(1,1,1),borderWidth:0});
          continue;
        }
        // A source-text annotation that was only clicked/selected must not be
        // drawn again: the original PDF glyphs remain untouched until the user
        // types a replacement or actually drags the text to a new position.
        if (annotation.sourceHitId && !annotation.coverOriginal) continue;
        // Original text has already been removed and reinserted by the native PDF engine.
        if (annotation.coverOriginal) continue;
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
          target.drawCircle({ x:a.x*width, y:height-a.y*height, size:stroke.width/2, color, opacity:1 });
          if (i===stroke.points.length-1) target.drawCircle({ x:b.x*width, y:height-b.y*height, size:stroke.width/2, color, opacity:1 });
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
        target.drawLine({ start: anchor, end: connectorEnd, thickness: 1.4, color: commentColor });        target.drawCircle({ x: anchor.x, y: anchor.y, size: 4, color: commentColor });
        target.drawRectangle({
          x: cardX, y: cardY, width: cardWidth, height: cardHeight,
          color: rgb(1, 0.98, 0.93), borderColor: rgb(0.93, 0.81, 0.62), borderWidth: 0.8
        });
        target.drawText(comment.text, {
          x: cardX + 6, y: cardY + cardHeight - 13, size: 8, font: commentFont,
          color: rgb(0.42, 0.31, 0.13), maxWidth: cardWidth - 12, lineHeight: 10
        });
      }
      const bytes = await pdf.save({ useObjectStreams: false });
      if (!bytes || bytes.byteLength < 100 || String.fromCharCode(...bytes.slice(0,5)) !== '%PDF-') {
        throw new Error('PDF export returned an empty file. Your edits are still available; please try Download again.');
      }
      // Copy the exact byte range into a standalone ArrayBuffer. Passing the
      // PDFDocument Uint8Array view directly to Blob can produce a zero-byte
      // or truncated file in some browser/runtime combinations.
      const pdfBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(pdfBuffer).set(bytes);
      const downloadBytes = new Uint8Array(pdfBuffer.byteLength);
      downloadBytes.set(new Uint8Array(pdfBuffer));
      const pdfBlob = new Blob([downloadBytes], { type: 'application/pdf' });
      if (pdfBlob.size !== bytes.byteLength || pdfBlob.size < 100) {
        throw new Error('The generated PDF data is incomplete. Your edits are still available.');
      }
      const blobCheck = new Uint8Array(await pdfBlob.slice(0, 5).arrayBuffer());
      if (new TextDecoder().decode(blobCheck) !== '%PDF-') throw new Error('The download file failed its PDF header check. No empty file was saved.');
      const verifiedPdf = await PDFDocument.load(pdfBuffer.slice(0));
      if (verifiedPdf.getPageCount() !== pdf.getPageCount()) throw new Error('PDF verification failed. Your edits are preserved.');
      const downloadName = document.file.name.toLowerCase().endsWith('.pdf')
        ? document.file.name.replace(/\.pdf$/i, '-edited.pdf')
        : document.file.name + '-edited.pdf';
      let savedToFile = false;
      if (saveHandle) {
        let writable: any = null;
        try {
          writable = await saveHandle.createWritable({ keepExistingData: false });
          await writable.write(downloadBytes);
          await writable.truncate(downloadBytes.byteLength);
          await writable.close();
          writable = null;
          const writtenFile = await saveHandle.getFile();
          if (!writtenFile || writtenFile.size !== downloadBytes.byteLength || writtenFile.size < 100) throw new Error('Saved file size verification failed: expected '+downloadBytes.byteLength+' bytes, got '+(writtenFile?.size ?? 0)+'.');
          const writtenHead = new Uint8Array(await writtenFile.slice(0,5).arrayBuffer());
          if (new TextDecoder().decode(writtenHead) !== '%PDF-') throw new Error('Saved file does not contain a valid PDF header.');
          savedToFile = true;
        } catch (writeError) {
          try { await writable?.abort?.(); } catch { /* ignore cleanup failure */ }
          // If a browser grants the picker but fails to write, still offer a
          // normal download instead of silently creating an empty file.
          setStatus('Direct save failed: ' + (writeError instanceof Error ? writeError.message : 'Unknown file write error') + '. Use the Download ready link below.');
        }
      }
      if (!savedToFile) {
        const url = URL.createObjectURL(pdfBlob);
        setDownloadFallback({url,name:downloadName});
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = downloadName;
        anchor.type = 'application/pdf';
        anchor.rel = 'noopener';
        anchor.style.position = 'fixed';
        anchor.style.left = '-10000px';
        window.document.body.appendChild(anchor);
        // Delayed synthetic clicks are blocked by Chromium after async PDF generation.
        // Keep this real anchor for the user's explicit click in the status bar.
        anchor.remove();
        // Keep URL available for a manual retry if the browser blocks automatic download.
        // Keep the retry URL alive until the user starts the manual download.
      }
      // Make the committed PDF the new editor source; subsequent saves must not
      // replay edits against the original, unmodified bytes.
      const committedBytes = pdfBuffer.slice(0);
      const committedFile = new File([pdfBlob], document.file.name, { type: 'application/pdf' });
      setDocument({ file: committedFile, bytes: committedBytes, pages: pdf.getPageCount() });
      if (savedToFile || downloadFallback || !saveHandle) {
        setAnnotations([]);
        setEditingTextId(null);
        setComments([]);
        setStrokes([]);
        setOcrWords({});
        setOcrPages({});
        setSelectedId(null);
      }
      setStatus(savedToFile
        ? 'Edited PDF saved successfully as ' + downloadName + ' (' + Math.round(pdfBlob.size / 1024) + ' KB).'
        : 'PDF ready: ' + downloadName + ' (' + pdfBlob.size.toLocaleString() + ' bytes). Click Download ready to save it.');

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
      setDocument({ file, bytes: new Uint8Array(bytes).buffer as ArrayBuffer, pages: pdf.getPageCount() });      setAnnotations(old => old.filter(a => a.page !== page).map(a => a.page > page ? { ...a, page: a.page - 1 } : a));
      setComments(old => old.filter(v => v.page !== page).map(v => v.page > page ? { ...v, page: v.page - 1 } : v));
      setStrokes(old => old.filter(v => v.page !== page).map(v => v.page > page ? { ...v, page: v.page - 1 } : v));
      setOcrPages(old => Object.fromEntries(Object.entries(old).filter(([key]) => Number(key) !== page).map(([key, value]) => [String(Number(key) > page ? Number(key) - 1 : Number(key)), value])));
      setOcrWords(old => Object.fromEntries(Object.entries(old).filter(([key]) => Number(key) !== page).map(([key, value]) => [String(Number(key) > page ? Number(key) - 1 : Number(key)), value])));
      setBookmarks(old => old.filter(item => item.page !== page).map(item => item.page > page ? { ...item, page: item.page - 1 } : item));
      setPage(p => Math.min(p, pdf.getPageCount())); setSelectedId(null); setStatus('Page deleted. Page-linked text, comments, drawings, OCR data and bookmarks were adjusted.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not delete page.'); }
  }

  async function mergePdfs() {
    if (!document) { setStatus('Open the main PDF first, then add up to 10 PDFs to merge.'); return; }
    if (!mergeFiles.length) { setStatus('Add at least one PDF to merge with the currently open document.'); return; }
    if (mergeFiles.length > 10) { setStatus('You can add a maximum of 10 additional PDFs at a time.'); return; }
    setBusy(true);
    setStatus('Merging the open PDF first, followed by your added PDFs…');
    try {
      const merged = await PDFDocument.create();
      const sources: Array<{name:string; bytes:ArrayBuffer}> = [
        { name: document.file.name, bytes: document.bytes.slice(0) },
        ...await Promise.all(mergeFiles.map(async file => ({ name:file.name, bytes:await file.arrayBuffer() })))
      ];
      let totalPages = 0;
      for (let index = 0; index < sources.length; index++) {
        const file = sources[index];
        if (file.bytes.byteLength < 5 || new TextDecoder().decode(file.bytes.slice(0,5)) !== '%PDF-') {
          throw new Error(file.name + ' is not a valid PDF or is damaged.');
        }
        let source;
        try {
          source = await PDFDocument.load(file.bytes, { ignoreEncryption: true, updateMetadata: false });
        } catch {
          throw new Error('Could not read "' + file.name + '". It may be password-protected, damaged, or use unsupported PDF features.');
        }
        const indices = source.getPageIndices();
        if (!indices.length) throw new Error(file.name + ' contains no pages.');
        const copied = await merged.copyPages(source, indices);
        copied.forEach(pageCopy => merged.addPage(pageCopy));
        totalPages += copied.length;
        setStatus('Merged document ' + (index + 1) + ' of ' + sources.length + '…');
      }
      const bytes = await merged.save({ useObjectStreams: false });
      const mergedFile = new File([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], 'merged-' + document.file.name.replace(/\\.pdf$/i,'') + '.pdf', {type:'application/pdf'});
      setMergeFiles([]);
      await openPdf(mergedFile);
      setStatus('Merged the original PDF and ' + (sources.length - 1) + ' added PDF(s) into ' + totalPages + ' pages. Arrange pages in the Pages panel, then edit and save.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Merge failed. Please check the selected PDFs.');
    } finally { setBusy(false); }
  }

  async function movePageOrder(fromPage: number, toPage: number) {
    if (!document || busy || toPage < 1 || toPage > document.pages || fromPage === toPage) return;
    setBusy(true);
    try {
      const source = await PDFDocument.load(document.bytes.slice(0));
      const order = source.getPageIndices();
      const [moved] = order.splice(fromPage - 1, 1);
      order.splice(toPage - 1, 0, moved);
      const reordered = await PDFDocument.create();
      const pages = await reordered.copyPages(source, order);
      pages.forEach(item => reordered.addPage(item));
      const bytes = await reordered.save({ useObjectStreams: false });
      const updated = new File([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], document.file.name, {type:'application/pdf'});
      await openPdf(updated);
      setPage(toPage);
      setStatus('Page ' + fromPage + ' moved to position ' + toPage + '.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not rearrange pages.');
    } finally { setBusy(false); }
  }

  return <main className="app-shell pdf-studio">
    <header className="studio-header">
      <div className="brand"><span className="logo">P</span><div><b>ProPDF Studio</b><small>Edit PDFs in your browser</small></div></div>
      <div className="cloud-account">{cloudUser ? <><span>{cloudUser.email || "Signed in"}</span><button className="sign-in" type="button" onClick={()=>void openFromCloud()}>My cloud files</button><button className="sign-in" type="button" onClick={()=>void signOutCloud()}>Sign out</button></> : <button className="sign-in" type="button" onClick={()=>void signInOrUp()}>Sign in</button>}</div>
    </header>

    <nav className="studio-toolbar" aria-label="PDF editing toolbar">
      <button className="toolbar-button open-file" type="button" onClick={()=>void openPdfFromPicker()}>Open PDF</button><input ref={documentInputRef} type="file" accept="application/pdf,.pdf" style={{display:'none'}} onChange={e=>{sourceFileHandleRef.current=null;void openPdf(e.target.files?.[0]);e.currentTarget.value='';}}/>
      <button className={tool==='edit'?'toolbar-button active':'toolbar-button'} onClick={()=>{setTool('edit');setStatus('Edit Text mode: click original PDF text, then type to replace it.')}}>✎ Edit Text</button>
      <button className={tool==='comment'?'toolbar-button active':'toolbar-button'} disabled={!document} onClick={()=>{setCommentDraft('');setTool('comment');setStatus('Comment mode: click the exact position on the PDF page, then enter your note.');}}>▤ Comment</button>
      <button className={tool==='text'?'toolbar-button active':'toolbar-button'} onClick={()=>{setTool('text');setStatus('Click anywhere on the PDF page to add a new text box.')}}>T&nbsp; Add text</button>
      <button className={tool==='draw'?'toolbar-button active':'toolbar-button'} onClick={()=>{setTool('draw');setStatus('Draw freehand on the PDF page. Drawing is included in the downloaded PDF.')}}>✎ Draw</button>
      <button className={tool==='whiteout'?'toolbar-button active':'toolbar-button'} disabled={!document} onClick={()=>{setTool('whiteout');setSelectedId(null);setStatus('Whiteout: drag to place a rectangular white cover over the selected area.')}}>▱ Whiteout</button>
      <button className={tool==='erase'?'toolbar-button active':'toolbar-button'} disabled={!document} onClick={()=>{setTool('erase');setSelectedId(null);setStatus('Eraser: paint freely over the PDF with a white brush. Adjust brush size using the width control.')}}>⌫ Eraser Brush</button>
      <button className={continuousView?'toolbar-button active':'toolbar-button'} disabled={!document||!continuousUrl} onClick={()=>{setContinuousView(v=>!v);setStatus(continuousView?'Returned to editing canvas.':'Continuous PDF view: scroll through every page; switch back to edit.')}}>▤ {continuousView?'Edit current page':'Continuous scroll'}</button>
      <button className="toolbar-button" disabled={!canUndo} onClick={undoEdit}>↶ Undo</button>
      <button className="toolbar-button" disabled={!canRedo} onClick={redoEdit}>↷ Redo</button>
      <input className="toolbar-color" aria-label={tool==='erase'?'Eraser brush colour':'Drawing colour'} type="color" value={tool==='erase'?eraseBrushColor:drawColor} onChange={e=>tool==='erase'?setEraseBrushColor(e.target.value):setDrawColor(e.target.value)}/>
      <select className="toolbar-select" aria-label="Drawing width" value={drawWidth} onChange={e=>setDrawWidth(Number(e.target.value))}><option value={1}>1 px</option><option value={2.5}>2.5 px</option><option value={4}>4 px</option><option value={6}>6 px</option><option value={8}>8 px</option><option value={12}>12 px</option><option value={16}>16 px</option><option value={24}>24 px</option><option value={32}>32 px</option></select>
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
      <label className="toolbar-button merge-file-picker">＋ Add PDFs to merge<input type="file" accept="application/pdf,.pdf" multiple disabled={busy} onChange={event=>{const incoming=Array.from(event.target.files||[]);setMergeFiles(old=>{const seen=new Set(old.map(file=>file.name+'|'+file.size+'|'+file.lastModified));const additions=incoming.filter(file=>{const key=file.name+'|'+file.size+'|'+file.lastModified;if(seen.has(key))return false;seen.add(key);return true;});const next=[...old,...additions];if(next.length>10){setStatus('Maximum 10 additional PDFs allowed. Only the first 10 are kept.');return next.slice(0,10);}return next;});event.currentTarget.value='';}} /></label>
      <button className="toolbar-button" disabled={!document||mergeFiles.length<1||busy} onClick={()=>void mergePdfs()}>Merge current + {mergeFiles.length}</button>
      <button className="toolbar-button" disabled={!document} onClick={()=>setZoom(z=>Math.max(25,z-10))}>−</button>
      <label className="toolbar-zoom-control" title="Type 25–500 and press Enter"><input className="toolbar-zoom-input" aria-label="PDF zoom percentage" type="number" min="25" max="500" step="1" disabled={!document} value={zoomInput} onFocus={()=>setZoomInput(String(Math.round(fitZoom*zoom/100)))} onChange={event=>setZoomInput(event.target.value)} onBlur={()=>{const value=Number(zoomInput);if(Number.isFinite(value)&&value>=25&&value<=500)setZoom(Math.round(value/Math.max(1,fitZoom)*100));else setZoomInput(String(Math.round(fitZoom*zoom/100)));}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/> <span>%</span></label>
      <button className="toolbar-button" disabled={!document} onClick={()=>setZoom(z=>Math.min(300,z+10))}>＋</button>
      <button className="toolbar-button" disabled={!document||busy} onClick={()=>void confirmAndSavePdf()}>💾 Save</button>
      <button className="toolbar-button" disabled={!document||busy} onClick={()=>void saveToCloud()}>☁ Save to cloud</button>
      <button className="toolbar-button primary-toolbar" disabled={!document||busy} onClick={startPdfDownload}>{busy?'Preparing…':'⬇ Download'}</button>
      
    </nav>

    <section className="studio-workspace" style={{gridTemplateColumns:`${showLeftPanel?'82px '+leftPanelWidth+'px 6px ':''}minmax(0,1fr)${showRightPanel?' 6px '+rightPanelWidth+'px':''}`}} onWheelCapture={event=>{if(event.ctrlKey||event.metaKey){event.preventDefault();event.stopPropagation();}}}>
      {showLeftPanel && <>
      <aside className="studio-pages">
        <button className={activePanel==='pages'?'side-tab active':'side-tab'} type="button" onClick={()=>setActivePanel('pages')}>▣<span>Pages</span></button>
        <button className={activePanel==='bookmarks'?'side-tab active':'side-tab'} type="button" disabled={!document} onClick={()=>setActivePanel('bookmarks')}>▤<span>Bookmarks</span></button>
        <button className={activePanel==='outline'?'side-tab active':'side-tab'} type="button" disabled={!document} onClick={()=>setActivePanel('outline')}>☷<span>Outline</span></button>
        <button className={activePanel==='search'?'side-tab active':'side-tab'} type="button" disabled={!document} onClick={()=>setActivePanel('search')}>⌕<span>Search</span></button>
      </aside>

      <aside className="studio-thumbnails" aria-label="PDF navigation panel"><div className="panel-heading-control"><b>Navigation</b><button className="panel-inline-toggle" type="button" title="Hide left panel" aria-label="Hide left panel" onClick={()=>setShowLeftPanel(false)}>◧</button></div>
        {activePanel==='pages' && (document ? <div className="page-mini-list">{Array.from({length:document.pages},(_,index)=><div key={index+1} className="page-mini-wrap" draggable={!busy} onDragStart={event=>{pageDragRef.current=index+1;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(index+1));}} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect='move';}} onDrop={event=>{event.preventDefault();const from=pageDragRef.current||Number(event.dataTransfer.getData('text/plain'));pageDragRef.current=null;if(from>0&&from!==index+1)void movePageOrder(from,index+1);}} onDragEnd={()=>{pageDragRef.current=null;}} title="Drag this page to a new position"><button className={page===index+1?'page-mini active':'page-mini'} onClick={()=>setPage(index+1)}><span>PDF</span><b>{index+1}</b></button><div className="page-order-controls"><button type="button" title="Move page up" aria-label={'Move page '+(index+1)+' up'} disabled={busy||index===0} onClick={()=>void movePageOrder(index+1,index)}>↑</button><button type="button" title="Move page down" aria-label={'Move page '+(index+1)+' down'} disabled={busy||index===document.pages-1} onClick={()=>void movePageOrder(index+1,index+2)}>↓</button></div></div>)}<small>{document.pages} page(s) · Drag pages to reorder, or use ↑ ↓</small></div> : <div className="thumbnail-empty">Page<br/>thumbnails</div>)}
        {activePanel==='bookmarks' && <div className="nav-results"><b>Bookmarks</b>{bookmarks.length?bookmarks.map((item,i)=><button key={i} onClick={()=>setPage(item.page)}>{item.title}<small>Page {item.page}</small></button>):<p>No PDF bookmarks found in this file.</p>}</div>}
        {activePanel==='outline' && <div className="nav-results"><b>Document outline</b>{bookmarks.length?bookmarks.map((item,i)=><button key={i} onClick={()=>setPage(item.page)}>{item.title}<small>Page {item.page}</small></button>):<p>This PDF does not contain a built-in outline. Use Search to find headings and topics across all pages.</p>}</div>}
        {activePanel==='search' && <div className="nav-results search-panel"><b>Find in document</b><div className="search-inline"><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void runSearch()}} placeholder="Search text…"/><button onClick={()=>void runSearch()} disabled={busy}>Find</button></div>{searchResults.map((item,i)=><button key={i} onClick={()=>setPage(item.page)}><span>{item.text}</span><small>Page {item.page}</small></button>)}{searchResults.length===0&&<p>Enter a word or phrase and select Find.</p>}</div>}
      </aside>
      <div className="panel-resizer left-resizer" role="separator" aria-orientation="vertical" aria-label="Resize navigation panel" title="Drag to resize navigation panel" onPointerDown={event=>{event.preventDefault();setResizingPanel('left')}} />
      </>}

      {!showLeftPanel&&<button className="panel-restore left" type="button" title="Show left panel" aria-label="Show left panel" onClick={()=>setShowLeftPanel(true)}>▤</button>}
      <article className="studio-viewer">
        <div className="studio-scroll" onWheelCapture={event=>{if(event.ctrlKey||event.metaKey){event.preventDefault();event.stopPropagation();setZoom(value=>Math.max(25,Math.min(300,value+(event.deltaY<0?10:-10))));}}}>
          {document ? (continuousView && continuousUrl ? <div className="page-scroll continuous-pages" ref={stageRef}>{Array.from({length:document.pages},(_,idx)=>{const pageNo=idx+1;return <div key={pageNo} className="continuous-page-wrap"><div className="continuous-page-stage" data-page={pageNo} onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={finishDrawing} onPointerCancel={finishDrawing} onContextMenu={event=>{event.preventDefault();const point=normalizedPoint(event);if(!point)return;const rect=event.currentTarget.getBoundingClientRect();const hit=continuousHits.find(h=>h.page===pageNo&&point.x>=h.x&&point.x<=h.x+h.w&&point.y>=h.y&&point.y<=h.y+h.h)||null;const target=event.target as HTMLElement;const annotationEl=target.closest('.pdf-annotation') as HTMLElement|null;const annotation=annotationEl?annotations.find(a=>a.id===annotationEl.getAttribute('data-annotation-id'))||null:null;setPage(pageNo);setContextMenu({x:event.clientX-rect.left,y:event.clientY-rect.top,hit,annotation,point});}} onClick={event=>{if(contextMenu){setContextMenu(null);return;}if((event.target as HTMLElement).closest('.pdf-annotation,button,textarea,input'))return;const point=normalizedPoint(event);if(!point)return;if(tool==='text'){const id=crypto.randomUUID();setAnnotations(old=>[...old,{id,page:pageNo,text:'Type here',x:point.x,y:point.y,w:.34,h:.12,font,size:fontSize,color:fontColor,styleId:activeStyle.id,bold:activeStyle.bold,italic:activeStyle.italic,underline:activeStyle.underline,align:activeStyle.align}]);setSelectedId(id);setPage(pageNo);setTool('edit');}else if(tool==='comment'){setPage(pageNo);addCommentAt(point,pageNo);}else if(tool==='edit'){const hit=continuousHits.find(h=>h.page===pageNo&&point.x>=h.x-.01&&point.x<=h.x+h.w+.01&&point.y>=h.y-.01&&point.y<=h.y+h.h+.01);if(hit){setPage(pageNo);editExistingText(hit);}}}}><canvas ref={node=>{if(node)continuousCanvasRefs.current.set(pageNo,node);else continuousCanvasRefs.current.delete(pageNo);}}/><svg className="freehand-layer" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Freehand drawing overlay" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',overflow:'visible'}}>{strokes.filter(stroke=>stroke.page===pageNo).map(stroke=><polyline key={stroke.id} points={stroke.points.map(p=>(p.x*1000)+','+(p.y*1000)).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width*1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}</svg>{searchHighlights.filter(hit=>hit.page===pageNo).map(hit=><div key={hit.id} className="pdf-search-highlight" style={{position:'absolute',left:(hit.x*100)+'%',top:(hit.y*100)+'%',width:(hit.w*100)+'%',height:(hit.h*100)+'%',background:'rgba(255,220,0,.48)',outline:'1px solid rgba(220,150,0,.9)',pointerEvents:'none',zIndex:8}}/>)}{(tool==='edit'||tool==='select')&&continuousHits.filter(hit=>hit.page===pageNo&&!annotations.some(a=>a.sourceHitId===hit.id)).map(hit=><button key={hit.id} type="button" className="source-text-hit" style={{left:(hit.x*100)+'%',top:(hit.y*100)+'%',width:(Math.max(hit.w,.012)*100)+'%',height:(Math.max(hit.h,.018)*100)+'%'}} title={'Click to edit: '+hit.text} onClick={e=>{e.stopPropagation();setPage(pageNo);editExistingText(hit);}}/>)}{annotations.filter(a=>a.page===pageNo&&a.coverOriginal&&a.sourceRect).map(a=><div key={a.id+'-source-mask'} className="source-original-mask" style={{left:(a.sourceRect!.x0*100)+'%',top:(a.sourceRect!.y0*100)+'%',width:((a.sourceRect!.x1-a.sourceRect!.x0)*100)+'%',height:((a.sourceRect!.y1-a.sourceRect!.y0)*100)+'%',background:a.maskColor||'#fff'}}/>)}{annotations.filter(a=>a.page===pageNo).map(a=><div key={a.id} data-annotation-id={a.id} className={'pdf-annotation '+(selectedId===a.id?'selected':'')+(a.sourceHitId?' source-text-edit':'')} style={{left:(a.x*100)+'%',top:(a.y*100)+'%',width:(a.w*100)+'%',height:(a.h*100)+'%',fontFamily:a.font,fontSize:(a.size*(pageMetricsRef.current.get(pageNo)?.scale||fitZoom*zoom/10000))+'px',color:a.color,fontWeight:a.bold?'700':'400',fontStyle:a.italic?'italic':'normal',textDecoration:a.underline?'underline':'none',textAlign:a.align||'left','--source-mask-color':a.maskColor||'#ffffff'} as React.CSSProperties} onClick={e=>{e.stopPropagation();setPage(pageNo);setSelectedId(a.id);setEditingTextId(a.id);setTool('edit');}}>{editingTextId===a.id && <div className="annotation-drag-strip" role="button" aria-label="Drag text box to move" title="Drag here to move this text box" onPointerDown={event=>beginMove(event,a)}/>}{editingTextId===a.id ? <textarea value={a.text} readOnly={tool!=='edit'} onChange={e=>updateAnnotation(a.id,{text:e.target.value})} onPointerDown={e=>{if(tool!=='edit'&&e.button===0)beginMove(e,a)}} onPointerUp={e=>saveResizedBox(a.id,e.currentTarget)} onFocus={e=>{if(a.coverOriginal)e.currentTarget.select();}} onBlur={e=>saveResizedBox(a.id,e.currentTarget)} aria-label="Editable PDF text box" style={{display:'block',width:'100%',height:'100%',boxSizing:'border-box',margin:0,padding:'1px 2px',border:selectedId===a.id?'1px solid #2878d0':'1px solid transparent',outline:'none',background:a.sourceHitId?(a.coverOriginal?(a.maskColor||'#fff'):'transparent'):'rgba(255,255,255,.94)',color:a.sourceHitId&&!a.coverOriginal?'transparent':a.color,fontFamily:a.font,fontSize:'inherit',fontWeight:a.bold?'700':'400',fontStyle:a.italic?'italic':'normal',textDecoration:a.underline?'underline':'none',textAlign:a.align||'left',lineHeight:1.05,resize:'both',overflow:'auto',whiteSpace:'pre-wrap'}}/> : <div className="committed-text" style={{width:'100%',height:'100%',whiteSpace:'pre-wrap',overflow:'hidden',background:'transparent',color:a.color,font:'inherit',fontSize:'inherit',fontWeight:a.bold?'700':'400',fontStyle:a.italic?'italic':'normal',textDecoration:a.underline?'underline':'none',textAlign:a.align||'left'}}>{a.text}</div>}{editingTextId===a.id && (['n','s','e','w','ne','nw','se','sw'] as const).map(edge=><button key={edge} type="button" aria-label={'Resize text box '+edge} className={'resize-handle resize-'+edge} onPointerDown={event=>beginResize(event,a,edge)}/>)}{editingTextId===a.id && <button type="button" className="text-edit-done" onClick={e=>{e.stopPropagation();setEditingTextId(null);setSelectedId(null);setStatus('Text edit applied on the page. Download or Save to commit it into the PDF.');}}>Done</button>}{editingTextId===a.id && <span className="resize-label">Drag to resize</span>}</div>)}{comments.filter(c=>c.page===pageNo).map((c,i)=><div key={c.id} className="comment-note" style={{'--comment-x':((c.boxX??Math.min(.74,Math.max(.02,c.x+.02)))*100)+'%','--comment-y':((c.boxY??Math.min(.88,Math.max(.02,c.y+.01)))*100)+'%'} as React.CSSProperties}><b>Comment {i+1} · Page {pageNo}</b><span>{c.text}</span></div>)}{contextMenu&&page===pageNo&&<div className="pdf-context-menu" style={{left:Math.max(8,contextMenu.x),top:Math.max(8,contextMenu.y)}} onClick={e=>e.stopPropagation()}>{contextMenu.hit&&<button type="button" onClick={()=>{const hit=contextMenu.hit!;setContextMenu(null);setPage(pageNo);editExistingText(hit);}}>✎ Edit Text</button>}<button type="button" onClick={()=>{const point=contextMenu.point;setContextMenu(null);setPage(pageNo);const id=crypto.randomUUID();setAnnotations(old=>[...old,{id,page:pageNo,text:'Type here',x:point.x,y:point.y,w:.34,h:.12,font,size:fontSize,color:fontColor,styleId:activeStyle.id,bold:activeStyle.bold,italic:activeStyle.italic,underline:activeStyle.underline,align:activeStyle.align}]);setSelectedId(id);setEditingTextId(id);setTool('edit');}}>T Add Text</button><button type="button" onClick={()=>{const point=contextMenu.point;setContextMenu(null);setPage(pageNo);addCommentAt(point,pageNo);}}>▤ Add Comment</button>{contextMenu.annotation&&<button type="button" onClick={()=>{const id=contextMenu.annotation!.id;setAnnotations(old=>old.filter(item=>item.id!==id));setSelectedId(null);setEditingTextId(null);setContextMenu(null);setStatus('Text box deleted.');}}>⌫ Delete Text</button>}{contextMenu.hit&&<button type="button" onClick={()=>{const hit=contextMenu.hit!;setContextMenu(null);markNativeTextDeleted(hit);}}>⌫ Delete Original Text</button>}<button type="button" onClick={()=>setContextMenu(null)}>Cancel</button></div>}</div></div>})}</div> : <div className="page-scroll" ref={stageRef}><div className="pdf-page-stage" onContextMenu={event=>{event.preventDefault();const point=normalizedPoint(event);if(!point)return;const target=event.target as HTMLElement;const annotationEl=target.closest('.pdf-annotation') as HTMLElement|null;const annotation=annotationEl?annotations.find(a=>a.id===annotationEl.getAttribute('data-annotation-id'))||null:null;const hit=textHits.find(h=>h.page===page&&point.x>=h.x&&point.x<=h.x+h.w&&point.y>=h.y&&point.y<=h.y+h.h)||null;const rect=event.currentTarget.getBoundingClientRect();setContextMenu({x:event.clientX-rect.left,y:event.clientY-rect.top,hit,annotation,point});}} onClick={handleStageClick} onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={()=>finishDrawing()} onPointerCancel={()=>finishDrawing()}>
            <canvas ref={canvasRef}/>{searchHighlights.filter(hit=>hit.page===page).map(hit=><div key={hit.id} className="pdf-search-highlight" style={{position:'absolute',left:(hit.x*100)+'%',top:(hit.y*100)+'%',width:(hit.w*100)+'%',height:(hit.h*100)+'%',background:'rgba(255,220,0,.48)',outline:'1px solid rgba(220,150,0,.9)',pointerEvents:'none',zIndex:8}}/>)}
            <svg className="freehand-layer" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Freehand drawing overlay" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',overflow:'visible'}}>{strokes.filter(stroke=>stroke.page===page).map(stroke=><polyline key={stroke.id} points={stroke.points.map(p=>(p.x*1000)+','+(p.y*1000)).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width*1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}</svg>
            {whiteoutDraft && tool==='whiteout' && <div className="pdf-whiteout-draft" style={{position:'absolute',left:(whiteoutDraft.x*100)+'%',top:(whiteoutDraft.y*100)+'%',width:(whiteoutDraft.w*100)+'%',height:(whiteoutDraft.h*100)+'%',background:'#fff',border:'1px dashed #2878d0',pointerEvents:'none',zIndex:20}}/>}
            {(tool==='edit'||tool==='select') ? textHits.filter(hit=>hit.page===page && !annotations.some(a=>a.sourceHitId===hit.id)).map(hit=><button key={hit.id} type="button" className="source-text-hit" style={{left:(hit.x*100)+'%',top:(hit.y*100)+'%',width:(Math.max(hit.w,.012)*100)+'%',height:(Math.max(hit.h,.018)*100)+'%'}} title={'Click to edit: '+hit.text} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.preventDefault();e.stopPropagation();editExistingText(hit)}} aria-label={'Edit original PDF text: '+hit.text}/>) : null}
            {annotations.filter(a=>a.page===page&&a.coverOriginal&&a.sourceRect).map(a=><div key={a.id+'-source-mask'} className="source-original-mask" style={{left:(a.sourceRect!.x0*100)+'%',top:(a.sourceRect!.y0*100)+'%',width:((a.sourceRect!.x1-a.sourceRect!.x0)*100)+'%',height:((a.sourceRect!.y1-a.sourceRect!.y0)*100)+'%',background:a.maskColor||'#fff'}}/>)}{annotations.filter(a=>a.page===page).map(a=>a.kind==='whiteout' ? <div key={a.id} data-annotation-id={a.id} className={'pdf-annotation pdf-whiteout '+(selectedId===a.id?'selected':'')} title="Whiteout area" onClick={e=>{e.stopPropagation();setSelectedId(a.id)}} style={{position:'absolute',left:(a.x*100)+'%',top:(a.y*100)+'%',width:(a.w*100)+'%',height:(a.h*100)+'%',background:'#fff',border:selectedId===a.id?'1px dashed #2878d0':'1px solid transparent',boxSizing:'border-box',zIndex:10,cursor:'pointer'}}/> : <div key={a.id} data-annotation-id={a.id} className={'pdf-annotation '+(selectedId===a.id?'selected':'')+(a.sourceHitId?' source-text-edit':'')} style={{left:(a.x*100)+'%',top:(a.y*100)+'%',width:(a.w*100)+'%',height:(a.h*100)+'%',fontFamily:a.font,fontSize:(a.size*fitZoom*zoom/10000)+'px',color:a.color,fontWeight:a.bold?'700':'400',fontStyle:a.italic?'italic':'normal',textDecoration:a.underline?'underline':'none',textAlign:a.align||'left',cursor:'default','--source-mask-color':a.maskColor||'#ffffff'} as React.CSSProperties} onClick={e=>{e.stopPropagation();setSelectedId(a.id);setEditingTextId(a.id);setTool('edit')}}>
              <div className="annotation-drag-strip" role="button" aria-label="Drag text box to move" title="Drag here to move this text box" onPointerDown={event=>beginMove(event,a)} />
              {editingTextId===a.id ? <textarea autoFocus value={a.text} onChange={e=>updateAnnotation(a.id,{text:e.target.value})} onPointerUp={e=>saveResizedBox(a.id,e.currentTarget)} onBlur={e=>saveResizedBox(a.id,e.currentTarget)} onClick={e=>e.stopPropagation()} aria-label="Edit existing PDF text" style={{display:'block',width:'100%',height:'100%',minWidth:0,minHeight:0,boxSizing:'border-box',margin:0,padding:'1px 2px',border:'1px solid #2878d0',outline:'none',background:a.sourceHitId?(a.coverOriginal?(a.maskColor||'#fff'):'transparent'):'rgba(255,255,255,.96)',color:a.sourceHitId&&!a.coverOriginal?'transparent':a.color,fontFamily:a.font,fontSize:'inherit',fontWeight:a.bold?'700':'400',fontStyle:a.italic?'italic':'normal',textDecoration:a.underline?'underline':'none',textAlign:a.align||'left',lineHeight:1.12,resize:'both',overflow:'auto',whiteSpace:'pre-wrap'}}/> : <div className="committed-text" onClick={e=>{e.stopPropagation();setSelectedId(a.id);setEditingTextId(a.id);setTool('edit')}} style={{display:'block',width:'100%',height:'100%',whiteSpace:'pre-wrap',overflow:'hidden',background:'transparent',color:a.color,font:'inherit',fontSize:'inherit',fontWeight:a.bold?'700':'400',fontStyle:a.italic?'italic':'normal',textDecoration:a.underline?'underline':'none',textAlign:a.align||'left'}}>{a.text}</div>}
              {editingTextId===a.id && (['n','s','e','w','ne','nw','se','sw'] as const).map(edge=><button key={edge} type="button" aria-label={'Resize text box '+edge} className={'resize-handle resize-'+edge} onPointerDown={event=>beginResize(event,a,edge)}/>)}
              {editingTextId===a.id && <button type="button" className="text-edit-done" onClick={e=>{e.stopPropagation();setEditingTextId(null);setSelectedId(null);setStatus('Text edit applied on the page. Download or Save to commit it into the PDF.');}}>Done</button>}
              {editingTextId===a.id && <span className="resize-label">Drag to resize</span>}
            </div>)}
            {contextMenu && <div className="pdf-context-menu" style={{left:Math.min(contextMenu.x,Math.max(8,(canvasRef.current?.clientWidth||500)-170)),top:Math.min(contextMenu.y,Math.max(8,(canvasRef.current?.clientHeight||700)-100))}} onClick={e=>e.stopPropagation()}><button type="button" onClick={()=>{const hit=contextMenu.hit;const ann=contextMenu.annotation;setContextMenu(null);if(ann){setSelectedId(ann.id);setEditingTextId(ann.id);setTool('edit');}else if(hit){editExistingText(hit);}else{setStatus('Right-click directly on text to edit it.');}}}>✎ Edit Text</button><button type="button" onClick={()=>{const point=contextMenu.point;setContextMenu(null);addCommentAt(point);}}>▤ Add Comment</button>{contextMenu.annotation&&<button type="button" onClick={()=>{const id=contextMenu.annotation!.id;setAnnotations(old=>old.filter(item=>item.id!==id));setSelectedId(null);setEditingTextId(null);setContextMenu(null);setStatus('Text box deleted.');}}>⌫ Delete Text</button>}{contextMenu.hit&&<button type="button" onClick={()=>{const hit=contextMenu.hit!;setContextMenu(null);markNativeTextDeleted(hit);}}>⌫ Delete Original Text</button>}<button type="button" onClick={()=>setContextMenu(null)}>Cancel</button></div>}\n            <svg className="comment-connectors" viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{pointerEvents:'none'}}>{comments.filter(c=>c.page===page).map(c=>{const bx=(c.boxX??Math.min(.74,Math.max(.02,c.x+.02)))*1000;const by=(c.boxY??Math.min(.88,Math.max(.02,c.y+.01)))*1000;const d='M '+(c.x*1000)+' '+(c.y*1000)+' L '+(bx+120)+' '+(by+35);return <g key={c.id}><path d={d} stroke="#d28b27" strokeOpacity="0.001" strokeWidth="24" fill="none" style={{pointerEvents:'stroke',cursor:'grab',touchAction:'none'}} onPointerDown={e=>beginConnectorMove(e,c)} aria-label="Drag dotted comment connector"/><path d={d} stroke="#d28b27" strokeWidth="2.4" fill="none" strokeDasharray="6 5" style={{pointerEvents:'none'}}/><circle cx={c.x*1000} cy={c.y*1000} r="8" fill="#d28b27" stroke="#fff" strokeWidth="3" style={{pointerEvents:'none'}}/></g>})}</svg>
            {comments.filter(c=>c.page===page).map((c,i)=><div key={c.id} className="comment-note" style={{'--comment-x':((c.boxX??Math.min(.74,Math.max(.02,c.x+.02)))*100)+'%','--comment-y':((c.boxY??Math.min(.88,Math.max(.02,c.y+.01)))*100)+'%'} as React.CSSProperties} onPointerDown={e=>beginCommentMove(e,c)} title="Drag anywhere on this comment box to move it"><b className="comment-drag-handle">Comment {i+1} · Page {c.page} <span>↕ Move</span></b><span>{c.text}</span><button type="button" aria-label="Delete comment" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setComments(old=>old.filter(v=>v.id!==c.id));setStatus('Comment deleted.')}}>×</button></div>)}
          </div></div>) : <div className="studio-empty">
            <div className="studio-pdf-icon">PDF</div><h2>Open a PDF to start</h2>
            <p>All pages open together. Edit text, add comments, highlight, white-out,<br/> draw, rotate, delete pages, merge, split and download. Everything happens<br/> in your browser.</p>
            <span>or drop a file here</span>
          </div>}
        </div>
        <div className="studio-statusbar"><span>{status || (document?'Page '+page+' of '+document.pages:'Ready')}</span>{downloadFallback&&<a className="download-retry-link" href={downloadFallback.url} download={downloadFallback.name} onClick={()=>setStatus('Browser download requested for '+downloadFallback.name+'.')}>⬇ Download ready · {downloadFallback.name}</a>}<div><button disabled={!document} onClick={()=>setPage(1)}>⏮</button><button disabled={!document||page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>◀</button><b>{document?page:'–'}</b><button disabled={!document||page>=(document?.pages||1)} onClick={()=>setPage(p=>Math.min(document?.pages||1,p+1))}>▶</button><button disabled={!document} onClick={()=>setPage(document?.pages||1)}>⏭</button></div><span className="bottom-zoom">⌕　{Math.round(fitZoom*zoom/100)}%　<button disabled={!document} onClick={()=>setZoom(100)}>⛶</button></span></div>
      </article>

      {showRightPanel&&<div className="panel-resizer right-resizer" style={{gridColumn:showLeftPanel?'5':'2'}} role="separator" aria-orientation="vertical" aria-label="Resize properties panel" title="Drag to resize properties panel" onPointerDown={event=>{event.preventDefault();setResizingPanel('right')}} />}
      {!showRightPanel&&<button className="panel-restore right" type="button" title="Show right panel" aria-label="Show right panel" onClick={()=>setShowRightPanel(true)}>▤</button>}
      {showRightPanel && <aside className="studio-properties">
        <div className="panel-heading-control"><b>Properties</b><button className="panel-inline-toggle" type="button" title="Hide right panel" aria-label="Hide right panel" onClick={()=>setShowRightPanel(false)}>◨</button></div>
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
    <style>{`.panel-heading-control{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569}.panel-inline-toggle{width:28px;height:28px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#334155;cursor:pointer;font-size:17px;flex:0 0 auto}.search-panel{min-width:0;padding:14px!important}.search-panel .search-inline{display:flex;gap:6px;flex-wrap:wrap}.search-panel .search-inline input{width:100%;min-width:0;height:38px;font-size:14px}.search-panel .search-inline button{height:34px}.search-panel>button{font-size:13px;line-height:1.4;padding:10px!important;white-space:normal}.pdf-search-highlight{border-radius:2px}.toolbar-zoom-control{display:inline-flex;align-items:center;gap:2px;border:1px solid #cbd5e1;border-radius:6px;padding:0 5px;height:34px;background:#fff;color:#334155}.toolbar-zoom-input{width:48px;border:0;outline:0;text-align:center;font:inherit;font-size:13px;color:inherit;background:transparent;padding:0}.toolbar-zoom-input::-webkit-inner-spin-button,.toolbar-zoom-input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.panel-resizer{width:6px;min-width:6px;cursor:col-resize;position:relative;z-index:30;touch-action:none;background:transparent}.panel-resizer:hover,.panel-resizer:active{background:#93c5fd}.left-resizer{grid-column:3;grid-row:1}.right-resizer{grid-column:5;grid-row:1;margin-left:-3px}.download-retry-link{display:inline-flex;align-items:center;font-size:12px;font-weight:700;color:#fff;background:#2563eb;border-radius:5px;padding:6px 10px;text-decoration:none;white-space:nowrap;cursor:pointer;position:relative;z-index:100}.studio-workspace{position:relative}.panel-restore{position:absolute;z-index:50;top:50%;transform:translateY(-50%);width:30px;height:48px;border:1px solid #cbd5e1;background:#fff;color:#334155;cursor:pointer}.panel-restore.left{left:0;border-radius:0 7px 7px 0}.panel-restore.right{right:2px;border-radius:7px 0 0 7px}`}</style>
    <footer className="studio-footer"><span role="status">{status}</span><span>ProPDF Studio</span></footer>
  </main>;
}