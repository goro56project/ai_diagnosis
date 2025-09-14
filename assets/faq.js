// ai_diagnosis/assets/faq.js
// --- FAQ（右カラム専用 / 5件表示） ---
// あなたの GAS WebApp（list API）
const GAS_BASE = "https://script.google.com/macros/s/AKfycbxhyZ2GMOQ9TcdhFvoScakOm9e8ZatzaItSpPt00ISD4f8y5lxdgjay7y7EMOE13MF6/exec";
const LIST_URL = `${GAS_BASE}?api=faq&fn=list`;
const SIDE_MAX = 5;

(async function () {
  const sideMount = document.querySelector("#faq-list-side");
  if (!sideMount) return;              // 右カラムが無いページでは何もしない

  sideMount.innerHTML = '<p class="lead">読み込み中…</p>';

  // 1) 通常JSON → 2) JSONP フォールバック
  let rows = null;
  try {
    const res = await fetch(LIST_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rows = normalize(await res.json());
  } catch (e) {
    rows = await jsonp(LIST_URL + "&callback=");
  }

  try {
    if (!rows || !rows.length) {
      sideMount.innerHTML = '<p class="lead">FAQ はまだ登録がありません。</p>';
      return;
    }
    const side = rows.slice(0, SIDE_MAX);
    const frag = document.createDocumentFragment();
    side.forEach((r, i) => frag.append(makeItem(r.q, r.a, i === 0))); // 先頭だけ展開
    sideMount.replaceChildren(frag);
  } catch (e) {
    console.error(e);
    sideMount.innerHTML = '<p class="lead">FAQ の読み込みに失敗しました。</p>';
  }

  // ---- helpers ----
  function normalize(data) {
    const items = Array.isArray(data) ? data
                : Array.isArray(data?.items) ? data.items
                : Array.isArray(data?.data)  ? data.data
                : Array.isArray(data?.rows)  ? data.rows
                : [];
    return items.map(x => ({
      q: (x.q ?? x.question ?? x[0] ?? "").toString().trim(),
      a: (x.a ?? x.answer  ?? x[1] ?? "").toString().trim(),
    })).filter(x => x.q && x.a);
  }
  function makeItem(q, a, open=false) {
    const det = document.createElement("details");
    det.className = "faq"; if (open) det.open = true;
    const sum = document.createElement("summary"); sum.textContent = q;
    const body = document.createElement("div"); body.className = "faq-a"; body.innerHTML = a.replace(/\n/g,"<br>");
    det.append(sum, body); return det;
  }
  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = "__faq_cb_" + Math.random().toString(36).slice(2);
      const s = document.createElement("script");
      s.src = url + cb;
      window[cb] = (payload) => { try { resolve(normalize(payload)); } finally { cleanup(); } };
      s.onerror = (e) => { cleanup(); reject(e); };
      document.head.appendChild(s);
      function cleanup(){ delete window[cb]; s.remove(); }
    });
  }
})();
