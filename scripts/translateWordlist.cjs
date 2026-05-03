/**
 * Translates second column of vocabulary/wordList.js from Spanish to Brazilian Portuguese.
 * Resumable via scripts/translation_cache.json
 */
const fs = require('fs');
const path = require('path');
const { translate } = require('google-translate-api-x');

const ROOT = path.join(__dirname, '..');
const WORDLIST = path.join(ROOT, 'vocabulary', 'wordList.js');
const CACHE = path.join(__dirname, 'translation_cache.json');

const PAIR_RE = /\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]/g;

const BATCH_SIZE = 80;

function loadCache() {
  if (!fs.existsSync(CACHE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 0), 'utf8');
}

function collectPairs(content) {
  const pairs = [];
  let m;
  const re = new RegExp(PAIR_RE.source, 'g');
  while ((m = re.exec(content)) !== null) {
    const full = m[0];
    const start = m.index;
    const end = start + full.length;
    let en, es;
    try {
      [en, es] = JSON.parse(full);
    } catch (e) {
      throw new Error(`JSON.parse failed at ${start}: ${e.message}\n${full.slice(0, 120)}`);
    }
    pairs.push({ start, end, en, es });
  }
  return pairs;
}

async function main() {
  let content = fs.readFileSync(WORDLIST, 'utf8');
  const pairs = collectPairs(content);
  const uniqueEs = [...new Set(pairs.map((p) => p.es))];
  const cache = loadCache();

  const pending = uniqueEs.filter((es) => cache[es] === undefined);
  console.log('Unique Spanish:', uniqueEs.length, 'already cached:', uniqueEs.length - pending.length, 'to translate:', pending.length);

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    let attempts = 0;
    while (attempts < 4) {
      try {
        const results = await translate(chunk, { from: 'es', to: 'pt' });
        const arr = Array.isArray(results) ? results : [results];
        if (arr.length !== chunk.length) {
          throw new Error(`Batch size mismatch: sent ${chunk.length}, got ${arr.length}`);
        }
        chunk.forEach((es, j) => {
          const r = arr[j];
          cache[es] = typeof r === 'string' ? r : r.text;
        });
        saveCache(cache);
        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: translated ${Math.min(i + BATCH_SIZE, pending.length)}/${pending.length}`);
        await new Promise((r) => setTimeout(r, 400));
        break;
      } catch (e) {
        attempts++;
        console.error(`Batch error (attempt ${attempts}):`, e.message);
        if (attempts >= 4) {
          for (const es of chunk) {
            if (cache[es] === undefined) cache[es] = es;
          }
          saveCache(cache);
        } else {
          await new Promise((r) => setTimeout(r, 2000 * attempts));
        }
      }
    }
  }

  const sorted = [...pairs].sort((a, b) => b.start - a.start);
  for (const { start, end, en, es } of sorted) {
    const pt = cache[es] !== undefined ? cache[es] : es;
    const newStr = '[' + JSON.stringify(en) + ', ' + JSON.stringify(pt) + ']';
    content = content.slice(0, start) + newStr + content.slice(end);
  }

  content = content.replace(/^listB = \[/m, 'const listB = [');
  fs.writeFileSync(WORDLIST, content, 'utf8');
  console.log('wordList.js updated. Total pairs:', pairs.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
