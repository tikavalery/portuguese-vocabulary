const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, '..', 'vocabulary', 'wordList.js'), 'utf8');
const re = /\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]/g;
let n = 0;
let m;
const found = new Set();
while ((m = re.exec(content)) !== null) {
  n++;
  found.add(m.index);
}
console.log('regex matches:', n);

// Find [" that are not start of matched pairs
let idx = 0;
while ((idx = content.indexOf('["', idx)) !== -1) {
  const ok = [...found].some((pos) => pos === idx || pos === idx - 1);
  // bracket might be after newline space
  const lineStart = content.lastIndexOf('\n', idx) + 1;
  const lineIndent = content.slice(lineStart, idx);
  const simple = idx;
  if (!found.has(simple) && !found.has(simple - 1)) {
    const snippet = content.slice(idx, idx + 120);
    if (snippet.startsWith('["')) console.log('Unmatched at', idx, snippet.replace(/\n/g, '\\n'));
  }
  idx++;
}
