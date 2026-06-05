const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';

assert.match(html, /<meta\s+name="viewport"\s+content="[^"]*width=device-width[^"]*initial-scale=1\.0[^"]*">/, 'page should keep a mobile viewport meta tag');
assert.match(html, /class="card-header measurement-card-header"/, 'measurements header should have a dedicated responsive class');
assert.match(html, /class="measurement-actions"/, 'measurement action buttons should be grouped in a responsive action container');

assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*\.measurement-card-header/, 'CSS should include a <=480px mobile rule for the measurements header');
assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*\.measurement-actions\s*{[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(38px,\s*1fr\)\)/, 'mobile measurement actions should use a 4-column icon grid');
assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*\.add-measurement-btn\s*{[\s\S]*grid-column:\s*1\s*\/\s*-1/, 'mobile add measurement button should span full row');
assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*\.sync-actions\s*{[\s\S]*grid-template-columns:\s*1fr/, 'sync action buttons should stack on narrow phones');
assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*\.range-select\s*{[\s\S]*width:\s*100%/, 'chart range dropdown should be full-width on phones');

assert.match(css, /body, header, \.main, \.card, \.card-header, \.card-body, button, input, select, canvas\s*{[\s\S]*max-width:\s*100%/, 'global mobile safety net should prevent controls from exceeding the viewport');
assert.match(css, /\.left-col\s*{[^}]*min-width:\s*0/, 'left column should be allowed to shrink inside narrow viewports');
assert.match(css, /\.right-col\s*{[^}]*min-width:\s*0/, 'right column should be allowed to shrink inside narrow viewports');
assert.match(css, /@media\s*\(max-width:\s*360px\)[\s\S]*\.measurement-actions\s*{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, 'very narrow iPhones should use a 2-column measurement action grid');

console.log('Mobile responsive UI checks passed');
