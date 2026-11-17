import { HEARTBEAT_WEEKDAY_KST } from "./config.js";

const KST_MS = 9 * 3600 * 1000;

export function kstDay(ms) {
  return new Date(ms + KST_MS).getUTCDay();
}

export function kstStamp(ms) {
  return new Date(ms + KST_MS).toISOString().replace("T", " ").slice(0, 16) + " KST";
}

// 무엇을 보낼지. null이면 보내지 않는다.
export function compose(results, nowMs) {
  const bad = results.filter((r) => !r.ok && !r.pending);
  const pending = results.filter((r) => !r.ok && r.pending);
  const okCount = results.filter((r) => r.ok).length;
  const heartbeat = kstDay(nowMs) === HEARTBEAT_WEEKDAY_KST;
  if (!bad.length && !heartbeat) return null;

  const lines = [];
  if (bad.length) {
    lines.push(`문제 ${bad.length}건`, "");
    for (const r of bad) lines.push(`✗ ${r.what}`, `  ${r.detail}`);
    lines.push("");
  }
  if (pending.length) {
    lines.push(`지켜보는 중 ${pending.length}건(배포가 아직 도는 중일 수 있음)`, "");
    for (const r of pending) lines.push(`… ${r.what}`, `  ${r.detail}`);
    lines.push("");
  }
  lines.push(`정상 ${okCount}건 · ${kstStamp(nowMs)}`);
  lines.push("", "보낸 곳: beardworks-ops Worker(beardworks 레포 ops/). 매일 아침 한 번, 문제가 있을 때와 월요일에만 보낸다.");

  const subject = bad.length
    ? `[beardworks 점검] 문제 ${bad.length}건 — ${bad[0].what}`
    : `[beardworks 점검] 이상 없음(주간 확인)${pending.length ? ` · 지켜보는 중 ${pending.length}` : ""}`;
  return { subject, text: lines.join("\n") };
}
