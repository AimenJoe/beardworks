# Beardworks (털보네공업사)

Beardworks(한국어 상호 털보네공업사) 회사 페이지 — https://beardworks.io (GitHub Pages, `main` 갈래의 맨 위 폴더를 그대로 올린다. 도메인은 `CNAME`).

- `index.html`(한국어) · `en/index.html`(영어): 회사 소개·게임 목록·연락처
- `privacy.html` · `en/privacy.html`: 회사와 모든 게임에 걸친 개인정보처리방침 — Epic Account Services 브랜드 설정의 개인정보처리방침 URL
- 게임마다의 페이지는 그 게임 레포가 하위 도메인으로 올린다(Naïl → https://nail.beardworks.io, `AimenJoe/nail-under-the-roots`의 `site/` · Knellroot → https://knellroot.beardworks.io, `AimenJoe/knellroot`의 `site/`)

글을 고치면 두 언어를 다 고치고 글꼴을 다시 줄인다:

```sh
python3 tools/subset_font.py ../nail-under-the-roots/assets/fonts/Galmuri11-Condensed.ttf
```

로고는 `tools/logo_svg.py`가 숫자로 그린 SVG(얼굴 옆선 = `{ }`, 눈 = `>`·`_`, 콧수염 = 렌치, 턱수염 = 톱니, 한 색 + 흰 틈)다. 고칠 때는 그 파일의 수치를 고치고 다시 만든다 — PNG를 손으로 고치지 않는다. `img/logo.svg`(짙은 색)·`logo-white.svg`·`logo-tile.svg`(노란 타일, 페이지·파비콘), PNG는 16·32·128(Epic 브랜드 설정)·256·512.

```sh
python3 tools/logo_svg.py && node tools/render_logo.js
```

글꼴: [Galmuri](https://github.com/quiple/galmuri)(SIL OFL 1.1, `fonts/OFL.md`). 게임 그림(`img/nail.png`)은 Naïl 공식 페이지의 것과 같다. `img/knellroot.jpg`는 Knellroot 소개 페이지의 `site/img/s_duel.png`(게임 화면)를 640×360으로 줄인 것.

© 2026 Beardworks
