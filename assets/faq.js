/* assets/faq.js  —— 置き換え用 完全版
   仕様：
   - 右カラムにFAQ（最大件数指定）を表示：renderFaq(courseKey, targetId, limit)
   - 自由質問フォームを有効化：enableFaqAsk()
     → /exec?api=faq&fn=answer&q=... を呼び、
        シートに無い質問はGPT補完（GAS側の実装に従う）
   - CORSを避けたい場合はJSONPで呼ぶ。GAS側は &callback= に対応済み
*/

/* ====== 設定 ====== */
/* 同一ドメインでGASをプロキシしているなら '/exec' のまま。
   Apps Script の「ウェブアプリURL」を直接叩く場合は下の値をそのURLに変更。
   例: 'https://script.google.com/macros/s/AKfycby......../exec'
*/
const FAQ_API_BASE = '/exec';

/* ====== 表示用データ（各コース5件に厳選） ====== */
const FAQ_DATA = {
  entry: [
    { q: "AI初心者でも受講できますか？", a: "はい。AI未経験者やパソコンが得意でない方でも安心して受講できます。" },
    { q: "1日でどんな成果が得られますか？", a: "議事録や要約、メール文面など翌日から使える成果物を作成できます。" },
    { q: "ChatGPTの有料プランは必要ですか？", a: "不要です。主催者側で有料版を契約しているため、受講者は無料のまま利用できます。" },
    { q: "受講に必要な環境は何ですか？", a: "インターネット接続が可能なPCとブラウザだけで十分です。" },
    { q: "会社のデータを使っても大丈夫ですか？", a: "社外秘や個人情報は使用せず、練習用データを利用して安全に演習します。" }
  ],

  middle: [
    { q: "どんな業務を対象にできますか？", a: "日報、定型メール返信、集計、報告資料など繰り返し作業が多い業務が対象です。" },
    { q: "プログラミング知識は必要ですか？", a: "不要です。最小限のGASコードをコピペや設定で利用できます。" },
    { q: "2週間でどこまで進められますか？", a: "テンプレ設計から半自動化、改善ループ、KPI可視化まで体験できます。" },
    { q: "社内で共有できますか？", a: "成果物はテンプレ形式で出力されるため、他のメンバーにも展開しやすいです。" },
    { q: "ChatGPTの有料プランは必要ですか？", a: "不要です。講座環境で主催者側が有料版を提供しているため、受講者は無料で利用できます。" }
  ],

  practical: [
    { q: "実務案件に近い内容とは具体的に何ですか？", a: "要件定義から設計、実装、納品、RAG検証まで現場導入を想定した演習を行います。" },
    { q: "チームでの受講は可能ですか？", a: "はい。役割を分担して受講できる形式も想定しています。" },
    { q: "RAG検証とは何ですか？", a: "FAQの正答率や再現性を測定し、改善前後の精度差を確認する演習です。" },
    { q: "受講後に残る成果物は何ですか？", a: "要件定義書、設計書、運用マニュアル、検証レポート、スクリプト一式が残ります。" },
    { q: "ChatGPTの有料プランは必要ですか？", a: "不要です。受講者は無料アカウントのままでも主催者環境を通じて有料モデルを利用できます。" }
  ],

  common: [
    { q: "ChatGPTの有料プランは必要ですか？", a: "不要です。主催者側で有料版を契約しているため、受講者は無料のまま利用できます。" },
    { q: "受講に必要な環境は？", a: "インターネットに接続できるPCとブラウザがあれば十分です。" },
    { q: "スマートフォンだけでも受講できますか？", a: "閲覧は可能ですが、演習はPCの利用を推奨しています。" },
    { q: "法人で複数人が受講できますか？", a: "可能です。チームでの受講や社内展開も想定しています。" },
    { q: "講座はオンラインのみですか？", a: "はい、すべてオンラインで実施します。場所を問わず受講可能です。" }
  ]
};

