import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'screens');
fs.mkdirSync(outDir, { recursive: true });

const pages = [
  { file: 'index.html', name: '01-home' },
  { file: 'results.html', name: '02-results' },
  { file: 'detail.html', name: '03-detail' },
  { file: 'go.html', name: '04-go' },
  { file: 'recent.html', name: '05-recent' },
  { file: 'auth.html', name: '06-auth' },
  { file: 'settings.html', name: '07-settings' },
];

const viewports = [
  { label: 'iphone', width: 390, height: 844 },
  { label: 'ipad', width: 768, height: 1024 },
];

const browser = await chromium.launch();
// Best 5–6 named screens: home, results, detail, go, recent, settings (skip auth as 7th optional)
const best = ['01-home', '02-results', '03-detail', '04-go', '05-recent', '07-settings'];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  for (const p of pages) {
    if (!best.includes(p.name)) continue;
    const url = 'file://' + path.join(__dirname, p.file);
    await page.goto(url, { waitUntil: 'networkidle' });
    const dest = path.join(outDir, `${p.name}-${vp.label}.png`);
    await page.screenshot({ path: dest, fullPage: true });
    console.log('wrote', dest);
  }
  await context.close();
}
await browser.close();
console.log('done');
