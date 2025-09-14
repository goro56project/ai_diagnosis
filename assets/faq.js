// ai_diagnosis/assets/faq.js
// --- Exo-AI FAQ ローダー（GAS JSON/JSONP両対応） --------------------------
// GAS WebApp（list API）
const GAS_BASE = "https://script.google.com/macros/s/AKfycbxhyZ2GMOQ9TcdhFvoScakOm9e8ZatzaItSpPt00ISD4f8y5lxdgjay7y7EMOE13MF6/exec";
const LIST_URL = `${GAS_BASE}?api=faq&fn=list`;

// 件数設定
const MAIN_MAX = 10; // 本文セクション（#faq-list）
const SIDE_MAX = 5;  // 右カラム（#faq-list-side）

(async function () {
  const mainMount = document.querySelector("#faq-list");
  const sideMount = document.querySelector("#faq-list-side");
  if (!mainMount && !sideMount) return;

  if (mainMount) mainMount.innerHTML = '<p class="lead">読み込み中…</p>';
  if (sideMount) sideMount.innerHTML = '<p class="lead">読み込み中…</p>';

  // 1) まず通常JSONで取得、ダメなら 2) JSONP に自動フォールバック
  let rows = null;
  try {
    const res = await fetch(LIST_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    rows = normalize(data);
  } catch (e) {
    console.warn("JSON fetch failed, fallback to JSONP...", e);
    rows = await jsonp(LIST_URL + "&callback=");
  }

  try {
    if (!rows || !rows.length) {
      if (mainMount) mainMount.innerHTML = '<p class="lead">AI FAQ の登録がありません。</p>';
      if (sideMount) sideMount.innerHTML = '<p class="lead">AI FAQ の登録がありません。</p>';
      return;
    }

    // ------ 本文（最大 MAIN_MAX 件＋「さらに表示」）------
    if (mainMount) {
      const top = rows.slice(0, MAIN_MAX);
      const rest = rows.slice(MAIN_MAX);

      const frag = document.createDocumentFragment();
      top.forEach((r, i) => frag.append(makeItem(r.q, r.a, i === 0)));
      mainMount.replaceChildren(frag);

      if (rest.length) {
        const box = document.createElement("div");
        box.id = "faq-rest";
        box.style.display = "none";

        const rf = document.createDocumentFragment();
        rest.forEach(r => rf.append(makeItem(r.q, r.a)));
        box.append(rf);
        mainMount.append(box);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn secondary";
        btn.style.marginTop = "10px";
        const closed = `さらに表示（+${rest.length}）`;
        const opened = "たたむ";
        btn.textContent = closed;
        btn.setAttribute("aria-expanded", "false");
        btn.addEventListener("click", () => {
          const open = box.style.display !== "none";
          box.style.display = open ? "none" : "block";
          btn.textContent = open ? closed : opened;
          btn.setAttribute("aria-expanded", String(!open));
        });
        mainMount.append(btn);
      }
    }

    // ------ 右カラム（存在時のみ／SIDE_MAX 件）------
    if (sideMount) {
      const side = rows.slice(0, SIDE_MAX);
      const frag = document.createDocumentFragment();
      side.forEach(r => frag.append(makeItem(r.q, r.a)));
      sideMount.replaceChildren(frag);
    }
  } catch (e) {
    console.error(e);
    if (mainMount) mainMount.innerHTML = '<p class="lead">AI FAQ の読み込みに失敗しました。</p>';
    if (sideMount) sideMount.innerHTML = '<p class="lead">AI FAQ の読み込みに失敗しました。</p>';
  }

  // ---------------- helpers ----------------
  function normalize(data) {
    // 期待形：{ ok:true, items:[{q,a}] } ほか data/rows 配列にも対応
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

  function makeItem(q, a, open = false) {
    const det = document.createElement("details");
    det.className = "faq";
    if (open) det.open = true;

    const sum = document.createElement("summary");
    sum.textContent = q;

    const body = document.createElement("div");
    body.className = "faq-a";
    body.innerHTML = a.replace(/\n/g, "<br>");

    det.append(sum, body);
    return det;
  }

  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = "__faq_cb_" + Math.random().toString(36).slice(2);
      const s = document.createElement("script");
      s.src = url + cb;
      window[cb] = (payload) => {
        try {
          const rows = normalize(payload);
          cleanup(); resolve(rows);
        } catch (e) { cleanup(); reject(e); }
      };
      s.onerror = (e) => { cleanup(); reject(e); };
      document.head.appendChild(s);
      function cleanup() { delete window[cb]; s.remove(); }
    });
  }
})();
