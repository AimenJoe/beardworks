import { ALERT_FROM } from "./config.js";
import { runAll } from "./checks.js";
import { gh } from "./github.js";
import { handleReleases, preflight } from "./releases.js";
import { compose } from "./report.js";

// beardworks-ops: api.beardworks.io
// - GET /releases/<repo>  공식 페이지용 GitHub Releases 캐시
// - GET /health           살아 있나
// - 매일 아침(cron) 페이지·게임 배포·비공개 에셋·소식 캐시를 점검하고, 문제가 있을 때(와 월요일) 메일

function deps(env, ctx) {
  return {
    cache: caches.default,
    fetchFn: fetch,
    waitUntil: (p) => ctx.waitUntil(p),
  };
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return preflight();
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("method not allowed", { status: 405 });
  if (url.pathname === "/health") return new Response("ok\n");
  const m = /^\/releases\/([A-Za-z0-9._-]+)\/?$/.exec(url.pathname);
  if (m) return handleReleases(m[1], env, deps(env, ctx));
  return new Response("not found\n", { status: 404 });
}

export async function check(env, ctx, nowMs) {
  const d = deps(env, ctx);
  const results = await runAll({
    fetchFn: fetch,
    get: gh(env),
    now: nowMs,
    releasesOf: (repo) => handleReleases(repo, env, d),
  });
  return { results, mail: compose(results, nowMs) };
}

export default {
  fetch: route,

  async scheduled(controller, env, ctx) {
    const { results, mail } = await check(env, ctx, controller.scheduledTime);
    const bad = results.filter((r) => !r.ok);
    console.log(JSON.stringify({ checked: results.length, bad: bad.map((r) => `${r.what}: ${r.detail}`) }));
    if (!mail) return;
    if (!env.ALERT_TO) throw new Error("ALERT_TO 비밀 값이 없다 — 메일을 보낼 곳을 모른다");
    await env.EMAIL.send({ from: ALERT_FROM, to: env.ALERT_TO, subject: mail.subject, text: mail.text });
  },
};
