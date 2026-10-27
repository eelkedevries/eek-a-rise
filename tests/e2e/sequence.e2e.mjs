// End-to-end check of the built page (or of a URL given as the first argument):
// it loads without errors or outside requests, One image keeps mean and RMS
// contrast, the default sequence builds and plays, the PNG ZIP passes the
// independent Python verifier, and the video passes the ffprobe check.
// Usage: npm run e2e  |  npm run e2e -- https://eelkedevries.com/eek-a-rise/
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
};

let server = null;
let url = process.argv[2];
if (!url) {
  server = await preview({ preview: { port: 4179, strictPort: true }, logLevel: 'silent' });
  url = 'http://localhost:4179/eek-a-rise/';
}
const origin = new URL(url).origin;
const out = mkdtempSync(join(tmpdir(), 'eek-a-rise-e2e-'));
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 1400 } });
  const page = await context.newPage();
  const errors = [];
  const outside = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('data:') && !u.startsWith('blob:') && !(u.startsWith(origin) && new URL(u).pathname.startsWith('/eek-a-rise/'))) outside.push(u);
  });
  await page.goto(url, { waitUntil: 'networkidle' });

  // One image: mean and RMS contrast of the frame equal the source's at every weight.
  await page.waitForFunction(() => document.querySelector('[data-readout="frame-mean"]').textContent !== '–');
  let same = true;
  for (const a of [0, 0.3, 0.5, 0.75, 1]) {
    await page.$eval('#one-weight', (el, a) => { el.value = String(a); el.dispatchEvent(new Event('input', { bubbles: true })); }, a);
    await page.waitForFunction((a) => document.querySelector('#one-weight-value').value === a.toFixed(2), a);
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-readout]')].map((e) => [e.dataset.readout, e.textContent])));
    same &&= r['frame-mean'] === r['source-mean'] && r['frame-rms'] === r['source-rms'];
  }
  check('One image: mean and RMS contrast equal the source at weights 0, 0.3, 0.5, 0.75 and 1', same);

  // Sequence: build the default, play it, download it.
  await page.click('#tab-sequence');
  await page.waitForFunction(() => document.querySelectorAll('#seq-list li').length === 9);
  const started = Date.now();
  await page.click('#seq-build');
  await page.waitForSelector('#seq-result:not([hidden])', { timeout: 300000 });
  check('Sequence: the default builds', true, `${((Date.now() - started) / 1000).toFixed(1)} s, ${await page.textContent('#seq-build-note')}`);
  const measured = await page.textContent('#seq-measured');
  check('Sequence: measured similarity peaks at the tag frequency', /peaks at 2\.00 Hz/.test(measured), measured);
  await page.click('#seq-play');
  await page.waitForTimeout(800);
  const f1 = Number(await page.$eval('#seq-scrub', (e) => e.value));
  await page.waitForTimeout(1000);
  const f2 = Number(await page.$eval('#seq-scrub', (e) => e.value));
  await page.click('#seq-play');
  check('Sequence: the player advances about 60 frames per second', f2 - f1 >= 45 && f2 - f1 <= 75, `${f2 - f1} frames in 1 s`);

  const [zip] = await Promise.all([page.waitForEvent('download', { timeout: 300000 }), page.click('[data-download="zip"]')]);
  const zipPath = join(out, zip.suggestedFilename());
  await zip.saveAs(zipPath);
  const uv = spawnSync('uv', ['run', '--directory', 'tools/reference', 'verify_export.py', zipPath], { encoding: 'utf8' });
  const python = uv.error ? spawnSync('python3', ['tools/reference/verify_export.py', zipPath], { encoding: 'utf8' }) : uv;
  const report = (() => {
    try {
      return JSON.parse(python.stdout);
    } catch {
      return null;
    }
  })();
  check('PNG ZIP passes tools/reference/verify_export.py', python.status === 0 && report?.passed === true,
    report ? `mean ${report.mean_range.join('–')}, RMS contrast ${report.rms_contrast_range.join('–')}, spectrum within ${(100 * report.amplitude_spectrum_max_rel_dev).toFixed(2)} %, content at ${report.content_peak_hz} Hz` : python.stderr.slice(0, 300));

  const videoEnabled = !(await page.$eval('[data-download="video"]', (b) => b.disabled));
  if (videoEnabled) {
    const [video] = await Promise.all([page.waitForEvent('download', { timeout: 300000 }), page.click('[data-download="video"]')]);
    const videoPath = join(out, video.suggestedFilename());
    await video.saveAs(videoPath);
    const probe = spawnSync('bash', ['scripts/verify-export.sh', videoPath], { encoding: 'utf8' });
    check('Video passes scripts/verify-export.sh', probe.status === 0, `${video.suggestedFilename()}; ${probe.stdout.trim().split('\n').slice(0, 2).join('; ')}`);
  } else {
    check('Video: this browser has no encoder; the button is disabled with an explanation', true);
  }

  check('No console errors', errors.length === 0, errors.join(' | '));
  check('No request outside /eek-a-rise/', outside.length === 0, outside.join(' | '));
} finally {
  await browser.close();
  if (server) await new Promise((done) => server.httpServer.close(done));
}

console.log(`\nFiles in ${resolve(out)}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} check(s) FAILED` : 'All end-to-end checks passed.');
process.exit(failed ? 1 : 0);
