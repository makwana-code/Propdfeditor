# ProPDF Studio

ProPDF Studio is an existing React + TypeScript + Vite frontend and Express + TypeScript API starter for a browser-based PDF workspace.

## Implemented in this project

- Select and validate a PDF in the browser, then preview it with the browser's built-in PDF viewer.
- Navigate between pages with bounded page controls.
- Add new text to a selected page and export a new PDF locally using `pdf-lib`.
- Upload a PDF to the API, validate its structure, and download it by generated document ID.
- Merge 2–10 PDFs through the API and download the merged result.
- API rate limiting, security headers, CORS allow-list, upload size/count limits, UUID storage names, and temporary merge-file cleanup.
- PostgreSQL Prisma starter schema, Docker build, Railway configuration, Vercel frontend configuration, and GitHub Actions CI workflow.

## Important scope and production limitations

This is a repaired functional MVP, not a complete Nitro/Acrobat replacement and not yet a production document service. It does not edit existing PDF text objects, OCR scanned pages, convert Office documents, apply permanent secure redactions, validate digital signatures, or provide a complete annotation/form/signature suite. Authentication and authorization are not implemented, the Prisma schema is not wired into the API, and uploads currently use local disk rather than durable private object storage. Do not expose confidential documents to a public deployment until authentication, ownership checks, durable storage, retention/deletion controls, and security testing are implemented.

## Requirements and local development

- Node.js 20.11 or newer
- npm 10 or newer

```bash
npm install
cp backend/.env.example backend/.env
npm run dev
```

Frontend: http://localhost:5173  
API health: http://localhost:4000/api/health

Set `VITE_API_URL` in `frontend/.env` to the API base URL ending in `/api` when the backend is not on localhost.

## Verify

```bash
npm run typecheck
npm run build
npm test
```

See `docs/DEPLOYMENT.md` before deployment. Deploy `frontend` and `backend` as separate services.
