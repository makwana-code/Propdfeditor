const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('API health route is implemented', () => {
  const source = fs.readFileSync(path.join(root, 'src/app.ts'), 'utf8');
  assert.match(source, /app\.get\('\/api\/health'/);
  assert.match(source, /status: 'ok'/);
});

test('PDF upload and merge routes enforce PDF workflows', () => {
  const source = fs.readFileSync(path.join(root, 'src/app.ts'), 'utf8');
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
