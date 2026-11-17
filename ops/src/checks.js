import { DEPLOY_GRACE_MS, GAMES, PAGES } from "./config.js";
import { branches, commitDate, lastDeployRun, newestRelease } from "./github.js";

// 결과 한 줄: { ok: true } | { ok: false, pending?: true(아직 알릴 때가 아님), what, detail }.

const TIMEOUT_MS = 15000;

async function fetchT(fetchFn, url, init = {}) {
  return fetchFn(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cf: { cacheTtl: 0 } });
}

export async function checkPage(fetchFn, url) {
  const what = `페이지 ${url}`;
  try {
    const r = await fetchT(fetchFn, url);
    if (r.status !== 200) return { ok: false, what, detail: `HTTP ${r.status}` };
    const t = await r.text();
    if (!t.includes("</html>")) return { ok: false, what, detail: "HTML이 끝까지 오지 않았다" };
    return { ok: true, what };
  } catch (e) {
    return { ok: false, what, detail: `받지 못함: ${e.message || e}` };
  }
}

// build.txt = "<sha>" 또는 "<sha> <release|dev>"
export function parseBuild(text) {
  const [sha, flavor] = (text || "").trim().split(/\s+/);
  return { sha: sha || "", flavor: flavor || "" };
}

// 배포된 커밋이 갈래 머리와 같은가. 다르면 머리 커밋이 충분히 오래됐을 때만 알린다.
export async function checkDeploy({ fetchFn, get, now }, game, site, branch, headSha, wantFlavor) {
  const what = `${game.repo} ${site === game.prod ? "운영" : "개발판"}(${branch})`;
  let build;
  try {
    const r = await fetchT(fetchFn, `${site}/build.txt`);
    if (r.status !== 200) return { ok: false, what, detail: `build.txt HTTP ${r.status}` };
    build = parseBuild(await r.text());
  } catch (e) {
    return { ok: false, what, detail: `build.txt를 받지 못함: ${e.message || e}` };
  }
  if (wantFlavor && build.flavor !== wantFlavor)
    return { ok: false, what, detail: `build.txt 판이 "${build.flavor}" — "${wantFlavor}"여야 한다` };
  if (build.sha === headSha) return { ok: true, what };

  const age = now - (await commitDate(get, game.repo, headSha)).getTime();
  const run = await lastDeployRun(get, game.repo, branch).catch(() => null);
  const runText = run ? ` · 마지막 deploy-web: ${run.status}/${run.conclusion || "-"} ${run.url}` : "";
  const detail = `배포된 ${build.sha.slice(0, 7)} ≠ 갈래 머리 ${headSha.slice(0, 7)}(${Math.round(age / 60000)}분 전 커밋)${runText}`;
  return { ok: false, pending: age < DEPLOY_GRACE_MS, what, detail };
}

export async function checkVendor(fetchFn, site, paths) {
  const out = [];
  for (const p of paths) {
    const what = `에셋 ${site.replace("https://", "")}/…/${p.split("/").pop()}`;
    try {
      const r = await fetchT(fetchFn, `${site}/${p}`, { method: "HEAD" });
      const len = Number(r.headers.get("content-length") || "0");
      if (r.status !== 200) out.push({ ok: false, what, detail: `HTTP ${r.status} — 비공개 에셋 없이 빌드됐을 수 있다` });
      else if (!len) out.push({ ok: false, what, detail: "크기 0" });
      else out.push({ ok: true, what });
    } catch (e) {
      out.push({ ok: false, what, detail: `받지 못함: ${e.message || e}` });
    }
  }
  return out;
}

// 소식 캐시가 실제로 최신 릴리스를 내주는가(같은 Worker 안의 처리기를 바로 부른다).
export async function checkReleases(releasesOf, repo) {
  const what = `소식 캐시 /releases/${repo}`;
  try {
    const r = await releasesOf(repo);
    if (r.status !== 200) return { ok: false, what, detail: `HTTP ${r.status}` };
    const list = await r.json();
    const stable = list.filter((x) => !x.draft && !x.prerelease);
    if (!stable.length) return { ok: false, what, detail: "정식 릴리스가 하나도 없다" };
    const via = r.headers.get("X-Beardworks-Cache");
    if (via === "stale") return { ok: false, what, detail: `GitHub를 못 읽어 옛 값을 내주는 중(${stable[0].tag_name})` };
    return { ok: true, what };
  } catch (e) {
    return { ok: false, what, detail: String(e.message || e) };
  }
}

export async function runAll(deps) {
  const { fetchFn, get, releasesOf } = deps;
  const results = [];
  results.push(...(await Promise.all(PAGES.map((u) => checkPage(fetchFn, u)))));

  for (const game of GAMES) {
    let list;
    try {
      list = await branches(get, game.repo);
    } catch (e) {
      results.push({ ok: false, what: `${game.repo} 갈래 목록`, detail: String(e.message || e) });
      continue;
    }
    const main = list.find((b) => b.name === "main");
    const rel = newestRelease(list);
    if (main) results.push(await checkDeploy(deps, game, game.prod, "main", main.commit.sha, game.flavor ? "release" : ""));
    else results.push({ ok: false, what: `${game.repo} main`, detail: "main 갈래가 없다" });
    if (rel) results.push(await checkDeploy(deps, game, game.dev, rel.name, rel.commit.sha, game.flavor ? "dev" : ""));
    for (const site of [game.prod, game.dev]) results.push(...(await checkVendor(fetchFn, site, game.vendor)));
    results.push(await checkReleases(releasesOf, game.repo));
  }
  return results;
}
