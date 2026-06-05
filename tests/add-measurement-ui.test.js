const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(
  html,
  /id="toggleAddBtn"[^>]*>\s*＋\s*<span[^>]*data-i18n="addMeasurementCta"[^>]*>/,
  'measurements header should expose a visible text Add measurement button, not just an unlabeled plus icon'
);

assert.match(
  html,
  /<div class="collapsible-body open" id="addFormBody">/,
  'add measurement form should be visible by default'
);

assert.match(
  html,
  /addMeasurementCta:\s*'Adaugă măsurătoare'/,
  'Romanian add measurement CTA translation should be present'
);

assert.match(
  html,
  /addMeasurementCta:\s*'Add measurement'/,
  'English add measurement CTA translation should be present'
);

console.log('Add measurement UI checks passed');
