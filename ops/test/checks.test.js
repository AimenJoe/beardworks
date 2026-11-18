import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDeploy, checkPage, checkVendor, parseBuild } from "../src/checks.js";
import { newestRelease, releaseVersion } from "../src/github.js";
import { fakeFetch, ok } from "./helpers.js";

const game = { repo: "nail-under-the-roots", prod: "https://p", dev: "https://d" };
const HOUR = 3600 * 1000;
const now = Date.parse("2026-11-17T00:00:00Z");
const get = (age) => async (path) => {
  if (path.includes("/commits/")) return { commit: { committer: { date: new Date(now - age).toISOString() } } };
  if (path.includes("/runs")) return { workflow_runs: [{ status: "waiting", conclusion: null, head_sha: "h", html_url: "run" }] };
  throw new Error(path);
};

test("release 갈래는 가장 높은 판이 개발판", () => {
  assert.deepEqual(releaseVersion("release/v1.0"), [1, 0, 0]);
  assert.equal(releaseVersion("release-notes"), null);
  const b = newestRelease([{ name: "release/v0.9" }, { name: "release/v1.0" }, { name: "release/v0.10" }, { name: "main" }]);
  assert.equal(b.name, "release/v1.0");
  assert.equal(newestRelease([{ name: "release/v0.9" }, { name: "release/v0.10" }]).name, "release/v0.10", "숫자로 비교한다(문자열 아님)");
});

test("build.txt는 sha 하나 또는 sha + 판", () => {
  assert.deepEqual(parseBuild("abc release\n"), { sha: "abc", flavor: "release" });
  assert.deepEqual(parseBuild("abc"), { sha: "abc", flavor: "" });
});

test("배포가 머리와 같으면 정상", async () => {
  const fetchFn = fakeFetch({ "https://p/build.txt": ok("h release") });
  const r = await checkDeploy({ fetchFn, get: get(0), now }, game, game.prod, "main", "h", "release");
  assert.equal(r.ok, true);
});

test("다른데 커밋이 막 됐으면 지켜보는 중(알리지 않음)", async () => {
  const fetchFn = fakeFetch({ "https://p/build.txt": ok("old release") });
  const r = await checkDeploy({ fetchFn, get: get(HOUR), now }, game, game.prod, "main", "h", "release");
  assert.equal(r.ok, false);
  assert.equal(r.pending, true);
});

test("다른 채로 세 시간 넘으면 알린다 — 승인 대기도 같이 적는다", async () => {
  const fetchFn = fakeFetch({ "https://p/build.txt": ok("old release") });
  const r = await checkDeploy({ fetchFn, get: get(5 * HOUR), now }, game, game.prod, "main", "h", "release");
  assert.equal(r.pending, false);
  assert.match(r.detail, /waiting/);
});

test("운영 주소에 개발판이 올라가 있으면 알린다", async () => {
  const fetchFn = fakeFetch({ "https://p/build.txt": ok("h dev") });
  const r = await checkDeploy({ fetchFn, get: get(0), now }, game, game.prod, "main", "h", "release");
  assert.equal(r.ok, false);
  assert.ok(!r.pending);
});

test("비공개 에셋이 404면 알린다(2026-11-10 같은 일)", async () => {
  const fetchFn = fakeFetch({
    "https://p/a/x.png": ok("x", { "content-length": "10" }),
  });
  const rs = await checkVendor(fetchFn, "https://p", ["a/x.png", "a/y.png"]);
  assert.deepEqual(rs.map((r) => r.ok), [true, false]);
  assert.ok(fetchFn.calls.every((c) => c.method === "HEAD"), "HEAD로만 — 그림을 받지 않는다");
});

test("HEAD에 길이가 없으면(Cloudflare 정적 파일) 받아서 잰다", async () => {
  const fetchFn = fakeFetch({ "https://p/a/x.png": ok("png"), "https://p/a/e.png": ok("") });
  const rs = await checkVendor(fetchFn, "https://p", ["a/x.png", "a/e.png"]);
  assert.deepEqual(rs.map((r) => r.ok), [true, false]);
  assert.deepEqual(fetchFn.calls.map((c) => c.method), ["HEAD", "GET", "HEAD", "GET"]);
});

test("페이지는 200이고 HTML이 끝까지 와야 정상", async () => {
  const fetchFn = fakeFetch({ "https://a/": ok("<html></html>"), "https://b/": ok("<html>잘림") });
  assert.equal((await checkPage(fetchFn, "https://a/")).ok, true);
  assert.equal((await checkPage(fetchFn, "https://b/")).ok, false);
  assert.equal((await checkPage(fetchFn, "https://c/")).ok, false);
});
