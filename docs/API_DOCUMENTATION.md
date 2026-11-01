# API
- GET `/api/health`: health status.
- POST `/api/documents/upload`: multipart field `file`, validates PDF structure and stores it locally.
- GET `/api/documents/:id/download`: downloads a stored PDF by generated id.
- POST `/api/pdf/merge`: multipart `files` (up to 10 PDFs), returns merged PDF.
All routes are MVP endpoints. Upload/download are not yet authenticated; do not expose publicly with sensitive documents.
