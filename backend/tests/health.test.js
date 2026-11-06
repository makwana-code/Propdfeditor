const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appSource = () => fs.readFileSync(path.join(root, 'src/app.ts'), 'utf8');

test('API health route reports durable storage readiness', () => {
  const source = appSource();
  assert.match(source, /app\.get\('\/api\/health'/);
  assert.match(source, /status: cloudStorage \? 'ok' : 'degraded'/);
  assert.match(source, /durableStorage: Boolean\(cloudStorage\)/);
});

test('backend documents use private Supabase storage and token authorization', () => {
  const source = appSource();
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /backend_documents/);
  assert.match(source, /cloudStorage\.storage\.from\(cloudBucket\)\.upload/);
  assert.match(source, /cloudStorage\.storage\.from\(cloudBucket\)\.download/);
  assert.match(source, /timingSafeEqual/);
  assert.match(source, /Durable cloud storage is not configured/);
});

test('PDF upload and merge routes enforce PDF workflows', () => {
  const source = appSource();
  assert.match(source, /app\.post\('\/api\/documents\/upload'/);
  assert.match(source, /app\.post\('\/api\/pdf\/merge'/);
  assert.match(source, /LIMIT_FILE_SIZE/);
  assert.match(source, /removeFiles\(files\)/);
});

test('backend Docker build includes the Prisma schema before generation', () => {
  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /COPY prisma \.\/prisma/);
  assert.match(dockerfile, /prisma generate/);
});
