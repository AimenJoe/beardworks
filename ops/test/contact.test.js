import { test } from "node:test";
import assert from "node:assert/strict";
import { composeContact, handleContact, validate } from "../src/contact.js";

const ORIGIN = "https://beardworks.io";
const good = { kind: "work", name: "홍길동", email: "hong@example.com", message: "앱 개발을 맡기고 싶습니다. 일정은 두 달.", "cf-turnstile-response": "tok", lang: "ko" };

function req(fields, { origin = ORIGIN, ip = "203.0.113.7" } = {}) {
  const body = new URLSearchParams(fields);
  return new Request("https://api.beardworks.io/contact", {
    method: "POST",
    headers: { Origin: origin, "CF-Connecting-IP": ip, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

function env(over = {}) {
  const sent = [];
  return {
    sent,
    TURNSTILE_SECRET: "secret",
    CONTACT_TO: "owner@example.net",
    EMAIL: { send: async (m) => sent.push(m) },
    CONTACT_LIMIT: { limit: async () => ({ success: true }) },
    ...over,
  };
}
const turnstile = (success, hostname = "beardworks.io") => async (url, init) => {
  assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  const body = JSON.parse(init.body);
  assert.equal(body.secret, "secret");
  assert.equal(body.remoteip, "203.0.113.7");
  return new Response(JSON.stringify({ success, hostname }));
};

test("문의 한 통 = 운영자에게 메일 한 통, 답장은 보낸 사람에게", async () => {
  const e = env();
  const r = await handleContact(req(good), e, { fetchFn: turnstile(true), nowMs: Date.UTC(2026, 10, 24, 3, 0) });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.equal(e.sent.length, 1);
  const m = e.sent[0];
  assert.equal(m.to, "owner@example.net");
  assert.deepEqual(m.replyTo, { email: "hong@example.com", name: "홍길동" });
  assert.match(m.subject, /^\[beardworks 문의 · 개발 의뢰·상담\] 홍길동$/);
  assert.match(m.text, /받은 때: 2026-11-24 12:00 KST/);
  assert.match(m.text, /앱 개발을 맡기고 싶습니다/);
});

test("Turnstile을 통과하지 못하면 보내지 않는다", async () => {
  const e = env();
  const r = await handleContact(req(good), e, { fetchFn: turnstile(false) });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, "bot");
  assert.equal(e.sent.length, 0);
});

test("다른 사이트에서 얻은 Turnstile 토큰(hostname이 다름)은 막는다", async () => {
  const e = env();
  const r = await handleContact(req(good), e, { fetchFn: turnstile(true, "evil.example") });
  assert.equal(r.status, 400);
  assert.equal(e.sent.length, 0);
});

test("다른 출처·비밀 값 없음·전송 제한은 막는다", async () => {
  const e = env();
  assert.equal((await handleContact(req(good, { origin: "https://evil.example" }), e, { fetchFn: turnstile(true) })).status, 403);
  assert.equal((await handleContact(req(good), env({ TURNSTILE_SECRET: "" }), { fetchFn: turnstile(true) })).status, 503);
  assert.equal((await handleContact(req(good), env({ CONTACT_TO: "" }), { fetchFn: turnstile(true) })).status, 503);
  const limited = env({ CONTACT_LIMIT: { limit: async () => ({ success: false }) } });
  assert.equal((await handleContact(req(good), limited, { fetchFn: turnstile(true) })).status, 429);
  assert.equal(e.sent.length + limited.sent.length, 0);
});

test("숨은 미끼 칸을 채운 봇은 성공처럼 보이되 아무것도 보내지 않는다", async () => {
  const e = env();
  const r = await handleContact(req({ ...good, website: "http://spam" }), e, { fetchFn: async () => assert.fail("siteverify를 부르면 안 된다") });
  assert.equal(r.status, 200);
  assert.equal(e.sent.length, 0);
});

test("칸 검사: 종류·이름·이메일·내용 길이, 머리 칸의 줄바꿈은 지운다", () => {
  const f = (o) => validate(new URLSearchParams({ ...good, ...o }));
  assert.equal(f({ kind: "other" }).error, "kind");
  assert.equal(f({ name: "" }).error, "name");
  assert.equal(f({ name: "x".repeat(101) }).error, "name");
  assert.equal(f({ email: "not-an-email" }).error, "email");
  assert.equal(f({ message: "짧다" }).error, "message");
  assert.equal(f({ message: "x".repeat(5001) }).error, "message");
  assert.equal(f({ name: "홍\r\nBcc: x@y.z" }).name, "홍 Bcc: x@y.z");
  assert.equal(f({ lang: "en" }).lang, "en");
});

test("메일이 안 나가면 502, 보낸 사람에게 실패를 알린다", async () => {
  const e = env({ EMAIL: { send: async () => { throw Object.assign(new Error("boom"), { code: "E_X" }); } } });
  const r = await handleContact(req(good), e, { fetchFn: turnstile(true) });
  assert.equal(r.status, 502);
  assert.equal((await r.json()).error, "send");
});

test("메일 본문에 IP는 넣지 않는다", () => {
  const m = composeContact({ kind: "game", name: "a", email: "a@b.cd", message: "내용입니다 열 글자 넘게", lang: "en" }, 0);
  assert.doesNotMatch(m.text, /203\.0\.113/);
  assert.match(m.subject, /게임 문의·지원/);
  assert.match(m.text, /페이지: 영어/);
});
