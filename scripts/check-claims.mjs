// Checks public prose against the claim rules of the explainer texts: no
// contractions (possessives such as "brain's" are fine) and none of the phrases
// the rules exclude. Scans the string literals in src/content/** and the text
// of index.html, not other code, where words such as "static" are keywords.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APOSTROPHE = "['’]";
const RULES = [
  [new RegExp(`\\b\\w+n${APOSTROPHE}t\\b`, 'i'), 'contraction (n’t)'],
  [new RegExp(`\\b(it|that|there|what|let)${APOSTROPHE}s\\b`, 'i'), 'contraction (’s for is or us)'],
  [new RegExp(`\\bI${APOSTROPHE}m\\b`), 'contraction (I’m)'],
  [new RegExp(`\\w${APOSTROPHE}(re|ll|ve|d)\\b`, 'i'), 'contraction (’re, ’ll, ’ve, ’d)'],
  [/the image stays the same/i, 'claim: the image stays the same'],
  [/pixels stay the same/i, 'claim: pixels stay the same'],
  [/\bstatic\b/i, 'comparison with static'],
  [/\ba computer\b/i, '"a computer" instead of "an algorithm"'],
];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

/** String literals that read as prose (they contain a space). */
function strings(source) {
  const out = [];
  const pattern = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  for (const m of source.matchAll(pattern)) {
    const text = (m[1] ?? m[2] ?? m[3]).replace(/<[^>]+>/g, ' ').replace(/\$\{[^}]*\}/g, ' ');
    if (text.includes(' ')) out.push(text);
  }
  return out;
}

function htmlText(source) {
  return [source.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, '\n')];
}

const problems = [];
const targets = [...files('src/content').filter((f) => /\.(ts|js)$/.test(f)).map((f) => [f, strings(readFileSync(f, 'utf8'))]), ['index.html', htmlText(readFileSync('index.html', 'utf8'))]];
for (const [file, texts] of targets) {
  for (const text of texts) {
    for (const [rule, name] of RULES) {
      const hit = text.match(rule);
      if (hit) problems.push(`${file}: ${name}: "…${text.slice(Math.max(0, hit.index - 30), hit.index + hit[0].length + 30).replace(/\s+/g, ' ')}…"`);
    }
  }
}

if (problems.length) {
  console.error(`Claim check failed:\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`Claim check passed (${targets.length} files).`);
