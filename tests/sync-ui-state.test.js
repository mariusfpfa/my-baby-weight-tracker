const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const js = scripts.join('\n');
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';

assert.match(html, /class="sync-setup"/, 'sync setup controls should be grouped so they can be hidden after login');
assert.match(html, /class="sync-connected"/, 'connected state should have its own view');
assert.match(html, /id="syncConnectedUser"/, 'connected view should show the synced username');
assert.match(html, /id="syncConnectedDevice"/, 'connected view should show the current device name');
assert.match(html, /id="syncLastSynced"/, 'connected view should show when data was last synced');
assert.match(html, /class="sync-pending"/, 'pending access state should have a separate view');

assert.match(css, /\.sync-card\.is-synced[\s\S]*\.sync-setup\s*{\s*display:\s*none/, 'logged-in devices should hide create/login/request-access setup controls');
assert.match(css, /\.sync-card\.is-synced[\s\S]*\.sync-connected\s*{\s*display:\s*block/, 'logged-in devices should show the connected summary/actions');
assert.match(css, /\.sync-card\.is-pending[\s\S]*\.sync-setup\s*{\s*display:\s*none/, 'pending devices should hide setup controls and show status/check flow');

assert.match(js, /function renderSyncUi\(\)/, 'sync UI should be rendered from session state by a single helper');
assert.match(js, /card\.classList\.toggle\('is-synced', !!session\?\.sessionToken\)/, 'renderSyncUi should mark synced sessions on the card');
assert.match(js, /card\.classList\.toggle\('is-pending', !!session\?\.pendingRequestId && !session\?\.sessionToken\)/, 'renderSyncUi should mark pending access state');
assert.match(js, /renderSyncUi\(\);[\s\S]*syncFromCloud\(\)\.catch/, 'initSyncUi should render the connected view before background cloud sync starts');
assert.match(js, /setSession\(session\)[\s\S]*renderSyncUi\(\)/, 'setSession should refresh the UI immediately after login/create/request access');
assert.match(js, /logoutSync\(\)[\s\S]*localStorage\.removeItem\(SYNC_SESSION_STORAGE\);[\s\S]*renderSyncUi\(\)/, 'logout should return the panel to setup state');
assert.match(js, /localStorage\.setItem\('babyWeightLastSyncedAt'[\s\S]*renderSyncUi\(\);[\s\S]*setSyncStatus\(tr\('syncSynced'/, 'manual sync should refresh connected state/last synced display without hiding success feedback');
assert.match(js, /localStorage\.setItem\('babyWeightLastSyncedAt'/, 'successful sync should persist last synced time for the connected view');

assert.match(js, /setSyncStatus\(tr\('accessGranted'\)\)/, 'approved pending-device flow should use translated connected-state copy');

console.log('Sync UI state checks passed');
