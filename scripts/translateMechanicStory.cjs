const fs = require('fs');
const path = require('path');
const { translate } = require('google-translate-api-x');

const HTML = path.join(__dirname, '..', 'stories', 'mechanicstory.html');
let html = fs.readFileSync(HTML, 'utf8');
const start = html.indexOf('const words = [');
const end = html.indexOf('];', start) + 2;
const arrSrc = html.slice(start + 'const words = '.length, end);
let pairs;
eval('pairs = ' + arrSrc);

(async () => {
  const esList = pairs.map((p) => p[1]);
  const results = await translate(esList, { from: 'es', to: 'pt' });
  const texts = results.map((r) => r.text);
  const newPairs = pairs.map((p, i) => [p[0], texts[i]]);
  const fixedBlock =
    'const words = [\n' +
    newPairs.map((row) => '  ' + JSON.stringify(row)).join(',\n') +
    '\n]';
  html = html.slice(0, start) + fixedBlock + html.slice(end);
  fs.writeFileSync(HTML, html, 'utf8');
  console.log('Updated mechanicstory.html pairs:', newPairs.length);
})().catch(console.error);
