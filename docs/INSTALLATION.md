# Local installation
1. Install Node.js 22+ and Docker Desktop.
2. Copy `.env.example` to `.env`; replace JWT_SECRET with a long random value.
3. Run `docker compose up -d db`.
4. Run `npm install` from the repository root.
5. Run `npm run dev`.
6. Open http://localhost:5173. API health: http://localhost:4000/api/health.
Frontend PDF insertion/export currently runs locally in the browser. Backend upload and merge endpoints are available separately.
