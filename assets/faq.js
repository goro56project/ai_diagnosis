// ai_diagnosis/assets/faq.js
// --- Exo–AI FAQ ローダー（GAS JSON/JSONP両対応） -----------------------------

// ★あなたのGASのWebアプリURL（変更OK）
const GAS_BASE = "https://script.google.com/macros/s/AKfycbxhyZ2GMOQ9TcdhFvoScakOm9e8ZatzaItSpPt00ISD4f8y5lxdgjay7y7EMOE13MF6/exec";

const LIST_URL   = `${GAS_BASE}?api=faq&fn=list`;
const ANSWER_URL = (q) => `${GAS_BASE}?api=faq&fn=answer&q=${encodeURIComponent(q)}`;

// 表示件数（右カラムは5件）
const MAIN_MAX = 10;
const SIDE_MAX = 5;

(function () {
  const mainMount   = document.querySelector("#faq-list");
  const sideMount   = document.querySelector("#faq-list-side");
  const askMount    = document.querySelector("#faq-ask");
  const answerMount = document.querySelector("#faq-answer");

  if (mainMount) mainMount.innerHTML = '<p class="lead">読み込み中…</p>';
  if (sideMount) sideMount.innerHTML = '<p class="lead">読み込み中…</p>';

  // ▼ 質問フォーム（右カラム上部）
  if (askMount && !askMount.childElementCount) {
    askMount.innerHTML = `
      <form id="faqAskForm" class="faq-ask-form" style="display:flex;gap:8px;margin:6px 0 10px">
        <input id="faqInput" type="text" placeholder="質問を入力（例：受講期間はどのくらい？）"
               aria-label="FAQに質問" style="flex:1;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;">
        <button type="submit" class="btn" style="padding:10px 14px;border-radius:10px;">質問する</button>
      </form>
    `;
    const form = askMount.querySelector("#faqAskForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = (askMount.querySelector("#faqInput").value || "").trim();
      if (!q) return;
      if (answerMount) {
        answerMount.innerHTML =
          `<details class="faq" open>
             <summary>「${escapeHtml(q)}」の回答</summary>
             <div class="lead">検索中…</div>
           </details>`;
      }
      try {
        const data = await getJSON(ANSWER_URL(q));
        const text = extractAnswerText(data) || "該当する回答が見つかりませんでした。";
        if (answerMount) {
          answerMount.innerHTML =
            `<details class="faq" open>
               <summary>「${escapeHtml(q)}」の回答</summary>
               <div>${nl2br(escapeHtml(text))}</div>
             </details>`;
        }
      } catch (err) {
        if (answerMount) {
          answerMount.innerHTML = `<p class="lead">取得に失敗しました。時間をおいて再度お試しください。</p>`;
        }
      }
    });
  }

  // ▼ よくある質問を取得して表示
  loadList().catch(() => {});

  async function loadList() {
    const data   = await getJSON(LIST_URL);
    const items0 = (data && (data.items || data.list || [])) || [];
    const mainItems = items0.slice(0, MAIN_MAX);
    const sideItems = items0.slice(0, SIDE_MAX);

    if (mainMount) mainMount.innerHTML = renderList(mainItems);
    if (sideMount) sideMount.innerHTML = renderList(sideItems);
  }

  function renderList(items) {
    if (!items.length) return '<p class="lead">現在、表示できるFAQがありません。</p>';
    return items.map(it => {
      const q = it.q || it.question || "";
      const a = it.a || it.answer || "";
      return `<details class="faq"><summary>${escapeHtml(q)}</summary><div>${nl2br(escapeHtml(a))}</div></details>`;
    }).join("");
  }

  // --- 通信（fetch→ダメならJSONP） ------------------------------------------
  async function getJSON(url) {
    try {
      const r = await fetch(url, { mode: "cors" });
      if (r.ok) return await r.json();
      throw new Error("fetch-not-ok");
    } catch (_) {
      return await jsonp(url);
    }
  }
  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = "faq_cb_" + Math.random().toString(36).slice(2);
      const s  = document.createElement("script");
      const t  = setTimeout(() => { cleanup(); reject(new Error("jsonp-timeout")); }, 8000);
      window[cb] = (data) => { cleanup(); resolve(data); };
      s.src     = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
      s.onerror = () => { cleanup(); reject(new Error("jsonp-error")); };
      document.head.appendChild(s);
      function cleanup(){ clearTimeout(t); delete window[cb]; s.remove(); }
    });
  }

  // --- ユーティリティ ---------------------------------------------------------
  function extractAnswerText(data) {
    if (!data) return "";
    const a = data.answer || data.a || data.result || data;
    return (a && (a.text || a.answer || a.content)) || "";
  }
  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  function nl2br(s){ return String(s).replace(/\n/g, "<br>"); }
})();
