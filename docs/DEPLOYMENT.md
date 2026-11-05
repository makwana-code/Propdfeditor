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

1. Deploy the same repository as a separate Railway service.
2. Set the service Root Directory to `backend` so `backend/Dockerfile` is used as `Dockerfile`.
3. Set `PORT` (Railway normally supplies this), `FRONTEND_URL` to the exact deployed Vercel origin, `STORAGE_DIR=/app/uploads`, and `MAX_UPLOAD_MB=50`.
4. The health check path is `/api/health`.
5. Provision PostgreSQL and set `DATABASE_URL` if/when database-backed features are enabled. The current API does not yet use Prisma for persistence. Uploaded documents are protected by a secret capability token: retain the `downloadToken` returned by upload and send it as `Authorization: Bearer <downloadToken>` when downloading. Losing the token means the document cannot be downloaded through this API.

The backend upload API still stores files and token metadata on local disk. On Railway or other ephemeral/container hosting, this is not durable and the API upload endpoint must not be used for production documents until its storage adapter is moved to persistent object storage. The frontend ProPDF Cloud flow uses Supabase Storage directly and can be made durable by applying `supabase/migrations/202611050001_private_pdf_cloud.sql` in the Supabase SQL Editor. That migration creates a private `pdf-documents` bucket, the `saved_documents` table, and per-user Row Level Security policies for both rows and objects. Configure frontend Vercel environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy. Never put a Supabase service-role key in frontend variables. Verify email confirmation/auth settings and test two separate users cannot list, download, or mutate each other's objects or metadata before production use.

## TS18003 (`No inputs were found in config file`)

The checked-in frontend sources are `frontend/src/**/*.ts(x)` and backend sources are `backend/src/**/*.ts`. Their TypeScript configs now include those explicit globs. For Vercel, set Root Directory to `frontend` and build with `npm run build`; do not point the Vercel project at the backend directory or run the backend TypeScript build there.

The historical Vercel deployment itself was not accessible during this repair, so its exact root cause cannot be confirmed from this local source archive. If the error persists, verify that the deployment commit contains `frontend/src`, that Vercel Root Directory is `frontend`, and that the build log references `frontend/tsconfig.json`.

## Production blockers

Before handling real customer or confidential documents, complete deployment, configure and test the Supabase migration above, implement deletion/retention policy, malware/content validation, observability, and operational backups. The current editor does not rewrite original PDF text objects. When an existing-text replacement or redaction is exported, the affected page is rasterized into a new PDF page image to remove the source text layer; this preserves visual appearance but makes all text on that page non-searchable/selectable until OCR is run again. Redaction is a destructive visual black-out of a selected existing text region followed by page rasterization; independently verify exported PDFs by text extraction, search, copy/paste, and visual inspection before sharing. This implementation is not a certified forensic sanitization tool and does not cover hidden attachments, embedded files, document portfolios, or external signatures. Do not claim native text-object editing or certified secure erasure.
