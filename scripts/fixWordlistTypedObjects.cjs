/**
 * Fixes pairs where Portuguese column was accidentally serialized as full translate API response objects.
 */
const fs = require('fs');
const path = require('path');

const WORDLIST = path.join(__dirname, '..', 'vocabulary', 'wordList.js');

function readString(s, i) {
  if (s[i] !== '"') return null;
  let j = i + 1;
  let out = '';
  while (j < s.length) {
    const c = s[j];
    if (c === '\\') {
      out += s[j] + s[j + 1];
      j += 2;
      continue;
    }
    if (c === '"') {
      const raw = s.slice(i, j + 1);
      return { value: JSON.parse(raw), end: j + 1 };
    }
    j++;
  }
  return null;
}

function readBalanced(s, start, open, close) {
  if (s[start] !== open) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return { slice: s.slice(start, i + 1), end: i + 1 };
    }
  }
  return null;
}

function parsePairAt(s, start) {
  if (s[start] !== '[') return null;
  let i = start + 1;
  while (i < s.length && /\s/.test(s[i])) i++;
  const enRead = readString(s, i);
  if (!enRead) return null;
  i = enRead.end;
  while (i < s.length && /\s/.test(s[i])) i++;
  if (s[i] !== ',') return null;
  i++;
  while (i < s.length && /\s/.test(s[i])) i++;
  let pt;
  if (s[i] === '"') {
    const r = readString(s, i);
    if (!r) return null;
    pt = r.value;
    i = r.end;
  } else if (s[i] === '{') {
    const b = readBalanced(s, i, '{', '}');
    if (!b) return null;
    try {
      pt = JSON.parse(b.slice);
    } catch {
      return null;
    }
    i = b.end;
  } else return null;
  while (i < s.length && /\s/.test(s[i])) i++;
  if (s[i] !== ']') return null;
  return { start, end: i + 1, en: enRead.value, pt };
}

function collectPairs(str) {
  const pairs = [];
  for (let idx = 0; idx < str.length; idx++) {
    if (str[idx] !== '[') continue;
    const p = parsePairAt(str, idx);
    if (p) {
      pairs.push(p);
      idx = p.end - 1;
    }
  }
  return pairs;
}

let content = fs.readFileSync(WORDLIST, 'utf8');
const pairs = collectPairs(content);
let fixed = 0;
const sorted = [...pairs].sort((a, b) => b.start - a.start);
for (const { start, end, en, pt } of sorted) {
  let portuguese = pt;
  if (pt && typeof pt === 'object' && typeof pt.text === 'string') {
    portuguese = pt.text;
    fixed++;
  }
  const newStr = '[' + JSON.stringify(en) + ', ' + JSON.stringify(portuguese) + ']';
  content = content.slice(0, start) + newStr + content.slice(end);
}

fs.writeFileSync(WORDLIST, content, 'utf8');
console.log('Pairs processed:', pairs.length, 'object columns fixed:', fixed);
