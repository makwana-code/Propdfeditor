import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import crypto from 'node:crypto';
import { fileTypeFromFile } from 'file-type';
import { PDFDocument } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';

const app = express();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cloudStorage = supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const cloudBucket = process.env.SUPABASE_BUCKET || 'pdf-documents';
const storageDir = path.resolve(process.env.STORAGE_DIR || './uploads');
const maxUploadBytes = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 50)) * 1024 * 1024;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);

mkdirSync(storageDir, { recursive: true });
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, storageDir),
    filename: (_req, _file, callback) => callback(null, `${crypto.randomUUID()}.pdf`),
  }),
  limits: { fileSize: maxUploadBytes, files: 10 },
  fileFilter: (_req, file, callback) => {
    const looksLikePdf = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';
    callback(null, looksLikePdf);
  },
});

async function removeFiles(files: Express.Multer.File[] = []) {
  await Promise.all(files.map(async (file) => {
    await fs.unlink(file.path).catch(() => undefined);
    await fs.unlink(file.path.replace(/\.pdf$/i, '.json')).catch(() => undefined);
  }));
}

async function assertPdfSignature(filePath: string) {
  const detected = await fileTypeFromFile(filePath);
  if (detected?.mime !== 'application/pdf') {
    throw new Error('Only genuine PDF files are accepted.');
  }
}

function tokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function authorizeDocumentDownload(id: string, authorization: string | undefined) {
  const match = authorization?.match(/^Bearer\\s+([A-Za-z0-9_-]{40,})$/i);
  if (!match || !cloudStorage) return null;
  const result = await cloudStorage.from('backend_documents').select('id,object_path,token_hash').eq('id', id).maybeSingle();
  const record = result.data as {id:string;object_path:string;token_hash:string} | null;
  if (result.error || !record?.token_hash) return null;
  const supplied = Buffer.from(tokenHash(match[1]), 'hex');
  const expected = Buffer.from(record.token_hash, 'hex');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  return record;
}
app.get('/api/health', (_req, res) => res.status(cloudStorage ? 200 : 503).json({ status: cloudStorage ? 'ok' : 'degraded', service: 'propdf-api', durableStorage: Boolean(cloudStorage) }));

app.post('/api/documents/upload', upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'A PDF file is required in the "file" field.' });
  if (!cloudStorage) { await removeFiles([req.file]); return res.status(503).json({ error: 'Durable cloud storage is not configured. Uploads are disabled to prevent data loss.' }); }
  try {
    await assertPdfSignature(req.file.path);
    const bytes = await fs.readFile(req.file.path);
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
    const id = path.basename(req.file.filename, '.pdf');
    const downloadToken = crypto.randomBytes(32).toString('base64url');
    const objectPath = `${id}.pdf`;
    const objectUpload = await cloudStorage.storage.from(cloudBucket).upload(objectPath, bytes, { contentType: 'application/pdf', upsert: false });
    if (objectUpload.error) throw objectUpload.error;
    const recordInsert = await cloudStorage.from('backend_documents').insert({ id, object_path: objectPath, original_name: path.basename(req.file.originalname).slice(0, 255), file_size: req.file.size, token_hash: tokenHash(downloadToken) });
    if (recordInsert.error) { await cloudStorage.storage.from(cloudBucket).remove([objectPath]); throw recordInsert.error; }
    await removeFiles([req.file]);
    return res.status(201).json({
      document: {
        id,
        downloadToken,
        originalName: path.basename(req.file.originalname).slice(0, 255),
        size: req.file.size,
        pages: pdf.getPageCount(),
      },
    });
  } catch (error) {
    await removeFiles([req.file]);
    if (error instanceof Error && /encrypted|password/i.test(error.message)) {
      return res.status(422).json({ error: 'Password-protected PDFs are not supported by this upload endpoint.' });
    }
    return res.status(422).json({ error: 'The uploaded file is not a readable PDF.' });
  }
});

app.get('/api/documents/:id/download', async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: 'Invalid document ID.' });
  if (!cloudStorage) return res.status(503).json({ error: 'Durable cloud storage is not configured.' });
  const record = await authorizeDocumentDownload(req.params.id, req.header('authorization'));
  if (!record) return res.status(401).json({ error: 'A valid document download token is required.' });
  const downloaded = await cloudStorage.storage.from(cloudBucket).download(record.object_path);
  if (downloaded.error || !downloaded.data) return res.status(404).json({ error: 'Document not found.' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
  return res.status(200).send(Buffer.from(await downloaded.data.arrayBuffer()));
});
app.post('/api/pdf/merge', upload.array('files', 10), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  if (files.length < 2) {
    await removeFiles(files);
    return res.status(400).json({ error: 'Select at least two PDF files in the "files" field.' });
  }
  try {
    const merged = await PDFDocument.create();
    for (const file of files) {
      await assertPdfSignature(file.path);
      const source = await PDFDocument.load(await fs.readFile(file.path), { ignoreEncryption: false });
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }
    const output = Buffer.from(await merged.save());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="merged.pdf"');
    return res.status(200).send(output);
  } catch {
    return res.status(422).json({ error: 'Unable to merge the supplied PDFs. Check that each file is a valid, unencrypted PDF.' });
  } finally {
    await removeFiles(files);
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const error = err as { code?: string; message?: string };
  if (res.headersSent) return;
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `File exceeds the ${Math.floor(maxUploadBytes / 1024 / 1024)} MB upload limit.` });
  if (error.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'Too many files. Maximum is 10.' });
  if (error.message === 'Only PDF files are accepted' || error.message === 'Only genuine PDF files are accepted.') return res.status(415).json({ error: 'Only genuine PDF files are accepted.' });
  if (error.message === 'Origin is not allowed by CORS') return res.status(403).json({ error: error.message });
  return res.status(500).json({ error: 'Request could not be processed.' });
});

export default app;
