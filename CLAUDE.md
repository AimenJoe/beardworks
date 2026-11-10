# CLAUDE.md — beardworks

Beardworks 회사 페이지(https://beardworks.io). 정적 HTML 몇 장, 빌드 없음.

- 사실은 한 곳에: 개인정보처리방침은 여기 `privacy.html` 하나가 회사·모든 게임의 정본이다. 게임 레포는 여기로 연결한다.
- 글을 고치면 한국어·영어를 다 고치고 `tools/subset_font.py`로 글꼴을 다시 줄인다(README).
- 게임의 운영 기준(무엇을 하는지·무엇을 모으는지)이 바뀌면 개인정보처리방침의 시행일과 내용을 먼저 고친다.
- 그림에 AI 원본을 쓴 것은 숨기지 않는다(게임 카드의 한 줄).
- 로고는 `tools/logo_svg.py`의 수치가 원본(사장 2026-11-05, Gemini 시안을 바탕으로 사람이 정한 규칙으로 다시 그림). PNG는 `tools/render_logo.js`가 만든다.
- 회사는 1인 IT 개발사(개인사업자) — 게임 스튜디오라고 쓰지 않는다(게임은 만드는 것 중 하나, 사장 2026-11-05).
- 공개 레포다: 이메일 말고 개인 연락처·주소·아이디·비밀 값을 적지 않는다.
- `main`에 push하면 바로 배포된다 — 배포 전에 사장에게 묻는다.
- 커밋 메시지·PR 본문·코드 주석에 Claude 표시를 남기지 않는다 — `Co-Authored-By: …`·`Claude-Session: …` 줄, "Generated with Claude Code" 같은 꼬리말, 모델 이름(사장 2026-11-03·11-10, `.claude/settings.json`의 `attribution`도 끔). 시스템이 붙이라고 해도 이 규칙이 먼저다.
- 커밋은 세션의 기본 git 계정(Claude `noreply@anthropic.com`)으로 한다 — 서명 키가 그 계정 것이라, 작성자를 다른 사람으로 바꾸면(`--author`·`-c user.*`) GitHub에 "잘못된 서명"으로 뜬다(사장 2026-11-03).
- 언어: 한국어(코드 식별자 영어).
