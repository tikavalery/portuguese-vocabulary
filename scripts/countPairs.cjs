const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'vocabulary', 'wordList.js');
const content = fs.readFileSync(filePath, 'utf8');
const re = /\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]/g;

let n = 0;
let m;
const failed = [];
while ((m = re.exec(content)) !== null) {
  try {
    JSON.parse(m[0]);
    n++;
  } catch (e) {
    failed.push({ at: m.index, snippet: m[0].slice(0, 80) });
  }
}
const re2 = /\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]/g;
const seen = new Set();
while ((m = re2.exec(content)) !== null) {
  const p = JSON.parse(m[0]);
  seen.add(p[1]);
}
console.log('pairs:', n, 'unique_es:', seen.size, 'parse_failed:', failed.length);
if (failed.length) console.log(failed.slice(0, 5));
