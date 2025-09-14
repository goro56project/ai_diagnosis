// ai_diagnosis/assets/faq.js  v2
// ---- Exo–AI FAQ ローダー（GAS JSON/JSONP + 出所バッジ + もっと見る + ローディング/エラー） ----
const GAS_BASE  = "https://script.google.com/macros/s/AKfycbxhyZ2GMOQ9TcdhFvoScakOm9e8ZatzaItSpPt00ISD4f8y5lxdgjay7y7EMOE13MF6/exec";
const LIST_URL  = `${GAS_BASE}?api=faq&fn=list`;
const ASK_URL   = (q) => `${GAS_BASE}?api=faq&fn=answer&q=${encodeURIComponent(q)}`;

const MAIN_MAX = 10; // 左本文（未使用でもOK）
const SIDE_MAX = 5;  // 右カラム表示件数

// 最小スタイル（ページCSSに依存しないよう動的注入）
(function injectStyle(){
  const css = `
  .faq-box{display:flex;gap:8px;margin-bottom:10px}
  .faq-box input{flex:1;border:1px solid var(--line,#e5e7eb);border-radius:10px;padding:10px}
  .faq-box button{border:1px solid var(--accent,#2563eb);background:var(--accent,#2563eb);color:#fff;border-radius:10px;padding:10px 12px;font-weight:700}
  .faq-item{border:1px solid var(--line,#e5e7eb);background:#fff;border-radius:12px;margin:8px 0}
  .faq-item summary{cursor:pointer;font-weight:700;list-style:none;padding:12px}
  .faq-item div{padding:12px 12px 14px}
  .faq-src{display:inline-block;font-size:11px;margin-left:8px;padding:2px 7px;border-radius:999px;border:1px solid var(--line,#e5e7eb)}
  .faq-src.faq{background:#ecfdf5;color:#065f46;border-color:#bbf7d0}
  .faq-src.gpt{background:#eef2ff;color:#3730a3;border-color:#c7d2fe}
  .faq-note{font-size:12px;color:#475569;margin-top:6px}
  .faq-more{display:inline-block;margin-top:8px;font-size:14px}
  .faq-empty,.faq-error,.faq-loading{font-size:14px;color:#475569;margin:6px 0}
  `;
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
})();

// JSON → 失敗時 JSONP フォールバック
async function getJSON(url){
  try{
    const r = await fetch(url, {cache:"no-store"});
    if(!r.ok) throw new Error(r.status);
    return await r.json();
  }catch(_){
    // JSONP
    return await new Promise((resolve,reject)=>{
      const cb = `cb${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const s = document.createElement('script');
      s.src = url + (url.includes('?') ? '&' : '?') + `callback=${cb}`;
      window[cb] = (data)=>{ resolve(data); cleanup(); };
      s.onerror = ()=>{ reject(new Error('jsonp failed')); cleanup(); };
      function cleanup(){ delete window[cb]; s.remove(); }
      document.body.appendChild(s);
    });
  }
}

function el(tag, attrs={}, ...children){
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==='class') e.className = v;
    else if(k==='html') e.innerHTML = v;
    else e.setAttribute(k,v);
  });
  children.forEach(c => e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return e;
}

function renderList(mount, items, limit){
  mount.innerHTML = '';
  if(!items || !items.length){
    mount.appendChild(el('div',{class:'faq-empty'},'FAQがまだありません。'));
    return;
  }
  const visible = items.slice(0, limit);
  visible.forEach(({q,a})=>{
    const d = el('details',{class:'faq-item'});
    const sum = el('summary',{}, q);
    d.appendChild(sum);
    d.appendChild(el('div',{}, a || '（回答が未設定）'));
    mount.appendChild(d);
  });
  if(items.length > limit){
    const more = el('a',{href:'#',class:'faq-more'},'もっと見る');
    more.addEventListener('click', (ev)=>{
      ev.preventDefault();
      renderList(mount, items, Math.min(items.length, limit + 5));
    });
    mount.appendChild(more);
  }
}

function renderAnswerTop(mount, q, answer, source){
  // 先頭に折りたたみを追加
  const box = el('details',{class:'faq-item', open:true});
  const sum = el('summary',{}, q);
  const badge = el('span',{class:`faq-src ${so
