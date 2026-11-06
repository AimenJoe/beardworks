// img/logo*.svg → PNG(16·32·128·256·512, Epic 브랜드 설정은 logo-128.png). Chromium으로 그린다(SVG 그대로).
//   node tools/render_logo.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const img = path.join(__dirname, '..', 'img');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [src, name] of [['logo.svg', 'logo'], ['logo-white.svg', 'logo-white'], ['logo-tile.svg', 'logo-tile']]) {
    const svg = fs.readFileSync(path.join(img, src), 'utf8');
    for (const s of [16, 32, 128, 256, 512]) {
      await p.setViewportSize({ width: s, height: s });
      await p.setContent(`<html><body style="margin:0;background:transparent"><img style="display:block" width="${s}" height="${s}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body></html>`);
      await p.screenshot({ path: path.join(img, `${name}-${s}.png`), omitBackground: true });
    }
  }
  // 프로필 그림 400×400(상점·SNS 프로필 — 원형으로 잘려도 상징이 원 안에)
  {
    const svg = fs.readFileSync(path.join(img, 'profile.svg'), 'utf8');
    await p.setViewportSize({ width: 400, height: 400 });
    await p.setContent(`<html><body style="margin:0"><img style="display:block" width="400" height="400" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body></html>`);
    await p.screenshot({ path: path.join(img, 'profile-400.png') });
  }
  fs.copyFileSync(path.join(img, 'logo-tile-32.png'), path.join(img, 'favicon.png'));
  await b.close();
})();
