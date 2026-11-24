// 문의 양식(POST /contact) — beardworks.io의 "연락" 칸에서 보낸 글을 운영자 메일함으로 전한다.
// 저장하지 않는다: 받은 글은 메일 한 통이 되고 Worker에는 남지 않는다(개인정보처리방침 4절).
// 스팸 막기: Cloudflare Turnstile 토큰을 서버에서 다시 확인(siteverify) + 숨은 미끼 칸 + 길이 제한 + 주소마다 전송 제한.
// 무료 메일 보내기는 확인된 받는 주소로만 간다 → 받는 곳은 운영자 메일함 하나(비밀 값 CONTACT_TO), 답장 주소(Reply-To)는 보낸 사람.
import { CONTACT_FROM, CONTACT_ORIGINS } from "./config.js";

const KINDS = { work: "개발 의뢰·상담", game: "게임 문의·지원" };
const LIMITS = { name: 100, email: 254, message: 5000, minMessage: 10 };
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function corsFor(request) {
  const origin = request.headers.get("Origin") || "";
  return CONTACT_ORIGINS.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : { Vary: "Origin" };
}

function reply(request, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsFor(request) },
  });
}

// 한 줄 칸에서 줄바꿈·제어 문자를 지운다(메일 머리에 들어가는 칸).
const oneLine = (s) => String(s || "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim();

// 양식 값 검사 — 문제가 있으면 오류 이름, 없으면 다듬은 값.
export function validate(form) {
  if (oneLine(form.get("website"))) return { error: "spam" }; // 숨은 미끼 칸: 사람은 비워 둔다
  const kind = oneLine(form.get("kind"));
  const name = oneLine(form.get("name"));
  const email = oneLine(form.get("email"));
  const message = String(form.get("message") || "").replace(/\r\n?/g, "\n").trim();
  if (!KINDS[kind]) return { error: "kind" };
  if (!name || name.length > LIMITS.name) return { error: "name" };
  if (email.length > LIMITS.email || !EMAIL_RE.test(email)) return { error: "email" };
  if (message.length < LIMITS.minMessage || message.length > LIMITS.message) return { error: "message" };
  return { kind, name, email, message, lang: form.get("lang") === "en" ? "en" : "ko" };
}

export function composeContact({ kind, name, email, message, lang }, nowMs) {
  const stamp = new Date(nowMs + 9 * 3600e3).toISOString().slice(0, 16).replace("T", " ");
  return {
    subject: `[beardworks 문의 · ${KINDS[kind]}] ${name}`,
    text: [
      `종류: ${KINDS[kind]}`,
      `이름: ${name}`,
      `이메일: ${email}`,
      `페이지: ${lang === "en" ? "영어" : "한국어"}`,
      `받은 때: ${stamp} KST`,
      "",
      message,
      "",
      "—",
      "beardworks.io 문의 양식에서 왔다. 이 메일에 답장하면 보낸 사람에게 간다(Reply-To).",
    ].join("\n"),
  };
}

export async function handleContact(request, env, { fetchFn = fetch, nowMs = Date.now() } = {}) {
  if (!CONTACT_ORIGINS.includes(request.headers.get("Origin") || "")) return reply(request, 403, { ok: false, error: "origin" });
  if (!env.TURNSTILE_SECRET || !env.CONTACT_TO) return reply(request, 503, { ok: false, error: "unavailable" });

  const ip = request.headers.get("CF-Connecting-IP") || "";
  if (env.CONTACT_LIMIT) {
    const { success } = await env.CONTACT_LIMIT.limit({ key: `contact:${ip}` });
    if (!success) return reply(request, 429, { ok: false, error: "rate" });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(request, 400, { ok: false, error: "form" });
  }
  const v = validate(form);
  if (v.error === "spam") return reply(request, 200, { ok: true }); // 봇에게는 성공처럼 보인다
  if (v.error) return reply(request, 400, { ok: false, error: v.error });

  const token = String(form.get("cf-turnstile-response") || "");
  const check = await fetchFn(SITEVERIFY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
  })
    .then((r) => r.json())
    .catch(() => ({ success: false }));
  if (!check.success) return reply(request, 400, { ok: false, error: "bot" });

  const mail = composeContact(v, nowMs);
  try {
    await env.EMAIL.send({
      from: CONTACT_FROM,
      to: env.CONTACT_TO,
      replyTo: { email: v.email, name: v.name },
      subject: mail.subject,
      text: mail.text,
    });
  } catch (e) {
    console.log(JSON.stringify({ contact: "send failed", error: `${e.code || ""} ${e.message || e}`.trim() }));
    return reply(request, 502, { ok: false, error: "send" });
  }
  return reply(request, 200, { ok: true });
}

export function contactPreflight(request) {
  return new Response(null, {
    status: 204,
    headers: { ...corsFor(request), "Access-Control-Allow-Methods": "POST", "Access-Control-Max-Age": "86400" },
  });
}
