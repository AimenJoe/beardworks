import { OWNER } from "./config.js";

// GitHub REST. 토큰(GITHUB_TOKEN, 공개 데이터 읽기만)이 없으면 익명 — IP당 시간 60회라
// Cloudflare의 공유 출구 IP에선 모자랄 수 있다.
export function gh(env, fetchFn = fetch) {
  return async (path) => {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "beardworks-ops",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
    const r = await fetchFn(`https://api.github.com${path}`, { headers });
    if (!r.ok) throw new Error(`GitHub ${path} → ${r.status}`);
    return r.json();
  };
}

// "release/v1.0" → [1, 0]. 숫자가 아니면 null.
export function releaseVersion(name) {
  const m = /^release\/v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(name);
  return m ? [Number(m[1]), Number(m[2] || 0), Number(m[3] || 0)] : null;
}

// 가장 높은 release/* 갈래 = 지금 개발판.
export function newestRelease(branches) {
  let best = null;
  for (const b of branches) {
    const v = releaseVersion(b.name);
    if (!v) continue;
    if (!best || cmp(v, best.v) > 0) best = { v, b };
  }
  return best ? best.b : null;
}

function cmp(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export async function branches(get, repo) {
  return get(`/repos/${OWNER}/${repo}/branches?per_page=100`);
}

export async function commitDate(get, repo, sha) {
  const c = await get(`/repos/${OWNER}/${repo}/commits/${sha}`);
  return new Date(c.commit.committer.date);
}

// 그 갈래의 마지막 deploy-web 실행(설명용 — 실패·승인 대기·진행 중).
export async function lastDeployRun(get, repo, branch) {
  const r = await get(
    `/repos/${OWNER}/${repo}/actions/workflows/deploy-web.yml/runs?branch=${encodeURIComponent(branch)}&per_page=1`,
  );
  const run = r.workflow_runs && r.workflow_runs[0];
  return run ? { status: run.status, conclusion: run.conclusion, sha: run.head_sha, url: run.html_url } : null;
}
