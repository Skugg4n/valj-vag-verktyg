// Builds a standalone, offline-playable HTML reader for a story and triggers
// a download. Ported from the design handoff's c-projects.jsx, adapted to the
// app's ReactFlow node shape. The generated file embeds the story as JSON and
// a tiny runtime that walks [#NNN] / #NNN references as choices — no network,
// no dependencies beyond two Google fonts.

export function downloadFile(name, content, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const idOrder = id => (/^\d+$/.test(id) ? Number(id) : Number.POSITIVE_INFINITY)

// nodes: ReactFlow nodes from App.jsx. name: project title.
export function buildReaderHTML(nodes, name) {
  const scenes = (nodes || [])
    .filter(n => !n.data?.isIdea && n.type !== 'group')
    .map(n => ({
      id: n.id,
      title: n.data?.title || '',
      text: n.data?.text || '',
      color: n.data?.color || '#1f2937',
    }))
    .sort((a, b) => idOrder(a.id) - idOrder(b.id))

  const title = name || 'Berättelse'
  const data = JSON.stringify({ title, nodes: scenes })

  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title.replace(/</g, '&lt;')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f6f1e6;--ink:#1d1a16;--dim:#6a6258;--rule:#d9d0bf}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:"Source Serif Pro",Georgia,serif}
.bar{position:sticky;top:0;display:flex;gap:10px;align-items:center;padding:14px 20px;background:var(--bg);border-bottom:1px solid var(--rule);font-family:"JetBrains Mono",monospace;font-size:12px}
.bar button{font-family:inherit;font-size:12px;background:transparent;border:1px solid var(--rule);color:var(--ink);padding:6px 12px;border-radius:5px;cursor:pointer}
.bar button:hover{background:rgba(0,0,0,.04)}
.bar button:disabled{opacity:.4;cursor:default}
.bar .sp{flex:1}
.wrap{max-width:620px;margin:0 auto;padding:56px 24px 80px}
.cn{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--dim);letter-spacing:.16em;text-transform:uppercase;display:block;margin-bottom:8px}
h1{font-size:34px;font-weight:600;line-height:1.15;margin:0 0 28px;border-bottom:1px solid var(--rule);padding-bottom:18px}
p{font-size:19px;line-height:1.75;margin:0 0 1.1em;text-wrap:pretty}
p.fl::first-letter{font-size:3.4em;float:left;line-height:.85;padding:6px 8px 0 0;font-weight:600}
.choices{margin-top:44px;padding-top:24px;border-top:1px solid var(--rule)}
.lbl{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.14em;margin-bottom:14px}
.choice{display:block;width:100%;text-align:left;background:transparent;border:1px solid var(--rule);border-radius:4px;padding:14px 18px;margin-bottom:10px;font-family:inherit;font-size:17px;color:var(--ink);cursor:pointer;transition:all .18s}
.choice:hover{background:rgba(0,0,0,.04);border-color:var(--ink);transform:translateX(2px)}
.choice .n{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--dim);margin-right:12px}
.bc{display:flex;flex-wrap:wrap;gap:6px;font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--dim);max-width:620px;margin:36px auto 0;padding:14px 24px 0;border-top:1px solid var(--rule)}
.bc .c{cursor:pointer;padding:2px 5px;border-radius:3px}.bc .c:hover{background:rgba(0,0,0,.05)}.bc .cur{color:var(--ink);font-weight:600}
</style>
</head>
<body>
<div class="bar">
  <button id="back">← Tillbaka</button>
  <button id="restart">↺ Börja om</button>
  <span class="sp"></span>
  <span>Interaktiv berättelse</span>
</div>
<div class="wrap" id="wrap"></div>
<script>
const STORY=${data};
const map=new Map(STORY.nodes.map(n=>[n.id,n]));
let cur=STORY.nodes[0]?.id, hist=[];
const REF=/\\[#(\\d{3})\\]|#(\\d{3})/g;
function outs(t){const o=[];let m;REF.lastIndex=0;while(m=REF.exec(t||"")){const id=m[1]||m[2];if(!o.includes(id)&&map.has(id))o.push(id);}return o;}
function clean(t){return (t||"").replace(/\\[#\\d{3}\\]/g,"").replace(/#\\d{3}/g,"").replace(/\\s+([.,!?;:])/g,"$1").replace(/\\s{2,}/g," ").trim();}
function paras(t){const r=clean(t);if(r.includes("\\n\\n"))return r.split(/\\n{2,}/);const s=r.split(/(?<=[.!?])\\s+/);const o=[];for(let i=0;i<s.length;i+=2)o.push(s.slice(i,i+2).join(" "));return o.filter(Boolean);}
function render(){
  const n=map.get(cur);if(!n)return;
  const idx=STORY.nodes.findIndex(x=>x.id===cur);
  const ch=outs(n.text).map(id=>map.get(id)).filter(Boolean);
  let h='<span class="cn">Kapitel '+String(idx+1).padStart(2,"0")+'</span><h1>'+esc(n.title||"Namnlös")+'</h1>';
  const ps=paras(n.text);
  if(!ps.length)h+='<p><em>(tom)</em></p>';
  ps.forEach((p,i)=>h+='<p'+(i===0?' class="fl"':'')+'>'+esc(p)+'</p>');
  if(ch.length){h+='<div class="choices"><div class="lbl">Vad gör du?</div>';ch.forEach((c,i)=>h+='<button class="choice" data-go="'+c.id+'"><span class="n">'+String.fromCharCode(65+i)+'.</span>'+esc(c.title||"Namnlös")+'</button>');h+='</div>';}
  else h+='<div class="choices"><div class="lbl">Slut</div><button class="choice" data-restart><span class="n">↺</span>Börja om</button></div>';
  h+='<div class="bc">'+hist.map((id,i)=>'<span class="c" data-bc="'+i+'">'+esc(map.get(id)?.title||id)+'</span> ›').join(" ")+'<span class="c cur">'+esc(n.title||cur)+'</span></div>';
  document.getElementById("wrap").innerHTML=h;
  document.getElementById("back").disabled=hist.length===0;
  window.scrollTo(0,0);
}
function esc(s){return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-go]");if(g){hist.push(cur);cur=g.dataset.go;render();return;}
  if(e.target.closest("[data-restart]")){hist=[];cur=STORY.nodes[0].id;render();return;}
  const b=e.target.closest("[data-bc]");if(b){const i=+b.dataset.bc;cur=hist[i];hist=hist.slice(0,i);render();return;}
});
document.getElementById("back").onclick=()=>{if(hist.length){cur=hist.pop();render();}};
document.getElementById("restart").onclick=()=>{hist=[];cur=STORY.nodes[0].id;render();};
render();
</script>
</body>
</html>`
}
