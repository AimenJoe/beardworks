import { ALERT_FROM } from "./config.js";
import { runAll } from "./checks.js";
import { gh } from "./github.js";
import { handleReleases, preflight } from "./releases.js";
import { compose } from "./report.js";

// beardworks-ops: api.beardworks.io
// - GET /releases/<repo>  공식 페이지용 GitHub Releases 캐시
// - GET /health           살아 있나
// - 매일 아침(cron) 페이지·게임 배포·비공개 에셋·소식 캐시를 점검하고, 문제가 있을 때(와 월요일) 메일
// - POST /check          지금 점검하고 결과와 상관없이 메일(시험 발송). 배포마다 CI가 새로 만드는 CHECK_KEY가 있어야 한다

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
  if (url.pathname === "/check" && request.method === "POST") return manualCheck(request, env, ctx);
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

// 손으로 깨우는 점검: 메일 길이 살아 있는지 보는 용도라 문제가 없어도 보낸다.
export async function manualCheck(request, env, ctx) {
  const auth = request.headers.get("Authorization") || "";
  if (!env.CHECK_KEY || auth !== `Bearer ${env.CHECK_KEY}`) return new Response("forbidden\n", { status: 403 });
  const now = Date.now();
  const { results, mail } = await check(env, ctx, now);
  const bad = results.filter((r) => !r.ok);
  const m = mail || { subject: "[beardworks 점검] 이상 없음(시험 발송)", text: `정상 ${results.length - bad.length}건 — 손으로 깨운 점검이다.` };
  let sent = false;
  let error = null;
  try {
    await sendMail(env, { ...m, subject: m.subject.replace("[beardworks 점검]", "[beardworks 점검·시험]") });
    sent = true;
  } catch (e) {
    error = `${e.code || ""} ${e.message || e}`.trim();
  }
  return new Response(JSON.stringify({ checked: results.length, bad: bad.map((r) => `${r.what}: ${r.detail}`), sent, error }, null, 1), {
    status: sent ? 200 : 500,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function sendMail(env, { subject, text }) {
  if (!env.ALERT_TO) throw new Error("ALERT_TO 비밀 값이 없다 — 메일을 보낼 곳을 모른다");
  await env.EMAIL.send({ from: ALERT_FROM, to: env.ALERT_TO, subject, text });
}

export default {
  fetch: route,

  async scheduled(controller, env, ctx) {
    const { results, mail } = await check(env, ctx, controller.scheduledTime);
    const bad = results.filter((r) => !r.ok);
    console.log(JSON.stringify({ checked: results.length, bad: bad.map((r) => `${r.what}: ${r.detail}`) }));
    if (mail) await sendMail(env, mail);
  },
};
