# beardworks-ops (Cloudflare Worker)

`api.beardworks.io`에서 도는 작은 Worker 하나. 무료판 안에서 두 가지를 한다.

## 1. 매일 아침 점검 — 문제가 있을 때만 메일
매일 07:17(한국)에 아래를 확인하고, 문제가 있으면(그리고 월요일엔 이상이 없어도 "살아 있음") 확인된 메일함으로 보낸다.

| 무엇 | 어떻게 |
|---|---|
| 페이지 여덟(회사·개인정보처리방침·nail·knellroot, 두 언어) | 200이고 HTML이 끝까지 오나 |
| 게임 웹판(운영 = `main`, 개발판 = 가장 높은 `release/*`) | `build.txt`의 커밋 = 그 갈래 머리 커밋인가, 판(`release`/`dev`)이 맞나. 다르면 머리 커밋이 3시간 넘었을 때만 알린다(배포·승인 대기 중일 수 있으니) — 마지막 `deploy-web` 상태를 같이 적는다 |
| 비공개 에셋(nail의 Sunnyside 네 장, 운영·개발판) | HEAD 200 + 크기 > 0 — 2026-11-10에 에셋 없이 운영판이 나간 일이 다시 생기면 다음 날 아침에 안다 |
| 소식 캐시(아래 2) | 정식 릴리스를 내주나, GitHub를 못 읽어 옛 값을 내주는 중은 아닌가 |

무엇을 볼지는 `src/config.js` 한 곳. 개발판 갈래는 저절로 찾는다(마일스톤이 바뀌어도 고칠 것 없음).

## 2. 공식 페이지용 Releases 캐시
`GET https://api.beardworks.io/releases/<repo>` (`nail-under-the-roots`·`knellroot`만) — GitHub Releases 최근 여덟 개를 페이지가 쓰는 칸만 남겨 준다.
- 10분 캐시, GitHub가 실패하면 마지막으로 받은 것(최대 7일, 헤더 `X-Beardworks-Cache: stale`).
- 왜: 페이지가 브라우저에서 `api.github.com`을 직접 부르면 익명 한도(IP당 시간 60회)에 걸린다. 학교·회사처럼 IP를 나눠 쓰는 곳에선 이미 바닥나 있을 수 있다 — 이 세션의 출구 IP도 남은 횟수 0이었다(2026-11-18).
- 페이지는 이것 → GitHub 직접 → 적어 둔 값 차례로 쓴다.

`GET /health` → `ok`.

`POST /check`(헤더 `Authorization: Bearer <CHECK_KEY>`) — 지금 점검하고 결과와 상관없이 메일(시험 발송). `CHECK_KEY`는 배포마다 CI가 새로 만들어 넣으므로 쓰는 길은 하나: Actions → ops → Run workflow에서 **test_mail** 켜기.

## 3. 문의 양식 — `POST /contact`
- 문의하기 페이지(`contact.html`·`en/contact.html`)의 양식(`contact.js`)이 보낸 종류·이름·이메일·내용을 **메일 한 통**으로 운영자 메일함(비밀 값 `CONTACT_TO`)에 전한다. 답장 주소(Reply-To)는 보낸 사람 — 메일함에서 답장만 누르면 된다. **저장하지 않는다**(개인정보처리방침 4절).
- 스팸 막기: 출처는 `https://beardworks.io`만, Cloudflare Turnstile 토큰을 서버에서 다시 확인(`TURNSTILE_SECRET`), 숨은 미끼 칸(채우면 성공처럼 보이되 안 보냄), 길이 제한, IP마다 1분에 셋(`CONTACT_LIMIT`). IP는 세기만 하고 메일에 넣지 않는다.
- 무료 메일 보내기는 확인된 받는 주소로만 간다 — 그래서 보낸 사람에게 "받았습니다" 자동 회신은 없고 화면에만 알린다.
- 페이지의 Turnstile 사이트 키는 `contact.js`의 `SITEKEY`(공개 값). 비어 있으면 양식을 숨기고 메일 주소만 보인다.

## 돌려 보기
```sh
cd ops
node --test test/*.test.js                     # 시험(의존성 없음)
LIVE_GITHUB_VIA_CURL=1 node tools/live.js      # 진짜 사이트·GitHub로 점검 한 번(메일은 안 보냄)
npx wrangler@4.156.2 dev --test-scheduled      # workerd에서. 점검 깨우기: curl "localhost:8787/__scheduled?cron=17+22+*+*+*"
```

## 배포
`.github/workflows/ops.yml` — `main`에 `ops/**`가 바뀌어 들어오면 시험 → 배포(Environment `ops`). 필요한 값은 그 파일 머리에.
처음 한 번: Environment `ops`(배포 갈래 main만)를 만들고 값을 넣는다 — `CLOUDFLARE_API_TOKEN`·`CLOUDFLARE_ACCOUNT_ID`·`OPS_ALERT_TO`·`OPS_GITHUB_TOKEN`, 문의 양식은 `OPS_TURNSTILE_SECRET`·`OPS_CONTACT_TO`(없으면 `/contact`는 503). 첫 배포가 `api.beardworks.io` 사용자 지정 도메인과 인증서를 만든다.

## 비용
Workers 무료판: 요청 하루 10만·Cron 계정당 5(여기서 1)·확인된 내 메일함으로 보내는 메일은 무료. 정적이 아닌 요청(소식 캐시)은 요청으로 센다.
