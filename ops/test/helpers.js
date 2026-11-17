// 시험용 가짜: 캐시·fetch·GitHub.
export function fakeCache() {
  const m = new Map();
  return {
    m,
    async match(req) {
      const r = m.get(req.url);
      return r ? r.clone() : undefined;
    },
    async put(req, res) {
      m.set(req.url, res.clone());
    },
  };
}

// routes: { "url": () => Response }
export function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, method: init.method || "GET" });
    const h = routes[url];
    if (!h) return new Response("nope", { status: 404 });
    return h(init);
  };
  fn.calls = calls;
  return fn;
}

export const ok = (body, headers = {}) => () => new Response(body, { status: 200, headers });
export const jsonOk = (obj) => () => new Response(JSON.stringify(obj), { status: 200 });
