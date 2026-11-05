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
5. Provision PostgreSQL and set `DATABASE_URL` if/when database-backed features are enabled. The current API does not yet use Prisma for persistence. Uploaded documents are protected by a one-time capability token: retain the `downloadToken` returned by upload and send it as `Authorization: Bearer <downloadToken>` when downloading. Losing the token means the document cannot be downloaded through this API.

The current file storage is local disk and may be ephemeral on hosted infrastructure. Use private S3-compatible storage and access control before production use.

## TS18003 (`No inputs were found in config file`)

The checked-in frontend sources are `frontend/src/**/*.ts(x)` and backend sources are `backend/src/**/*.ts`. Their TypeScript configs now include those explicit globs. For Vercel, set Root Directory to `frontend` and build with `npm run build`; do not point the Vercel project at the backend directory or run the backend TypeScript build there.

The historical Vercel deployment itself was not accessible during this repair, so its exact root cause cannot be confirmed from this local source archive. If the error persists, verify that the deployment commit contains `frontend/src`, that Vercel Root Directory is `frontend`, and that the build log references `frontend/tsconfig.json`.

## Production blockers

Before handling real customer or confidential documents, implement and test authentication, authorization and per-user document ownership, database-backed document records and migrations, durable private object storage, deletion/retention policy, malware/content validation, observability, and operational backups. OCR, Office conversion, true native PDF text-object replacement, secure redaction, signatures, and full annotation tooling are not included in this MVP. The current existing-text editor draws a visual cover and replacement text; the original text remains in the PDF content and may still be extracted or searched. Never use this overlay as redaction or for removing confidential information.
