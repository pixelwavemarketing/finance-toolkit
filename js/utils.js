// ---------------------------------------------
// UTILITIES
// ---------------------------------------------
export const $$ = (q, el=document) => el.querySelector(q);
export const $$$ = (q, el=document) => Array.from(el.querySelectorAll(q));

export const fmtCurrency = (n) => n.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2});
export const fmtNumber = (n, d=0) => n.toLocaleString(undefined,{maximumFractionDigits:d});
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const toNum = (v) => {
  if (typeof v === 'number') return v;
  if (v === '' || v == null) return 0;
  return Number(String(v).replace(/[^0-9.-]/g,'')) || 0;
};

export const monthAdd = (date, m) => { 
  const d = new Date(date); 
  d.setMonth(d.getMonth() + m); 
  return d; 
};

export function downloadCSV(filename, rows) {
  const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; 
  a.download = filename; 
  a.click(); 
  URL.revokeObjectURL(url);
}

export async function copy(text) { 
  try { 
    await navigator.clipboard.writeText(text);
  } catch(e) { 
    console.log('Clipboard blocked'); 
  } 
}

// ---------------------------------------------
// STATE IN URL (hash)
// ---------------------------------------------
export function getHashParams(){
  const hash = location.hash.startsWith('#')? location.hash.slice(1) : location.hash;
  const pairs = new URLSearchParams(hash);
  const calc = pairs.get('calc') || 'compound-interest';
  const stateRaw = pairs.get('state');
  let state = {};
  if (stateRaw){ 
    try{ 
      state = JSON.parse(decodeURIComponent(stateRaw)); 
    } catch(e) { 
      state = {}; 
    } 
  }
  return { calc, state };
}

export function setHashParams(calc, state){
  const pairs = new URLSearchParams();
  pairs.set('calc', calc);
  if (state && Object.keys(state).length) {
    pairs.set('state', encodeURIComponent(JSON.stringify(state)));
  }
  const newHash = '#' + pairs.toString();
  history.replaceState(null, '', newHash);
}
