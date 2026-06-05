const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const edgeFunction = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'baby-api', 'index.ts'), 'utf8');
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .map((file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8'))
  .join('\n');

assert.match(
  migrations,
  /approved_device_id\s+uuid/i,
  'device_requests should persist the exact device approved for that request'
);

assert.match(
  edgeFunction,
  /approved_device_id:\s*device\.id/,
  'approve-request should store the newly created device id on the request'
);

assert.doesNotMatch(
  edgeFunction,
  /from\('devices'\)[\s\S]{0,180}order\('created_at',\s*\{\s*ascending:\s*false\s*\}\)[\s\S]{0,80}limit\(1\)/,
  'request-status must not guess the approved device by newest account device'
);

assert.match(
  edgeFunction,
  /eq\('id',\s*request\.approved_device_id\)/,
  'request-status should fetch the specific approved_device_id for the request'
);

const frontend = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.match(
  frontend,
  /async function loginDevice\(\)[\s\S]*pendingRequestId[\s\S]*checkRequestStatus\(\)/,
  'Login should first check whether a pending request was approved on another device'
);

console.log('Sync request status checks passed');