/* ====== ユーティリティ ====== */
function htmlEscape(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ====== FAQリスト描画 ====== */
/**
 * @param {"entry"|"middle"|"practical"} courseKey
 * @param {string} targetId  例: "faq-list-side"
 * @param {number} limit     表示件数（既定:5）
 */
function renderFaq(courseKey, targetId, limit = 5) {
  const box = document.getElementById(targetId);
  if (!box) return;
  const items = (FAQ_DATA[courseKey] || []).slice(0, limit);
  box.innerHTML = items.map(it => `
    <details class="faq">
      <summary>${htmlEscape(it.q)}</summary>
      <div>${htmlEscape(it.a)}</div>
    </details>
  `).join("");
}

/* ====== 自由質問フォーム（GAS→シート→GPT補完） ====== */
function enableFaqAsk() {
  const askBox = document.getElementById("faq-ask");
  const answerBox = document.getElementById("faq-answer");
  if (!askBox || !answerBox) return;

  askBox.innerHTML = `
    <div style="margin-bottom:8px">
      <input id="faq-input" type="text" placeholder="FAQにない質問も入力できます"
             style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px" />
      <button id="faq-submit"
              style="margin-top:6px;padding:8px 12px;border:1px solid #2563eb;border-radius:10px;
                     background:#2563eb;color:#fff;font-weight:700;cursor:pointer;">
        質問する
      </button>
    </div>
  `;

  const $input = document.getElementById("faq-input");
  const $btn = document.getElementById("faq-submit");

  const ask = async () => {
    const q = ($input.value || '').trim();
    if (!q) return;
    answerBox.innerHTML = '回答を生成中…';

    try {
      const data = await faqAnswerApi(q); // {ok, answer, source}
      if (data && data.ok) {
        const src = data.source === 'faq' ? '（FAQ）' : '（GPT）';
        answerBox.innerHTML = `
          <div style="margin-top:8px;padding:10px;border:1px solid #e5e7eb;border-radius:10px;background:#fff">
            ${htmlEscape(data.answer)} <span style="color:#64748b">${src}</span>
          </div>`;
      } else {
        answerBox.innerHTML = '回答を取得できませんでした。';
      }
    } catch (e) {
      answerBox.innerHTML = 'エラーが発生しました。';
    }
  };

  $btn.addEventListener('click', ask);
  $input.addEventListener('keydown', e => { if (e.key === 'Enter') ask(); });
}

/* ====== API呼び出し（fetch → 失敗時はJSONPフォールバック） ====== */
async function faqAnswerApi(q) {
  const base = String(FAQ_API_BASE || '').replace(/\/+$/,''); // 末尾スラ削除
  const url = `${base}?api=faq&fn=answer&q=${encodeURIComponent(q)}`;

  // 1) まずは通常のfetch（同一オリジン・CORS許可前提）
  try {
    const res = await fetch(url, { method: 'GET' });
    if (res.ok) {
      const json = await res.json();
      if (json && typeof json === 'object') return json;
    }
  } catch (_) { /* fallthrough */ }

  // 2) 失敗したらJSONP
  return jsonpFetch(url);
}

/* JSONP（&callback=cbName でGASが返すJSを実行） */
function jsonpFetch(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const cb = 'faq_cb_' + Math.random().toString(36).slice(2);
    const cleanup = (scriptEl) => {
      try { delete window[cb]; } catch(_) {}
      if (scriptEl && scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
    };
    window[cb] = (data) => {
      cleanup(script);
      resolve(data);
    };
    const script = document.createElement('script');
    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${cb}`;
    script.onerror = () => { cleanup(script); reject(new Error('JSONP error')); };
    document.head.appendChild(script);
    setTimeout(() => { cleanup(script); reject(new Error('JSONP timeout')); }, timeoutMs);
  });
}

/* グローバル公開（HTMLから typeof で存在確認できるように） */
window.renderFaq = renderFaq;
window.enableFaqAsk = enableFaqAsk;
