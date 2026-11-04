import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

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

type TextAnnotation = { id: string; page: number; text: string; x: number; y: number; w: number; h: number; font: string; size: number; color: string; styleId?: string; bold?: boolean; italic?: boolean; underline?: boolean; align?: 'left'|'center'|'right'; coverOriginal?: boolean };
type PdfTextHit = { id: string; page: number; text: string; x: number; y: number; w: number; h: number; fontSize: number };
type PdfComment = { id: string; page: number; x: number; y: number; text: string };
type ResizeSession = { id: string; edge: string; startX: number; startY: number; start: TextAnnotation; pageWidth: number; pageHeight: number };

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
  const [fontAssets, setFontAssets] = useState<Record<string, Uint8Array>>({});
  const [activeStyleId, setActiveStyleId] = useState('body');
  const [commentDraft, setCommentDraft] = useState('');
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Open a PDF to start editing.');
  const [activePanel, setActivePanel] = useState<'pages'|'bookmarks'|'outline'|'search'>('pages');
  const [bookmarks, setBookmarks] = useState<Array<{title:string; page:number}>>([]);
  const [textHits, setTextHits] = useState<PdfTextHit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{page:number;text:string}>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const resizeRef = useRef<ResizeSession | null>(null);
  const moveRef = useRef<ResizeSession | null>(null);
  const pageSizeRef = useRef({ width: 0, height: 0 });
  const selected = useMemo(() => annotations.find(a => a.id === selectedId) || null, [annotations, selectedId]);
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
    function endResize() { resizeRef.current = null; moveRef.current = null; }
    window.addEventListener('pointermove', moveResize);
    window.addEventListener('pointerup', endResize);
    window.addEventListener('pointercancel', endResize);
    return () => {
      window.removeEventListener('pointermove', moveResize);
      window.removeEventListener('pointerup', endResize);
      window.removeEventListener('pointercancel', endResize);
    };
  }, []);

  function beginMove(event: ReactPointerEvent<HTMLButtonElement>, annotation: TextAnnotation) {
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
      const loading = pdfjs.getDocument({data:new Uint8Array(bytes.slice(0))});
      const pdfView = await loading.promise;
      const outline = await pdfView.getOutline();
      const entries:Array<{title:string;page:number}> = [];
      const visit = async (nodes:any[]) => { for (const node of nodes || []) { let target:any=node.dest; if (typeof target === 'string') target=await pdfView.getDestination(target); let targetPage=1; if (Array.isArray(target) && target[0]) { try { targetPage=(await pdfView.getPageIndex(target[0]))+1; } catch {} } entries.push({title:String(node.title||'Untitled bookmark'),page:targetPage}); if (node.items?.length) await visit(node.items); } };
      await visit(outline || []); setBookmarks(entries); setSearchResults([]); setTextHits([]);
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
      setAnnotations(old => [...old, { id, page, text: 'Type here', x: point.x, y: point.y, w: .34, h: .12, font, size: fontSize, color: fontColor, styleId: activeStyle.id, bold: activeStyle.bold, italic: activeStyle.italic, underline: activeStyle.underline, align: activeStyle.align }]);
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

  function editExistingText(hit: PdfTextHit) {
    const id = crypto.randomUUID();
    const style = TEXT_STYLES.find(item=>item.id==='body') || TEXT_STYLES[6];
    const annotation:TextAnnotation={id,page:hit.page,text:hit.text,x:hit.x,y:hit.y,w:Math.max(.06,Math.min(.95,hit.w*1.2)),h:Math.max(.025,Math.min(.3,hit.h*1.6)),font:style.font,size:Math.max(6,Math.min(36,hit.fontSize)),color:'#222222',styleId:'body',coverOriginal:true};
    setAnnotations(old=>[...old,annotation]); setSelectedId(id); setTool('select'); setStatus('Original text selected. Edit it in the text box; export replaces the covered original with your new text.');
  }

  async function runSearch() {
    if (!pdfRef.current || !searchQuery.trim()) { setSearchResults([]); return; }
    const query=searchQuery.trim().toLowerCase(); const results:Array<{page:number;text:string}> = [];
    setBusy(true);
    try { for(let p=1;p<=pdfRef.current.numPages;p++){ const pg=await pdfRef.current.getPage(p); const content=await pg.getTextContent(); const text=(content.items as any[]).map(item=>item.str||'').join(' '); if(text.toLowerCase().includes(query)){ const at=text.toLowerCase().indexOf(query); results.push({page:p,text:text.slice(Math.max(0,at-65),Math.min(text.length,at+query.length+100))}); } } setSearchResults(results); setStatus(results.length+' page(s) contain “'+searchQuery+'”.'); }
    catch(error){setStatus(error instanceof Error?error.message:'Search failed.');} finally{setBusy(false);}
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
        if (annotation.coverOriginal) target.drawRectangle({x:x-1,y:height-top-annotation.h*height-1,width:annotation.w*width+2,height:annotation.h*height+2,color:rgb(1,1,1),borderWidth:0});
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
      const commentFont = await pdf.embedFont(StandardFonts.Helvetica);
      for (const comment of comments) {
        const target = pdf.getPage(comment.page - 1);
        const { width, height } = target.getSize();
        const pageComments = comments.filter(item => item.page === comment.page);
        const index = pageComments.findIndex(item => item.id === comment.id);
        const cardTop = Math.min(0.88, 0.04 + index * 0.12);
        const cardWidth = width * 0.24;
        const cardHeight = Math.max(34, height * 0.075);
        const cardX = width * 0.74;
        const cardTopY = height * (1 - cardTop);
        const cardY = cardTopY - cardHeight;
        const anchor = { x: comment.x * width, y: height - comment.y * height };
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
      setPage(p => Math.min(p, pdf.getPageCount())); setSelectedId(null); setStatus('Page deleted.');
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
      setStatus('Merged ' + mergeFiles.length + ' PDFs successfully.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Merge failed.'); }
    finally { setBusy(false); }
  }

  return <main className="app-shell pdf-studio">
    <header className="studio-header">
      <div className="brand"><span className="logo">P</span><div><b>ProPDF Studio</b><small>Edit PDFs in your browser</small></div></div>
      <button className="sign-in" type="button" onClick={()=>setStatus('Sign-in and cloud sync are not configured yet.')}>Sign in</button>
    </header>

    <nav className="studio-toolbar" aria-label="PDF editing toolbar">
      <label className="toolbar-button open-file"><input type="file" accept="application/pdf,.pdf" onChange={e=>void openPdf(e.target.files?.[0])}/>Open PDF</label>
      <button className={tool==='select'?'toolbar-button active':'toolbar-button'} onClick={()=>{setTool('select');setStatus('Select a text box, edit its contents, or drag its Move handle.')}}>↖ Select / move</button>
      <button className={tool==='text'?'toolbar-button active':'toolbar-button'} onClick={()=>{setTool('text');setStatus('Click anywhere on the PDF page to add a text box.')}}>T&nbsp; Add text</button>
      <button className={tool==='comment'?'toolbar-button active':'toolbar-button'} onClick={()=>{setTool('comment');setStatus('Write a comment in the properties panel, then click the PDF page.')}}>▱ Comment</button>
      <input className="toolbar-color" aria-label="Text colour" type="color" value={fontColor} onChange={e=>{setFontColor(e.target.value);if(selected)updateAnnotation(selected.id,{color:e.target.value})}}/>
      <select className="toolbar-select" aria-label="Font size" value={selected?.size||fontSize} onChange={e=>{const v=Number(e.target.value);setFontSize(v);if(selected)updateAnnotation(selected.id,{size:v})}}>{[8,9,10,11,12,14,16,18,20,24,28,32,36,48].map(v=><option key={v} value={v}>{v}px</option>)}</select>
      <span className="toolbar-divider"/>
      <button className="toolbar-button" disabled={!selected} onClick={()=>{if(selected){setAnnotations(old=>old.filter(x=>x.id!==selected.id));setSelectedId(null)}}}>▤ Remove</button>
      <span className="toolbar-divider"/>
      <button className="toolbar-button" disabled={!document||page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>◀</button>
      <span className="toolbar-page">{document? page+' / '+document.pages : '– / –'}</span>
      <button className="toolbar-button" disabled={!document||page>=(document?.pages||1)} onClick={()=>setPage(p=>Math.min(document?.pages||1,p+1))}>▶</button>
      <span className="toolbar-divider"/>
      <button className="toolbar-button" disabled={!document} onClick={()=>void rotateCurrentPage()}>↻ Rotate page</button>
      <button className="toolbar-button" disabled={!document||document.pages<=1} onClick={()=>void deleteCurrentPage()}>▣ Delete page</button>
      <button className="toolbar-button" disabled={!document} onClick={()=>void splitPdf()}>⇱ Split PDF</button>
      <label className="toolbar-button open-file">＋ Choose PDFs<input type="file" accept="application/pdf,.pdf" multiple onChange={e=>{const files=Array.from(e.target.files||[]);setMergeFiles(files);setStatus(files.length>=2?files.length+' PDFs selected for merging.':'Select at least two PDFs.')}}/></label>
      <button className="toolbar-button" disabled={mergeFiles.length<2||busy} onClick={()=>void mergePdfs()}>Merge ({mergeFiles.length})</button>
      <button className="toolbar-button" disabled={!document} onClick={()=>setZoom(z=>Math.max(25,z-10))}>−</button>
      <span className="toolbar-zoom">{Math.round(fitZoom*zoom/100)}%</span>
      <button className="toolbar-button" disabled={!document} onClick={()=>setZoom(z=>Math.min(300,z+10))}>＋</button>
      <button className="toolbar-button" onClick={()=>setStatus('Comments: '+comments.length+' in this document session.')}>▢ Comments ({comments.length})</button>
      <button className="toolbar-button primary-toolbar" disabled={!document||busy} onClick={()=>void exportPdf()}>{busy?'Preparing…':'⬇ Download'}</button>
      <button className="toolbar-button" onClick={()=>setStatus('Cloud saving is not connected in this version.')}>☁ Save to cloud</button>
    </nav>

    <section className="studio-workspace">
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

      <article className="studio-viewer">
        <div className="studio-scroll">
          {document ? <div className="page-scroll" ref={stageRef}><div className="pdf-page-stage" onClick={handleStageClick}>
            <canvas ref={canvasRef}/>
            {textHits.filter(hit=>hit.page===page).map(hit=><button key={hit.id} type="button" className="source-text-hit" style={{left:(hit.x*100)+'%',top:(hit.y*100)+'%',width:(hit.w*100)+'%',height:(hit.h*100)+'%'}} title={'Click to edit: '+hit.text} onClick={e=>{e.stopPropagation();editExistingText(hit)}} aria-label={'Edit original PDF text: '+hit.text}/>) }
            {annotations.filter(a=>a.page===page).map(a=><div key={a.id} className={'pdf-annotation '+(selectedId===a.id?'selected':'')+(a.coverOriginal?' source-text-edit':'')} style={{left:(a.x*100)+'%',top:(a.y*100)+'%',width:(a.w*100)+'%',height:(a.h*100)+'%',fontFamily:a.font,fontSize:(a.size*fitZoom*zoom/10000)+'px',color:a.color,fontWeight:a.bold?'700':'400',fontStyle:a.italic?'italic':'normal',textDecoration:a.underline?'underline':'none',textAlign:a.align||'left'}} onClick={e=>{e.stopPropagation();setSelectedId(a.id);setTool('select')}}>
              <button type="button" className="move-text-handle" aria-label="Move text box" title="Drag to move" onPointerDown={event=>beginMove(event,a)}>✥ Move</button>
              <textarea value={a.text} onChange={e=>updateAnnotation(a.id,{text:e.target.value})} onPointerUp={e=>saveResizedBox(a.id,e.currentTarget)} onClick={e=>e.stopPropagation()} onBlur={e=>saveResizedBox(a.id,e.currentTarget)} aria-label="Editable PDF text box"/>
              {(['n','s','e','w','ne','nw','se','sw'] as const).map(edge=><button key={edge} type="button" aria-label={'Resize text box '+edge} className={'resize-handle resize-'+edge} onPointerDown={event=>beginResize(event,a,edge)}/>)}
              <span className="resize-label">Drag to resize</span>
            </div>)}
            <svg className="comment-connectors" viewBox="0 0 1000 1000" preserveAspectRatio="none">{comments.filter(c=>c.page===page).map((c,i)=>{const cardTop=Math.min(88,4+i*12);return <g key={c.id}><path d={'M '+(c.x*1000)+' '+(c.y*1000)+' L 740 '+((cardTop+5)*10)} stroke="#d28b27" strokeWidth="2.4" fill="none" strokeDasharray="6 5"/><circle cx={c.x*1000} cy={c.y*1000} r="8" fill="#d28b27" stroke="#fff" strokeWidth="3"/></g>})}</svg>
            {comments.filter(c=>c.page===page).map((c,i)=><div key={c.id} className="comment-note" style={{top:Math.min(88,4+i*12)+'%',left:'74%'}}><b>Comment {i+1}</b><span>{c.text}</span><button onClick={e=>{e.stopPropagation();setComments(old=>old.filter(v=>v.id!==c.id))}}>×</button></div>)}
          </div></div> : <div className="studio-empty">
            <div className="studio-pdf-icon">PDF</div><h2>Open a PDF to start</h2>
            <p>All pages open together. Edit text, add comments, highlight, white-out,<br/> draw, rotate, delete pages, merge, split and download. Everything happens<br/> in your browser.</p>
            <label className="choose-pdf"><input type="file" accept="application/pdf,.pdf" onChange={e=>void openPdf(e.target.files?.[0])}/>Choose a PDF</label>
            <span>or drop a file here</span>
          </div>}
        </div>
        <div className="studio-statusbar"><span>{document?'Page '+page+' of '+document.pages:status}</span><div><button disabled={!document} onClick={()=>setPage(1)}>⏮</button><button disabled={!document||page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>◀</button><b>{document?page:'–'}</b><button disabled={!document||page>=(document?.pages||1)} onClick={()=>setPage(p=>Math.min(document?.pages||1,p+1))}>▶</button><button disabled={!document} onClick={()=>setPage(document?.pages||1)}>⏭</button></div><span className="bottom-zoom">⌕　{Math.round(fitZoom*zoom/100)}%　<button disabled={!document} onClick={()=>setZoom(100)}>⛶</button></span></div>
      </article>

      <aside className="studio-properties">
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
          <label htmlFor="font-upload">Embed licensed font (.ttf / .otf)</label><input id="font-upload" type="file" accept=".ttf,.otf,font/ttf,font/otf" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const bytes=new Uint8Array(await file.arrayBuffer());const family=selected?.font||font;const fontUrl=URL.createObjectURL(file);const face=new FontFace(family,'url('+fontUrl+')');await face.load();window.document.fonts.add(face);URL.revokeObjectURL(fontUrl);setFontAssets(old=>({...old,[family]:bytes}));setStatus(file.name+' loaded and will be embedded in exported PDFs.');}catch{setStatus('Could not read the selected font file.');}e.currentTarget.value='';}}/>
          <label>Selected text box</label><p className="selection-note">{selected?Math.round(selected.w*100)+'% wide × '+Math.round(selected.h*100)+'% high':'Select a text box on the page to edit its dimensions.'}</p>
          <label>Comments</label><textarea className="comment-input" value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} placeholder="Write a comment, then select a point on the PDF…"/><small>{comments.length} comment(s)</small>
        </div>
      </aside>
    </section>
    <footer className="studio-footer"><span role="status">{status}</span><span>ProPDF Studio</span></footer>
  </main>;
}
