# Deployment guide

## Vercel frontend

1. Import the repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Select the Vite framework preset.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add `VITE_API_URL=https://YOUR_API_HOST/api`.
7. Redeploy. The frontend build must not run the backend TypeScript compiler.

`frontend/vercel.json` provides the Vite output and SPA fallback. The Vercel root-directory setting is important: the frontend TypeScript project is in `frontend/tsconfig.json`, not at repository root.

## Railway backend

1. Deploy the repository as a separate Railway service.
2. Set Root Directory to `backend` so Railway uses `backend/Dockerfile`.
3. Set `PORT` (Railway normally supplies it), `FRONTEND_URL` to the exact Vercel origin, `MAX_UPLOAD_MB=50`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_BUCKET=pdf-documents`.
4. The health check path is `/api/health`. It returns HTTP 503 until the Supabase URL and server-only service-role key are configured.
5. Apply the checked-in Supabase migrations before enabling the API. The API stores uploaded PDFs in the private Supabase bucket and document metadata plus SHA-256 token hashes in `backend_documents`. It returns a one-time `downloadToken`; clients must retain it and send `Authorization: Bearer <downloadToken>` to download. Losing the token means the document cannot be downloaded through this API.
6. Never put the service-role key in Vercel `VITE_*` variables or browser code. Rotate it immediately if it is exposed.

The frontend ProPDF Cloud flow is separate from the backend upload API. It uses the user's Supabase session, private Storage bucket and per-user RLS policies for `saved_documents` and storage objects. Configure Vercel `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy. Test with two separate accounts to verify users cannot list, download, or mutate each other's objects or metadata.

## TS18003 (`No inputs were found in config file`)

The checked-in frontend sources are `frontend/src/**/*.ts(x)` and backend sources are `backend/src/**/*.ts`. Their TypeScript configs now include those explicit globs. For Vercel, set Root Directory to `frontend` and build with `npm run build`; do not point the Vercel project at the backend directory or run the backend TypeScript build there.

The historical Vercel deployment itself was not accessible during this repair, so its exact root cause cannot be confirmed from this local source archive. If the error persists, verify that the deployment commit contains `frontend/src`, that Vercel Root Directory is `frontend`, and that the build log references `frontend/tsconfig.json`.

## PDF editing and security behavior

The editor does not rewrite existing PDF text objects in place. Selecting existing text creates an editable replacement overlay. On export, every affected page is rendered into a new page image so the old source text content stream is not retained. Replacement text and black redaction marks are part of that rendered page image. This is destructive page rasterization, not native text-object editing. All text on an affected page becomes non-searchable/non-selectable. OCR can be run again after export on the new PDF to add an invisible searchable text layer; review OCR accuracy before relying on it.

OCR runs on all pages in English and places recognized words in the export as invisible text on pages that were not rasterized. If a page is rasterized for replacement/redaction, OCR words from that page are deliberately omitted to avoid restoring the original hidden text. Run OCR on the exported PDF after checking the visual result if searchable text is needed.

This is not a certified forensic sanitization tool. It does not independently inspect or remove embedded attachments, portfolios, form data, metadata, signatures, hidden layers, or external references. Before sharing confidential files, inspect the exported PDF independently (render every affected page, extract/search/copy text, and inspect document metadata and attachments). Do not claim certified secure erasure or native PDF text-object replacement.

## Production blockers

Before handling confidential/customer documents, finish production deployment, validate storage access with two accounts, configure retention/deletion and backup/restore, malware/content validation, monitoring/alerts, and operational incident procedures. The frontend cloud save flow and backend upload API are separate storage paths; test each independently.
