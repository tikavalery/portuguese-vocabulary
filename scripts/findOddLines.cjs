const fs = require('fs');
const path = require('path');
const lines = fs.readFileSync(path.join(__dirname, '..', 'vocabulary', 'wordList.js'), 'utf8').split(/\r?\n/);
const pairLine = /^\s*\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\],?\s*$/;
let odd = 0;
lines.forEach((line, i) => {
  const t = line.trim();
  if (!t.startsWith('["')) return;
  if (!pairLine.test(line)) {
    console.log(i + 1, line.slice(0, 160));
    odd++;
  }
});
console.log('odd lines:', odd);
