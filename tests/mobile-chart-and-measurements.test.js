const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';

assert.match(html, /<select[^>]+id="rangeSelect"/, 'chart period control should be a select dropdown');
assert.doesNotMatch(html, /<button class="range-pill"[^>]+onclick="setRange\(/, 'chart period should not be rendered as four separate range buttons');
assert.match(html, /const RANGE_STORAGE_KEY = 'babyChartRangeWeeks:v1';/, 'range selection should have its own localStorage key');
assert.match(html, /localStorage\.getItem\(RANGE_STORAGE_KEY\)/, 'initial state should read saved chart range from localStorage');
assert.match(html, /localStorage\.setItem\(RANGE_STORAGE_KEY, String\(weeks\)\)/, 'setRange should persist the selected chart range');
assert.match(html, /function syncRangeSelect\(\)/, 'range dropdown should stay in sync with state changes');
assert.match(html, /if \(select\) select\.value = String\(state\.rangeWeeks\)/, 'syncRangeSelect should set the dropdown value from state');

assert.match(html, /<button class="delete-btn measurement-delete-btn"/, 'measurement delete button should use a dedicated class for positioning');
assert.match(html, /aria-label="Delete measurement"/, 'measurement delete button should have an accessible label');
assert.match(css, /\.measurement-main\s*{[\s\S]*min-width:\s*0/, 'measurement text column should shrink safely on mobile');
assert.match(css, /\.measurement-delete-btn\s*{[\s\S]*width:\s*36px;[\s\S]*height:\s*36px/, 'measurement delete button should have a stable touch target');
assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*\.measurement-item\s*{[\s\S]*grid-template-columns:\s*1fr auto/, 'mobile measurement rows should keep delete button in a predictable right column');
assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*\.measurement-delete-btn\s*{[\s\S]*align-self:\s*center/, 'mobile delete button should align vertically centered, not float oddly');

console.log('Mobile chart and measurement controls checks passed');
