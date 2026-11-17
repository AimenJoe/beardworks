import { test } from "node:test";
import assert from "node:assert/strict";
import { compose, kstDay } from "../src/report.js";

// 2026-11-16(월) 22:17 UTC = 11-17(화) 07:17 KST, 2026-11-15(일) 22:17 UTC = 11-16(월) 07:17 KST
const TUE = Date.parse("2026-11-16T22:17:00Z");
const MON = Date.parse("2026-11-15T22:17:00Z");

test("요일은 한국 시간으로", () => {
  assert.equal(kstDay(TUE), 2);
  assert.equal(kstDay(MON), 1);
});

test("다 정상이면 평일엔 보내지 않는다", () => {
  assert.equal(compose([{ ok: true, what: "a" }], TUE), null);
});

test("지켜보는 중만 있으면 평일엔 보내지 않는다", () => {
  assert.equal(compose([{ ok: false, pending: true, what: "a", detail: "d" }], TUE), null);
});

test("문제가 있으면 제목에 건수와 첫 문제", () => {
  const m = compose([{ ok: false, what: "에셋 x", detail: "HTTP 404" }, { ok: true, what: "b" }], TUE);
  assert.match(m.subject, /문제 1건 — 에셋 x/);
  assert.match(m.text, /HTTP 404/);
  assert.match(m.text, /정상 1건/);
});

test("월요일엔 이상이 없어도 살아 있음 메일", () => {
  const m = compose([{ ok: true, what: "a" }], MON);
  assert.match(m.subject, /이상 없음/);
});

test("손으로 깨우는 점검은 키가 없거나 틀리면 403", async () => {
  const { manualCheck } = await import("../src/index.js");
  const req = (h) => new Request("https://api.beardworks.io/check", { method: "POST", headers: h });
  assert.equal((await manualCheck(req({}), { CHECK_KEY: "k" }, {})).status, 403);
  assert.equal((await manualCheck(req({ Authorization: "Bearer x" }), { CHECK_KEY: "k" }, {})).status, 403);
  assert.equal((await manualCheck(req({ Authorization: "Bearer k" }), {}, {})).status, 403, "키가 설정되지 않았으면 언제나 거절");
});
