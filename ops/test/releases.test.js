import { test } from "node:test";
import assert from "node:assert/strict";
import { handleReleases, trim } from "../src/releases.js";
import { fakeCache, fakeFetch } from "./helpers.js";

const GH = "https://api.github.com/repos/AimenJoe/nail-under-the-roots/releases?per_page=8";
const sample = [
  { tag_name: "v1.0.0", name: "x", published_at: "2026-11-10T00:00:00Z", html_url: "h", draft: false, prerelease: false,
    body: "# t — 부제", author: { login: "secret-ish" }, assets: [{ name: "nail.apk", browser_download_url: "u", size: 9, uploader: {} }] },
];

test("trim은 페이지가 쓰는 칸만 남긴다", () => {
  const [r] = trim(sample);
  assert.deepEqual(Object.keys(r).sort(), ["assets", "body", "draft", "html_url", "name", "prerelease", "published_at", "tag_name"]);
  assert.deepEqual(r.assets, [{ name: "nail.apk", browser_download_url: "u" }]);
});

test("모르는 레포는 404 — 아무 레포나 프록시하지 않는다", async () => {
  const r = await handleReleases("evil", {}, { cache: fakeCache(), fetchFn: fakeFetch({}), waitUntil: () => {} });
  assert.equal(r.status, 404);
});

test("처음엔 GitHub에서 받아 캐시에 두고, 다음엔 캐시에서 준다", async () => {
  const cache = fakeCache();
  const waits = [];
  const fetchFn = fakeFetch({ [GH]: () => new Response(JSON.stringify(sample)) });
  const d = { cache, fetchFn, waitUntil: (p) => waits.push(p) };
  const a = await handleReleases("nail-under-the-roots", { GITHUB_TOKEN: "t" }, d);
  assert.equal(a.status, 200);
  assert.equal(a.headers.get("X-Beardworks-Cache"), "miss");
  assert.equal(a.headers.get("Access-Control-Allow-Origin"), "*");
  await Promise.all(waits);
  const b = await handleReleases("nail-under-the-roots", {}, d);
  assert.equal(b.headers.get("X-Beardworks-Cache"), "hit");
  assert.equal((await b.json())[0].tag_name, "v1.0.0");
  assert.equal(fetchFn.calls.length, 1, "두 번째는 GitHub를 부르지 않는다");
});

test("GitHub가 실패하면 마지막으로 받은 것을 stale로 준다", async () => {
  const cache = fakeCache();
  await cache.put(new Request("https://cache.beardworks.internal/good/nail-under-the-roots"), new Response(JSON.stringify(trim(sample))));
  const fetchFn = fakeFetch({ [GH]: () => new Response("rate limited", { status: 403 }) });
  const r = await handleReleases("nail-under-the-roots", {}, { cache, fetchFn, waitUntil: () => {} });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("X-Beardworks-Cache"), "stale");
});

test("실패했는데 옛 값도 없으면 502 — 페이지는 GitHub 직접·적어 둔 값으로 넘어간다", async () => {
  const fetchFn = fakeFetch({ [GH]: () => new Response("", { status: 500 }) });
  const r = await handleReleases("nail-under-the-roots", {}, { cache: fakeCache(), fetchFn, waitUntil: () => {} });
  assert.equal(r.status, 502);
});
