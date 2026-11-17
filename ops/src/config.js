// 점검·캐시가 보는 것 — 바뀌면 여기 한 곳만 고친다.

export const OWNER = "AimenJoe";

// 소식 캐시(/releases/<repo>)가 받아 주는 레포.
export const RELEASE_REPOS = ["nail-under-the-roots", "knellroot"];

// 열려 있어야 하는 페이지(GitHub Pages, Cloudflare 프록시 뒤).
export const PAGES = [
  "https://beardworks.io/",
  "https://beardworks.io/en/",
  "https://beardworks.io/privacy.html",
  "https://beardworks.io/en/privacy.html",
  "https://nail.beardworks.io/",
  "https://nail.beardworks.io/en/",
  "https://knellroot.beardworks.io/",
  "https://knellroot.beardworks.io/en/",
];

// 게임 웹판. 운영 = main, 개발판 = 가장 높은 release/* 갈래. build.txt 첫 낱말이 그 갈래 머리 커밋이어야 한다.
// flavor: build.txt 둘째 낱말("release" | "dev")을 쓰는 레포만.
// vendor: 비공개 에셋 레포(nail-assets)에서 받아 실리는 파일 — 비면 운영판도 대체 그림으로 조용히 빌드된다(2026-11-10).
const SUNNY = "assets/vendor/sunnyside/Sunnyside_World_ASSET_PACK_V2.1/Sunnyside_World_Assets";
export const GAMES = [
  {
    repo: "nail-under-the-roots",
    prod: "https://nail-under-the-roots.netlify.app",
    dev: "https://dev--nail-under-the-roots.netlify.app",
    flavor: true,
    vendor: [
      `${SUNNY}/Tileset/spr_tileset_sunnysideworld_16px.png`,
      `${SUNNY}/Elements/Plants/spr_deco_tree_01_strip4.png`,
      `${SUNNY}/Elements/Plants/spr_deco_mushroom_blue_01_strip4.png`,
      `${SUNNY}/Elements/VFX/Fire/spr_deco_fire_02_strip4.png`,
    ],
  },
  {
    repo: "knellroot",
    prod: "https://knellroot.netlify.app",
    dev: "https://dev--knellroot.netlify.app",
    flavor: false,
    vendor: [],
  },
];

// 배포가 도는 동안은 build.txt가 뒤처져 있는 게 정상이다. 머리 커밋이 이보다 오래됐는데도 다르면 알린다
// (운영 배포 승인을 잊은 것도 여기서 걸린다).
export const DEPLOY_GRACE_MS = 3 * 60 * 60 * 1000;

// 알림 메일의 보내는 주소(라우팅 도메인이어야 한다). 받는 주소는 비밀 값 ALERT_TO(확인된 메일함).
export const ALERT_FROM = { email: "ops@beardworks.io", name: "Beardworks 점검" };

// 이상이 없어도 이 요일(한국 시간)엔 "살아 있음" 메일 — 점검기 자체가 죽은 걸 알아채려고. 0 = 일요일.
export const HEARTBEAT_WEEKDAY_KST = 1;
