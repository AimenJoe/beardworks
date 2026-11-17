// 실제 사이트·GitHub를 상대로 점검을 한 번 돌려 결과와 보낼 메일을 찍는다(메일은 보내지 않는다).
//   node tools/live.js            GITHUB_TOKEN이 있으면 쓴다
//   LIVE_GITHUB_VIA_CURL=1 node tools/live.js   GitHub만 curl로(이미 인증된 프록시 뒤에서 돌릴 때 — 익명은 공유 IP에서 막힌다)
import { execFileSync } from "node:child_process";
import { runAll } from "../src/checks.js";
import { gh } from "../src/github.js";
import { handleReleases } from "../src/releases.js";
import { compose } from "../src/report.js";

const store = new Map();
const cache = {
  match: async (r) => store.get(r.url)?.clone(),
  put: async (r, res) => void store.set(r.url, res.clone()),
};
const viaCurl = process.env.LIVE_GITHUB_VIA_CURL === "1";
const env = { GITHUB_TOKEN: viaCurl ? "" : process.env.GITHUB_TOKEN };
const fetchFn = async (url, init) => {
  if (!viaCurl || !String(url).startsWith("https://api.github.com/")) return fetch(url, init);
  const out = execFileSync("curl", ["-sS", "-m", "20", "-H", "Accept: application/vnd.github+json", "-w", "\n%{http_code}", url]).toString();
  const i = out.lastIndexOf("\n");
  return new Response(out.slice(0, i), { status: Number(out.slice(i + 1)) });
};
const now = Date.now();
const results = await runAll({
  fetchFn: fetch,
  get: gh(env, fetchFn),
  now,
  releasesOf: (repo) => handleReleases(repo, env, { cache, fetchFn, waitUntil: () => {} }),
});
for (const r of results) console.log(`${r.ok ? "✓" : r.pending ? "…" : "✗"} ${r.what}${r.detail ? `  — ${r.detail}` : ""}`);
const mail = compose(results, now);
console.log("\n--- 메일:", mail ? `\n${mail.subject}\n\n${mail.text}` : "보내지 않음");
