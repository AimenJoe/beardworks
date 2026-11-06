// 배너 1500×500(X 헤더 등 — 왼쪽 아래는 프로필 사진이 덮으니 비운다). 로고 타일 + 이름. 글꼴은 게임의 Galmuri11(OFL).
//   node tools/render_banner.js [../nail-under-the-roots/assets/fonts/Galmuri11-Condensed.ttf]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const img = path.join(__dirname, '..', 'img');
const font = process.argv[2] || path.join(__dirname, '..', '..', 'nail-under-the-roots', 'assets', 'fonts', 'Galmuri11-Condensed.ttf');
const W = 1500, H = 500;
(async () => {
  const tile = fs.readFileSync(path.join(img, 'logo-tile.svg')).toString('base64');
  const ttf = fs.readFileSync(font).toString('base64');
  const html = `<html><head><style>
    @font-face { font-family: G; src: url(data:font/ttf;base64,${ttf}); }
    body { margin:0; width:${W}px; height:${H}px; background:#17130F; overflow:hidden; font-family:G; }
    .bg { position:absolute; inset:0; color:#2a231b; font-size:44px; line-height:84px; letter-spacing:40px; white-space:pre; transform:rotate(-8deg) translate(-60px,-80px); opacity:.9; }
    .row { position:absolute; left:470px; top:0; height:${H}px; display:flex; align-items:center; gap:44px; }
    .row img { width:230px; height:230px; }
    h1 { margin:0; color:#ECE5DA; font-size:118px; font-weight:400; line-height:1; letter-spacing:2px; }
    p { margin:18px 0 0; color:#F2CD5C; font-size:40px; letter-spacing:1px; }
    small { display:block; margin-top:14px; color:#B8AB9B; font-size:30px; }
  </style></head><body>
    <div class="bg">${Array(12).fill('{ }  &gt;_  { }  &gt;_  { }  &gt;_  { }  &gt;_  { }  &gt;_').join('\n')}</div>
    <div class="row"><img src="data:image/svg+xml;base64,${tile}">
      <div><h1>Beardworks</h1><p>털보네공업사 · IT Development</p><small>beardworks.io</small></div></div>
  </body></html>`;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(img, `banner-${W}x${H}.png`) });
  await b.close();
})();
