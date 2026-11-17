import { OWNER, RELEASE_REPOS } from "./config.js";
import { gh } from "./github.js";

// 공식 페이지의 "최신 버전·소식"(nail site.js 등)이 GitHub를 직접 부르지 않게 하는 캐시.
// 방문자 브라우저가 api.github.com을 부르면 IP당 시간 60회(익명)라 같은 IP를 나눠 쓰는 곳에서 막힌다.
// 여기선 10분마다 한 번만 받고, GitHub가 실패하면 마지막으로 받은 것을 준다(최대 7일).

export const FRESH_S = 600;
export const LAST_GOOD_S = 7 * 24 * 3600;
export const BROWSER_S = 300;

// 페이지가 쓰는 칸만 남긴다(본문은 부제·영어 한 줄을 뽑으므로 그대로).
export function trim(list) {
  return list.map((r) => ({
    tag_name: r.tag_name,
    name: r.name,
    published_at: r.published_at,
    html_url: r.html_url,
    draft: r.draft,
    prerelease: r.prerelease,
    body: r.body,
    assets: (r.assets || []).map((a) => ({ name: a.name, browser_download_url: a.browser_download_url })),
  }));
}

const CORS = {
  "Access-Control-Allow-Origin": "*", // 공개 데이터 — 어느 페이지에서 읽어도 된다
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept",
};

function json(body, status, extra = {}) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...extra },
  });
}

const key = (kind, repo) => new Request(`https://cache.beardworks.internal/${kind}/${repo}`);

// deps: { cache, fetchFn, waitUntil } — 시험에서 바꿔 끼운다.
export async function handleReleases(repo, env, deps) {
  if (!RELEASE_REPOS.includes(repo)) return json('{"error":"unknown repo"}', 404);
  const { cache, fetchFn, waitUntil } = deps;

  const hit = await cache.match(key("fresh", repo));
  if (hit) return json(await hit.text(), 200, { "Cache-Control": `public, max-age=${BROWSER_S}`, "X-Beardworks-Cache": "hit" });

  try {
    const list = await gh(env, fetchFn)(`/repos/${OWNER}/${repo}/releases?per_page=8`);
    const body = JSON.stringify(trim(list));
    const put = (kind, s) =>
      cache.put(key(kind, repo), new Response(body, { headers: { "Cache-Control": `public, max-age=${s}` } }));
    waitUntil(Promise.all([put("fresh", FRESH_S), put("good", LAST_GOOD_S)]));
    return json(body, 200, { "Cache-Control": `public, max-age=${BROWSER_S}`, "X-Beardworks-Cache": "miss" });
  } catch (e) {
    const good = await cache.match(key("good", repo));
    if (good) return json(await good.text(), 200, { "Cache-Control": "public, max-age=60", "X-Beardworks-Cache": "stale" });
    return json(JSON.stringify({ error: String(e.message || e) }), 502);
  }
}

export function preflight() {
  return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}
