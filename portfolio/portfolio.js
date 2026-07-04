/* ╔══════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · PORTFÓLIO — CÉREBRO COMPARTILHADO (portfolio.js)      ║
   ║  As 5 páginas (index/hold/defi/trade/atlas) chamam este arquivo.  ║
   ║                                                                    ║
   ║  ┌──────────────────────────────────────────────────────────────┐ ║
   ║  │  REGRAS DOS PLANOS — edite SÓ este bloco para mudar acessos   │ ║
   ║  └──────────────────────────────────────────────────────────────┘ ║
   ╚══════════════════════════════════════════════════════════════════╝ */
window.MDF_PLANOS = {
  gratis: {
    nome:'Grátis',
    carteiras:1,          // ÚNICA trava do grátis: 1 carteira
    historico:999999,     // histórico completo (sem trava)
    graficosAvancados:true, // todos os gráficos liberados
    exportar:false,       // exportar CSV é exclusivo PRO
    atlas:false
  },
  pro: {
    nome:'PRO',           // R$ 19,90 — carro-chefe
    carteiras:9999,       // carteiras ilimitadas
    historico:999999,
    graficosAvancados:true,
    exportar:true,        // baixa os dados (CSV)
    atlas:false
  },
  premium: {
    nome:'Premium',       // R$ 49,90 — tudo liberado
    carteiras:9999,
    historico:999999,
    graficosAvancados:true,
    exportar:true,
    atlas:true            // libera o Atlas + Oráculo
  }
};
/* ─────────────────────────────────────────────────────────────────── */

/* ═══════════ MUNDODEFI — PORTFÓLIO CORE ═══════════
   Estado em localStorage (demo) · preços CoinGecko com cache · gating por plano */
(function(){
'use strict';
var P=window.P={};
var KEY='mdf.portfolio.v1';
var CG='https://api.coingecko.com/api/v3';

/* ── util ── */
P.uid=function(){return 'x'+Math.random().toString(36).slice(2,9);};
P.today=function(){return new Date().toISOString().slice(0,10);};
P.esc=function(s){return String(s==null?'':s).replace(/[<>&"']/g,function(c){return{'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c];});};
P.dBR=function(iso){if(!iso)return'—';var p=String(iso).slice(0,10).split('-');return p[2]+'/'+p[1]+'/'+p[0];};
function cget(k){try{var o=JSON.parse(localStorage.getItem(k));if(o&&(Date.now()-o.t)<o.ttl)return o.d;}catch(e){}return null;}
function cset(k,d,ttl){try{localStorage.setItem(k,JSON.stringify({t:Date.now(),ttl:ttl,d:d}));}catch(e){}}
function jfetch(url,tries){tries=tries||3;
  return new Promise(function(res,rej){(function go(i){
    fetch(url).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();}).then(res)
    .catch(function(e){if(i>=tries-1)return rej(e);setTimeout(function(){go(i+1);},1200*Math.pow(2,i));});
  })(0);});}

/* ── estado ── */
P.st=null;
P.load=function(){
  try{var s=JSON.parse(localStorage.getItem(KEY));if(s&&s.ver===1){P.st=s;return;}}catch(e){}
  P.st=P.seed();P.save();
};
P.save=function(){try{localStorage.setItem(KEY,JSON.stringify(P.st));}catch(e){}};
P.reset=function(){P.st=P.seed();P.save();location.reload();};
P.clearAll=function(){
  P.st={ver:1,cfg:{plano:P.st.cfg.plano,moeda:'usd',cart:'all'},
    carteiras:[{id:'c1',nome:'Minha Carteira'}],hold:[],
    defi:{pools:[],swaps:[],lend:[]},trade:{banca:{ini:0,atu:0},ops:[]},snaps:[]};
  P.save();location.reload();
};

/* ── dados de exemplo (demo) ── */
P.seed=function(){
  function m(n){var d=new Date();d.setMonth(d.getMonth()-n);return d.toISOString().slice(0,10);}
  return {ver:1,
  cfg:{plano:'pro',moeda:'usd',cart:'all'},
  carteiras:[{id:'c1',nome:'Phantom'},{id:'c2',nome:'MetaMask'}],
  hold:[
    {id:'h1',tk:'BTC',cg:'bitcoin',cart:'c2',last:61000,txs:[{t:'c',q:0.08,pr:44500,dt:m(9)},{t:'c',q:0.04,pr:56800,dt:m(3)}]},
    {id:'h2',tk:'ETH',cg:'ethereum',cart:'c2',last:1700,txs:[{t:'c',q:1.5,pr:2350,dt:m(8)}]},
    {id:'h3',tk:'SOL',cg:'solana',cart:'c1',last:80,txs:[{t:'c',q:60,pr:68,dt:m(10)},{t:'v',q:15,pr:112,dt:m(2)}]}
  ],
  defi:{
    pools:[
      {id:'p1',par:'SOL/USDC',proto:'Orca',chain:'Solana',cart:'c1',st:'e',ab:m(10),en:m(7),
       dep:[{dt:m(10),usd:2000,tok:'14,7 SOL + 1.000 USDC'}],ret:[{dt:m(7),usd:2245,tok:'13,9 SOL + 1.180 USDC'}],
       tax:[{dt:m(9),usd:62},{dt:m(8),usd:71}],reb:[{dt:m(9),txt:'Reposicionei o range após alta de 12% do SOL'}],
       cur:{usd:0,tok:''},di:{obj:'Renda em dólar com par líquido',mot:'Volume alto da pool e range confortável',pa:'Manter range largo e coletar taxas',pb:'Se SOL romper $120, encerrar e reabrir range acima',sai:'Queda de 25% no volume da pool',obs:'Primeira pool da estratégia'},
       notas:[{dt:m(8),txt:'Volume da pool segue saudável'}]},
      {id:'p2',par:'SOL/USDC',proto:'Orca',chain:'Solana',cart:'c1',st:'e',ab:m(7),en:m(4),
       dep:[{dt:m(7),usd:2400,tok:'15,1 SOL + 1.200 USDC'}],ret:[{dt:m(4),usd:2510,tok:'14,2 SOL + 1.350 USDC'}],
       tax:[{dt:m(6),usd:84},{dt:m(5),usd:79}],reb:[],
       cur:{usd:0,tok:''},di:{obj:'Repetir a estratégia com range mais estreito',mot:'Range estreito = mais taxas no mesmo volume',pa:'Rebalancear a cada saída do range',pb:'Voltar para range largo se rebalancear 3x na semana',sai:'IL acima de 5%',obs:''},
       notas:[]},
      {id:'p3',par:'SOL/USDC',proto:'Orca',chain:'Solana',cart:'c1',st:'a',ab:m(2),en:null,
       dep:[{dt:m(2),usd:3000,tok:'20,0 SOL + 1.400 USDC'}],ret:[],
       tax:[{dt:m(1),usd:96}],reb:[{dt:m(1),txt:'Range reposicionado após queda de 8%'}],
       cur:{usd:3120,tok:'21,4 SOL + 1.310 USDC'},di:{obj:'Pool 3 da estratégia — range médio',mot:'Melhor equilíbrio taxas x rebalanceamentos',pa:'Coletar taxas semanalmente',pb:'Encerrar se SOL perder o suporte de $70',sai:'Taxas < $15/semana por 3 semanas',obs:'Pool atual em andamento'},
       notas:[{dt:m(1),txt:'Coleta semanal funcionando bem'}]},
      {id:'p4',par:'PEPE/ETH',proto:'Uniswap',chain:'Base',cart:'c2',st:'a',ab:m(1),en:null,
       dep:[{dt:m(1),usd:800,tok:'28,5M PEPE + 0,23 ETH'}],ret:[],tax:[{dt:m(0),usd:41}],reb:[],
       cur:{usd:862,tok:'27,1M PEPE + 0,26 ETH'},di:{obj:'Aposta de risco com capital pequeno',mot:'Volume de memecoin gera muita taxa',pa:'Coletar taxas e reduzir exposição aos poucos',pb:'Encerrar tudo se cair 30%',sai:'Perda de 30% do valor da posição',obs:'Máximo 5% do patrimônio'},
       notas:[]}
    ],
    swaps:[
      {id:'s1',dt:m(3),deT:'ORCA',deQ:'320',paT:'JUP',paQ:'610',mot:'Rotação: JUP com mais catalisadores no trimestre',cart:'c1'},
      {id:'s2',dt:m(1),deT:'USDC',deQ:'500',paT:'SOL',paQ:'6,2',mot:'Aumentar exposição em SOL na queda',cart:'c1'}
    ],
    lend:[
      {id:'l1',plat:'Kamino',chain:'Solana',tipo:'s',tk:'USDC',q:'1.500',usd:1500,apy:8.4,cart:'c1',st:'a'},
      {id:'l2',plat:'Aave',chain:'Base',tipo:'b',tk:'USDC',q:'400',usd:400,apy:6.1,cart:'c2',st:'a'}
    ]
  },
  trade:{banca:{ini:1000,atu:1180},ops:[
    {id:'t1',dt:m(2),ativo:'BTC',dir:'L',alav:5,res:120,txt:'Rompimento de resistência com volume'},
    {id:'t2',dt:m(2),ativo:'SOL',dir:'S',alav:3,res:-45,txt:'Contra-tendência, stop curto'},
    {id:'t3',dt:m(1),ativo:'ETH',dir:'L',alav:5,res:105,txt:'Pullback na média de 21'}
  ]},
  snaps:(function(){var a=[],base=6800;for(var i=11;i>=1;i--){base=base*(1+(Math.sin(i*1.7)*0.04+0.028));a.push({dt:m(i),v:Math.round(base)});}return a;})()
  };
};

/* ── moedas e preços ── */
P.rate=1;
P.money=function(v,dec){
  if(v==null||isNaN(v))return'—';
  var brl=P.st.cfg.moeda==='brl';
  var x=brl?v*P.rate:v;
  if(dec==null)dec=Math.abs(x)>=1000?0:2;
  return (brl?'R$ ':'$')+x.toLocaleString(brl?'pt-BR':'en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});
};
P.pct=function(v){if(v==null||isNaN(v))return'—';return (v>=0?'+':'')+v.toFixed(2)+'%';};
P.cls=function(v){return v>=0?'up':'down';};
P.loadRate=function(){
  if(P.st.cfg.moeda!=='brl')return Promise.resolve();
  var c=cget('mdf.brl');if(c){P.rate=c;return Promise.resolve();}
  return jfetch(CG+'/simple/price?ids=tether&vs_currencies=brl',2).then(function(d){
    P.rate=(d.tether&&d.tether.brl)||5;cset('mdf.brl',P.rate,10*60*1000);
  }).catch(function(){P.rate=5;});
};
P.loadPrices=function(){
  var ids=[];P.st.hold.forEach(function(a){if(a.cg&&ids.indexOf(a.cg)<0)ids.push(a.cg);});
  if(!ids.length)return Promise.resolve();
  var k='mdf.px.'+ids.sort().join(',');
  var c=cget(k);
  var pr=c?Promise.resolve(c):jfetch(CG+'/simple/price?ids='+ids.join(',')+'&vs_currencies=usd',2)
    .then(function(d){cset(k,d,5*60*1000);return d;});
  return pr.then(function(d){
    P.st.hold.forEach(function(a){if(a.cg&&d[a.cg]&&d[a.cg].usd)a.last=d[a.cg].usd;});
    P.save();
  }).catch(function(){});
};

/* ── cálculos ── */
P.holdPos=function(a){
  var qb=0,inv=0,qv=0;
  a.txs.forEach(function(t){if(t.t==='c'){qb+=t.q;inv+=t.q*t.pr;}else qv+=t.q;});
  var qty=qb-qv,avg=qb?inv/qb:0,val=qty*(a.last||0);
  return{qty:qty,avg:avg,val:val,cost:qty*avg,lucro:val-qty*avg};
};
P.poolSum=function(p,arr){return (p[arr]||[]).reduce(function(s,x){return s+(Number(x.usd)||0);},0);};
P.poolLucro=function(p){
  var cur=p.st==='a'?(Number(p.cur.usd)||0):0;
  return cur+P.poolSum(p,'ret')+P.poolSum(p,'tax')-P.poolSum(p,'dep');
};
P.stratKey=function(p){return p.par+' · '+p.proto;};
P.strategies=function(){
  var map={};
  P.st.defi.pools.forEach(function(p){
    var k=P.stratKey(p);
    if(!map[k])map[k]={key:k,par:p.par,proto:p.proto,chain:p.chain,closed:[],open:[],res:0,tax:0};
    map[k][p.st==='e'?'closed':'open'].push(p);
    map[k].tax+=P.poolSum(p,'tax');
    if(p.st==='e')map[k].res+=P.poolLucro(p);
  });
  return Object.keys(map).map(function(k){return map[k];});
};
P.filtCart=function(x){var c=P.st.cfg.cart;return c==='all'||x.cart===c;};
P.totais=function(){
  var hold=0,holdL=0;
  P.st.hold.filter(P.filtCart).forEach(function(a){var x=P.holdPos(a);hold+=x.val;holdL+=x.lucro;});
  var defi=0,defiL=0,tax=0;
  P.st.defi.pools.filter(P.filtCart).forEach(function(p){
    if(p.st==='a')defi+=Number(p.cur.usd)||0;
    defiL+=P.poolLucro(p);tax+=P.poolSum(p,'tax');
  });
  var lend=0;
  P.st.defi.lend.filter(P.filtCart).forEach(function(l){if(l.st!=='a')return;lend+=l.tipo==='s'?(Number(l.usd)||0):-(Number(l.usd)||0);});
  var tr=P.st.trade,trL=tr.ops.reduce(function(s,o){return s+(Number(o.res)||0);},0);
  var pat=hold+defi+lend+(Number(tr.banca.atu)||0);
  var lucro=holdL+defiL+trL;
  var invest=pat-lucro;
  return{hold:hold,holdL:holdL,defi:defi,defiL:defiL,lend:lend,tax:tax,trade:Number(tr.banca.atu)||0,trL:trL,
    pat:pat,lucro:lucro,rent:invest>0?lucro/invest*100:0};
};
P.tradeStats=function(){
  var ops=P.st.trade.ops,w=0,res=0;
  ops.forEach(function(o){res+=Number(o.res)||0;if(o.res>0)w++;});
  return{n:ops.length,win:ops.length?w/ops.length*100:0,res:res};
};

/* ── gating por plano ── */
P.PLAN_LBL={gratis:'Grátis',pro:'PRO',premium:'Premium'};
P.limCart=function(){return P.st.cfg.plano==='gratis'?1:99;};
P.isFree=function(){return P.st.cfg.plano==='gratis';};
P.upsell=function(need){
  var pro=need==='pro';
  P.modal(pro?'Recurso do plano PRO':'Recurso do Atlas — Premium',
   '<div class="up-hero"><div class="big">'+(pro?'⚡':'👑')+'</div>'
   +'<h3>'+(pro?'Vire PRO e desbloqueie':'Vire Premium e ative o Atlas')+'</h3>'
   +'<p>'+(pro?'O plano PRO libera carteiras ilimitadas, histórico completo e todas as métricas do seu patrimônio.'
            :'O Atlas é a camada inteligente do MundoDeFi: Oráculo, análises, insights e o Diário Inteligente interpretando suas posições.')+'</p></div>'
   +'<div class="up-list">'
   +(pro?'<div class="up-item"><span>✓</span>Carteiras ilimitadas</div><div class="up-item"><span>✓</span>Histórico completo de tudo</div><div class="up-item"><span>✓</span>Dashboard consolidado e comparativos</div>'
        :'<div class="up-item"><span>✓</span>Oráculo: pergunte sobre o seu patrimônio</div><div class="up-item"><span>✓</span>Análises e insights das suas pools</div><div class="up-item"><span>✓</span>Diário Inteligente + Academy</div>')
   +'</div>',
   {footer:'<a href="/planos.html" class="btn '+(pro?'btn-p':'btn-g')+'" style="'+(pro?'':'border-color:rgba(245,182,20,.5);color:var(--gold,#F5B614)')+'">Ver planos</a>'});
};
P.lockBtn=function(label,need,extra){
  return '<button class="lockbtn'+(need==='pro'?' lp':'')+'" data-need="'+need+'" '+(extra||'')+'>🔒 '+label+'</button>';
};

/* ── modal ── */
P.modal=function(title,body,opts){
  opts=opts||{};
  var bg=document.getElementById('mdlBg');
  document.getElementById('mdlTitle').innerHTML=title;
  document.getElementById('mdlBody').innerHTML=body;
  document.getElementById('mdlFoot').innerHTML=(opts.footer||'')+'<button class="btn btn-g" onclick="P.closeModal()">Fechar</button>';
  document.getElementById('mdlBox').className='mdl'+(opts.wide?' wide':'');
  bg.classList.add('on');
};
P.closeModal=function(){document.getElementById('mdlBg').classList.remove('on');};
P.val=function(id){var e=document.getElementById(id);return e?e.value.trim():'';};
P.num=function(id){var v=parseFloat(String(P.val(id)).replace(',','.'));return isNaN(v)?0:v;};

/* ── REGRAS por plano (leem MDF_PLANOS) ── */
P.plan=function(){return window.MDF_PLANOS[P.st.cfg.plano]||window.MDF_PLANOS.gratis;};
P.limCart=function(){return P.plan().carteiras;};
P.histLim=function(){return P.plan().historico;};
P.canGraf=function(){return !!P.plan().graficosAvancados;};
P.canExport=function(){return !!P.plan().exportar;};
P.hasAtlas=function(){return !!P.plan().atlas;};
/* para onde mandar quando o recurso é bloqueado: PRO ou Premium */
P.upsell=function(need){
  var pro=need==='pro';
  P.modal(pro?'Recurso do plano PRO':'Recurso do Atlas — Premium',
   '<div class="up-hero"><div class="big">'+(pro?'⚡':'👑')+'</div>'
   +'<h3>'+(pro?'Vire PRO e desbloqueie':'Vire Premium e ative o Atlas')+'</h3>'
   +'<p>'+(pro?'O plano PRO libera carteiras ilimitadas, histórico completo, gráficos avançados e exportação dos seus dados.'
            :'O Atlas é a camada inteligente do MundoDeFi: Oráculo, análises e insights interpretando o seu patrimônio, suas pools e seus objetivos.')+'</p></div>'
   +'<div class="up-list">'
   +(pro?'<div class="up-item"><span>✓</span>Carteiras ilimitadas</div><div class="up-item"><span>✓</span>Gráficos avançados</div><div class="up-item"><span>✓</span>Histórico completo + exportação (CSV)</div>'
        :'<div class="up-item"><span>✓</span>Oráculo: pergunte sobre o seu patrimônio</div><div class="up-item"><span>✓</span>Análises e insights das suas posições</div><div class="up-item"><span>✓</span>Tudo do PRO incluído</div>')
   +'</div>',
   {footer:'<a href="/planos.html" class="btn '+(pro?'btn-p':'btn-g')+'"'+(pro?'':' style="border-color:rgba(245,182,20,.5);color:var(--gold,#F5B614)"')+'>Ver planos</a>'});
};
P.lockBtn=function(label,need,extra){
  return '<button class="lockbtn'+(need==='pro'?' lp':'')+'" data-need="'+need+'" '+(extra||'')+'>🔒 '+label+'</button>';
};
/* botão "Avançado" → leva ao Atlas (premium) ou faz upsell */
P.advBtn=function(){return '<a class="adv-btn" href="/portfolio/atlas.html">✦ Avançado</a>';};

/* ── EXPORTAR CSV (PRO+) ── */
P.exportCSV=function(nome,linhas){
  if(!P.canExport())return P.upsell('pro');
  var csv=linhas.map(function(r){return r.map(function(c){var s=String(c==null?'':c);return /[",;\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(';');}).join('\n');
  var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nome+'.csv';a.click();
};
P.exportBtn=function(id){
  return '<button class="btn btn-g btn-sm" data-exp="'+id+'">'+(P.canExport()?'⬇ Exportar':'🔒 Exportar')+'</button>';
};

/* ── GRÁFICOS ── */
var CHARTS={};
P._drawn={};
P.mkChart=function(id,cfg){var el=document.getElementById(id);if(!el)return;if(CHARTS[id])CHARTS[id].destroy();if(P._drawn[id]){cfg.options=cfg.options||{};cfg.options.animation=false;}CHARTS[id]=new Chart(el,cfg);P._drawn[id]=true;};
P.gTicks=function(){return{color:'#5C6478',font:{family:'Space Mono',size:10}};};
P.gGrid=function(){return{color:'rgba(255,255,255,.05)'};};
P.rt=function(){return P.st.cfg.moeda==='brl'?P.rate:1;};
P.moneyCb=function(){var brl=P.st.cfg.moeda==='brl',pre=brl?'R$ ':'$';return function(c){return ' '+pre+Math.round(c.raw).toLocaleString(brl?'pt-BR':'en-US');};};
/* card de gráfico com cadeado se for avançado e o plano não tiver */
P.grafCard=function(avancado,id,title,sm){
  /* todos os gráficos são liberados para todos os planos */
  return '<div class="card"><div class="card-hd"><div class="card-title">'+title+'</div></div>'
   +'<div class="card-bd"><div class="chart-box'+(sm?' sm':'')+'"><canvas id="'+id+'"></canvas></div></div></div>';
};
/* contagem animada */
P.countUps=function(){
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  document.querySelectorAll('[data-cv]').forEach(function(el){
    var v=parseFloat(el.dataset.cv);if(isNaN(v))return;
    var t=el.dataset.t||'m',fin=el.innerHTML,s=null,D=600;
    function fmt(n){return t==='m'?P.money(n):t==='p'?P.pct(n):Math.round(n).toString();}
    function step(now){if(!s)s=now;var k=Math.min(1,(now-s)/D);k=1-Math.pow(1-k,3);if(k<1){el.textContent=fmt(v*k);requestAnimationFrame(step);}else el.innerHTML=fin;}
    requestAnimationFrame(step);
  });
};
P.cartVal=function(cid){
  var v=0;
  P.st.hold.forEach(function(a){if(a.cart===cid)v+=P.holdPos(a).val;});
  P.st.defi.pools.forEach(function(p){if(p.cart===cid&&p.st==='a')v+=Number(p.cur.usd)||0;});
  P.st.defi.lend.forEach(function(l){if(l.cart===cid&&l.st==='a')v+=l.tipo==='s'?Number(l.usd):-Number(l.usd);});
  return v;
};

/* ── SHELL compartilhado (sidebar + topo + modal) ── */
P.shell=function(active){
  var e=P.esc,atlas=active==='atlas';
  var items=[['dash','📊','Dashboard','/portfolio/index.html'],['hold','💎','HOLD','/portfolio/hold.html'],
             ['defi','🌊','DeFi','/portfolio/defi.html'],['trade','⚡','Trade','/portfolio/trade.html']];
  var side='<aside class="sb"><a href="/" class="sb-logo"><div class="sb-logo-mark"><span>₿</span></div><div class="sb-logo-text">Mundo<em>DeFi</em></div></a>'
   +'<div class="sb-sec">Portfólio</div>'
   +items.map(function(it){return '<a class="sb-item'+(active===it[0]?' active':'')+'" href="'+it[3]+'"><span class="ico">'+it[1]+'</span>'+it[2]+'</a>';}).join('')
   +'<div class="sb-sec">Inteligência</div>'
   +'<a class="sb-item'+(atlas?' active':'')+'" href="/portfolio/atlas.html"><span class="ico">🔮</span>Atlas <span class="badge" style="background:var(--gold-soft);color:var(--gold,#F5B614);margin-left:auto">'+(P.hasAtlas()?'👑':'🔒')+'</span></a>'
   +'<div class="sb-foot">'
   +'<div class="sb-plan"><div class="sb-plan-lbl">Seu plano</div><select id="planSel">'
   +Object.keys(window.MDF_PLANOS).map(function(p){return '<option value="'+p+'"'+(P.st.cfg.plano===p?' selected':'')+'>'+window.MDF_PLANOS[p].nome+'</option>';}).join('')
   +'</select></div>'
   +'<a class="sb-link" href="#" id="sbSeed">↻ Recarregar dados demo</a>'
   +'<a class="sb-link" href="#" id="sbClear">🗑 Limpar e começar do zero</a>'
   +'<a class="sb-link" href="/">← Voltar ao site</a>'
   +'</div></aside>';
  var carts='<select class="fsel" id="cartSel"><option value="all">Todas as carteiras</option>'
   +P.st.carteiras.map(function(c){return '<option value="'+c.id+'"'+(P.st.cfg.cart===c.id?' selected':'')+'>'+e(c.nome)+'</option>';}).join('')+'</select>';
  var top='<div class="mob-top"><button class="mob-burger" onclick="document.body.classList.toggle(\'snav\')">☰</button><div class="sb-logo-text" style="font-size:16px">Mundo<em>DeFi</em></div></div>'
   +'<main class="main"><div class="top"><h1 id="pgTitle"></h1><div class="top-right">'
   +(atlas?'':carts)
   +'<div class="seg"><button id="mUsd" class="'+(P.st.cfg.moeda==='usd'?'on':'')+'">US$</button><button id="mBrl" class="'+(P.st.cfg.moeda==='brl'?'on':'')+'">R$</button></div>'
   +(atlas?'':'<button class="btn btn-p" id="btnAdd">+ Adicionar</button>')
   +'</div><div class="top-sub" id="pgSub"></div></div><div id="pg"></div></main>'
   +'<div class="mdl-bg" id="mdlBg"><div class="mdl" id="mdlBox"><div class="mdl-hd"><div class="mdl-title" id="mdlTitle"></div><button class="mdl-x" onclick="P.closeModal()">×</button></div><div class="mdl-bd" id="mdlBody"></div><div class="mdl-ft" id="mdlFoot"></div></div></div>';
  document.getElementById('app').innerHTML=side+'<div style="flex:1;min-width:0">'+top+'</div>';
  document.body.dataset.view=active;
  document.body.classList.toggle('atlas',atlas);

  document.getElementById('planSel').addEventListener('change',function(){P.st.cfg.plano=this.value;P.save();location.reload();});
  var cs=document.getElementById('cartSel');if(cs)cs.addEventListener('change',function(){P.st.cfg.cart=this.value;P.save();if(P.render)P.render();});
  document.getElementById('mUsd').addEventListener('click',function(){P.st.cfg.moeda='usd';P.save();P.loadRate().then(function(){location.reload();});});
  document.getElementById('mBrl').addEventListener('click',function(){P.st.cfg.moeda='brl';P.save();P.loadRate().then(function(){location.reload();});});
  document.getElementById('sbSeed').addEventListener('click',function(ev){ev.preventDefault();if(confirm('Substituir os dados atuais pelos dados de exemplo?'))P.reset();});
  document.getElementById('sbClear').addEventListener('click',function(ev){ev.preventDefault();if(confirm('Apagar TUDO e começar do zero?'))P.clearAll();});
  document.getElementById('mdlBg').addEventListener('click',function(ev){if(ev.target===this)P.closeModal();});
  document.addEventListener('click',function(ev){
    var b=ev.target.closest('.lockbtn');if(b){P.upsell(b.dataset.need||'premium');return;}
    var lr=ev.target.closest('.lockrow');if(lr){P.upsell('pro');return;}
    var ex=ev.target.closest('[data-exp]');if(ex&&P.exporters&&P.exporters[ex.dataset.exp])P.exporters[ex.dataset.exp]();
  });
};

/* ── BOOT padrão de cada página ── */
P.boot=function(active,renderFn){
  P.load();
  P.render=renderFn;
  P.shell(active);
  P.loadRate().then(function(){
    renderFn();
    if(active!=='atlas')P.loadPrices().then(renderFn);
  });
};

/* ══════════════════ VIEWS (renderizadores por página) ══════════════════ */

/* bloco PRO/PREMIUM (antes do rodapé de cada página) → planos.html */
P.planosCTA=function(){
  if(P.st.cfg.plano==='premium')return '';
  return '<div class="plans-cta">'
   +'<div class="pc-card pc-pro"><div class="pc-tag">⚡ PRO</div><div class="pc-price">R$ 19,90 <small>/mês</small></div>'
   +'<p>Carteiras ilimitadas e exportação dos seus dados para o IR.</p>'
   +'<a href="/planos.html" class="btn btn-p" style="width:100%">Assinar PRO</a></div>'
   +'<div class="pc-card pc-prem"><div class="pc-pill">👑 Atlas incluso</div><div class="pc-tag" style="color:var(--gold,#F5B614)">PREMIUM</div><div class="pc-price">R$ 49,90 <small>/mês</small></div>'
   +'<p>Tudo do PRO + Atlas: Oráculo, análises e Diário Inteligente.</p>'
   +'<a href="/planos.html" class="btn btn-gold" style="width:100%">Ativar Atlas</a></div>'
   +'</div>';
};

/* banner do Atlas (chamativo, com Oráculo em destaque) */
P.atlasBanner=function(ico,titulo,texto){
  return '<div class="atlas-card"><div class="ico">'+ico+'</div>'
   +'<div><b>'+titulo+' <span class="crown">Premium</span></b><p>'+texto+'</p></div>'
   +'<div class="right"><span class="orac-tag">🔮 Oráculo</span>'+P.advBtn()+'</div></div>';
};

/* ---------- DASHBOARD ---------- */
P.vDash=function(){
  var e=P.esc,T=P.totais();
  document.getElementById('pgTitle').textContent='Dashboard';
  document.getElementById('pgSub').textContent='Visão consolidada de todo o seu patrimônio cripto';
  document.getElementById('btnAdd').onclick=function(){
    P.modal('Adicionar','<div class="up-list" style="margin-top:0">'
     +'<a class="up-item" href="/portfolio/hold.html"><span>💎</span>Transação de HOLD (compra/venda)</a>'
     +'<a class="up-item" href="/portfolio/defi.html"><span>🌊</span>Pool, swap ou lending</a>'
     +'<a class="up-item" href="/portfolio/trade.html"><span>⚡</span>Operação de trade</a></div>');
  };
  var html=P.atlasBanner('🔮','Pergunte ao Oráculo sobre o seu patrimônio','O Atlas interpreta suas posições, lucro e evolução e responde em linguagem natural — a camada inteligente do MundoDeFi.');
  html+='<div class="mgrid">'
   +'<div class="mc"><div class="mc-accent" style="background:var(--purple,#9945FF)"></div><div class="mc-lbl">Patrimônio total</div><div class="mc-val" data-cv="'+T.pat+'">'+P.money(T.pat)+'</div><div class="mc-sub">HOLD + DeFi + Trade</div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--green,#14F195)"></div><div class="mc-lbl">Lucro total</div><div class="mc-val '+P.cls(T.lucro)+'" data-cv="'+T.lucro+'">'+P.money(T.lucro)+'</div><div class="mc-sub '+P.cls(T.rent)+'">'+P.pct(T.rent)+' de rentabilidade</div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--cyan,#00E5FF)"></div><div class="mc-lbl">Taxas DeFi coletadas</div><div class="mc-val" style="color:var(--cyan,#00E5FF)" data-cv="'+T.tax+'">'+P.money(T.tax)+'</div><div class="mc-sub">renda das suas pools</div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--gold,#F5B614)"></div><div class="mc-lbl">Resultado em trade</div><div class="mc-val '+P.cls(T.trL)+'" data-cv="'+T.trL+'">'+P.money(T.trL)+'</div><div class="mc-sub">banca: '+P.money(T.trade)+'</div></div>'
   +'</div>';
  html+='<div class="grid2">'
   +P.grafCard(true,'chEvo','Evolução do Patrimônio (12 meses)',false)
   +P.grafCard(false,'chPz','Distribuição por área',true)
   +'</div>';
  var carts=P.st.carteiras.map(function(c){return '<div class="rank-row" style="padding:.7rem 1.1rem"><span style="font-size:15px">👛</span><span class="rank-name">'+e(c.nome)+'</span><span class="rank-val">'+P.money(P.cartVal(c.id))+'</span></div>';}).join('');
  var ev=P.dashEventos(),lim=Math.min(P.histLim(),10);
  var evH=ev.slice(0,lim).map(function(x){return '<div class="tl-item"><span class="tl-date">'+P.dBR(x.dt)+'</span><span class="tl-txt">'+x.txt+'</span></div>';}).join('');
  if(ev.length>lim)evH+='<div class="tl-item" style="cursor:pointer" onclick="P.upsell(\'pro\')"><span class="tl-date">🔒</span><span class="tl-txt" style="color:var(--gold,#F5B614);font-weight:700">Ver histórico completo — PRO</span></div>';
  html+='<div class="grid2b">'
   +'<div class="card"><div class="card-hd"><div class="card-title">Carteiras</div><div class="right"><button class="btn btn-g btn-sm" id="btnCart">+ Nova carteira</button></div></div>'+(carts||'<div class="empty">Nenhuma carteira</div>')+'</div>'
   +'<div class="card"><div class="card-hd"><div class="card-title">Últimas operações</div></div><div class="card-bd" style="padding:.6rem 1.15rem"><div class="tl">'+(evH||'<div class="empty">Sem operações ainda</div>')+'</div></div></div>'
   +'</div>';
  var rows=P.st.hold.filter(P.filtCart).map(function(a){
    var x=P.holdPos(a);if(x.qty<=0)return'';
    var pc=x.cost>0?x.lucro/x.cost*100:0,cn=(P.st.carteiras.filter(function(c){return c.id===a.cart;})[0]||{}).nome||'—';
    return '<tr><td><div class="tk"><div class="tk-ic">'+e(a.tk)+'</div><div><b>'+e(a.tk)+'</b><small>'+e(cn)+'</small></div></div></td>'
     +'<td class="num mono">'+x.qty.toLocaleString('pt-BR',{maximumFractionDigits:6})+'</td><td class="num mono">'+P.money(x.avg,2)+'</td><td class="num mono">'+P.money(a.last||0,2)+'</td>'
     +'<td class="num mono">'+P.money(x.val)+'</td><td class="num mono '+P.cls(x.lucro)+'">'+P.money(x.lucro)+' <small style="color:var(--mut2)">('+P.pct(pc)+')</small></td></tr>';
  }).join('');
  html+='<div class="card"><div class="card-hd"><div class="card-title">Ativos em HOLD</div><div class="right"><a class="btn btn-g btn-sm" href="/portfolio/hold.html">Gerenciar →</a></div></div><div class="tblw"><table style="min-width:640px"><thead><tr><th>Ativo</th><th class="num">Qtd</th><th class="num">Preço médio</th><th class="num">Preço atual</th><th class="num">Valor</th><th class="num">Lucro</th></tr></thead><tbody>'+(rows||'<tr><td colspan="6"><div class="empty">Nenhum ativo — adicione na página HOLD</div></td></tr>')+'</tbody></table></div></div>';
  html+=P.planosCTA();document.getElementById('pg').innerHTML=html;
  document.getElementById('btnCart').onclick=function(){
    if(P.st.carteiras.length>=P.limCart())return P.upsell('pro');
    P.modal('Nova carteira','<div class="fg"><label>Nome da carteira</label><input id="fNome" placeholder="Ex: Phantom, Rabby, Ledger…"></div>',{footer:'<button class="btn btn-p" id="okCart">Salvar</button>'});
    document.getElementById('okCart').onclick=function(){var n=P.val('fNome');if(!n)return;P.st.carteiras.push({id:P.uid(),nome:n});P.save();P.render();};
  };
  var r=P.rt(),brl=P.st.cfg.moeda==='brl',pre=brl?'R$ ':'$';
  {
    var snaps=P.st.snaps.slice();snaps.push({dt:P.today(),v:T.pat});
    P.mkChart('chEvo',{type:'bar',data:{labels:snaps.map(function(s){var p=s.dt.split('-');return p[1]+'/'+p[0].slice(2);}),datasets:[{data:snaps.map(function(s){return Math.round(s.v*r);}),backgroundColor:'rgba(153,69,255,.55)',borderColor:'#9945FF',borderWidth:1.5,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:P.moneyCb()}}},scales:{x:{grid:{display:false},ticks:P.gTicks()},y:{grid:P.gGrid(),ticks:Object.assign(P.gTicks(),{callback:function(v){return pre+(v>=1000?(v/1000)+'k':v);}})}}}});
  }
  P.mkChart('chPz',{type:'doughnut',data:{labels:['HOLD','DeFi','Trade'],datasets:[{data:[T.hold*r,(T.defi+T.lend)*r,T.trade*r],backgroundColor:['#F5B614','#14F195','#00E5FF'],borderColor:'#0C101C',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,cutout:'64%',plugins:{legend:{position:'right',labels:{color:'#8B93A7',font:{family:'Space Grotesk',size:12},boxWidth:12,boxHeight:12}},tooltip:{callbacks:{label:function(c){return ' '+c.label+': '+pre+Math.round(c.raw).toLocaleString(brl?'pt-BR':'en-US');}}}}}});
  P.countUps();
};
P.dashEventos=function(){
  var e=P.esc,ev=[];
  P.st.hold.forEach(function(a){a.txs.forEach(function(t){ev.push({dt:t.dt,txt:(t.t==='c'?'Compra':'Venda')+' de <b>'+t.q+' '+e(a.tk)+'</b> a '+P.money(t.pr)});});});
  P.st.defi.pools.forEach(function(p){
    p.tax.forEach(function(t){ev.push({dt:t.dt,txt:'Taxas na pool <b>'+e(p.par)+'</b>: '+P.money(t.usd)});});
    p.dep.forEach(function(d){ev.push({dt:d.dt,txt:'Depósito na pool <b>'+e(p.par)+'</b>: '+P.money(d.usd)});});
    p.ret.forEach(function(r){ev.push({dt:r.dt,txt:'Retirada da pool <b>'+e(p.par)+'</b>: '+P.money(r.usd)});});
  });
  P.st.defi.swaps.forEach(function(s){ev.push({dt:s.dt,txt:'Swap <b>'+e(s.deQ)+' '+e(s.deT)+'</b> → <b>'+e(s.paQ)+' '+e(s.paT)+'</b>'});});
  P.st.trade.ops.forEach(function(o){ev.push({dt:o.dt,txt:'Trade '+(o.dir==='L'?'Long':'Short')+' <b>'+e(o.ativo)+'</b>: <span class="'+P.cls(o.res)+'">'+P.money(o.res)+'</span>'});});
  ev.sort(function(a,b){return String(b.dt||'').localeCompare(String(a.dt||''));});
  return ev;
};

/* ---------- HOLD ---------- */
P.hFormTx=function(pre){
  var e=P.esc;pre=pre||{};
  var ops=P.st.hold.map(function(a){return '<option value="'+a.id+'"'+(pre.aid===a.id?' selected':'')+'>'+e(a.tk)+'</option>';}).join('');
  var carts=P.st.carteiras.map(function(c){return '<option value="'+c.id+'">'+e(c.nome)+'</option>';}).join('');
  P.modal('Nova transação de HOLD',
   '<div class="fg"><label>Ativo</label><select id="fAid"><option value="__novo">＋ Novo ativo…</option>'+ops+'</select></div>'
   +'<div id="novoWrap"><div class="frow"><div class="fg"><label>Ticker</label><input id="fTk" placeholder="Ex: BTC" style="text-transform:uppercase"></div>'
   +'<div class="fg"><label>ID CoinGecko (preço automático)</label><input id="fCg" placeholder="ex: bitcoin (opcional)"></div></div>'
   +'<div class="fg"><label>Carteira</label><select id="fCart">'+carts+'</select></div></div>'
   +'<div class="frow3"><div class="fg"><label>Tipo</label><select id="fT"><option value="c">Compra</option><option value="v">Venda</option></select></div>'
   +'<div class="fg"><label>Quantidade</label><input id="fQ" type="number" step="any"></div>'
   +'<div class="fg"><label>Preço unit. (US$)</label><input id="fPr" type="number" step="any"></div></div>'
   +'<div class="fg"><label>Data</label><input id="fDt" type="date" value="'+P.today()+'"></div>',
   {footer:'<button class="btn btn-p" id="okTx">Salvar</button>'});
  var sel=document.getElementById('fAid');if(pre.aid)sel.value=pre.aid;
  function tog(){document.getElementById('novoWrap').style.display=sel.value==='__novo'?'block':'none';}
  sel.onchange=tog;tog();
  document.getElementById('okTx').onclick=function(){
    var aid=sel.value,q=P.num('fQ'),pr=P.num('fPr'),dt=P.val('fDt')||P.today(),t=P.val('fT')||'c';if(!q)return;
    var a;
    if(aid==='__novo'){var tk=P.val('fTk').toUpperCase();if(!tk)return;a={id:P.uid(),tk:tk,cg:P.val('fCg').toLowerCase(),cart:P.val('fCart')||P.st.carteiras[0].id,last:pr,txs:[]};P.st.hold.push(a);}
    else{a=P.st.hold.filter(function(x){return x.id===aid;})[0];if(!a)return;}
    a.txs.push({t:t,q:q,pr:pr,dt:dt});P.save();P.closeModal();P.render();P.loadPrices().then(P.render);
  };
};
P.vHold=function(){
  var e=P.esc;
  document.getElementById('pgTitle').textContent='HOLD';
  document.getElementById('pgSub').textContent='Seu patrimônio de longo prazo — quantidade de tokens, preço médio e lucro';
  document.getElementById('btnAdd').onclick=function(){P.hFormTx();};
  var val=0,cost=0,aL=[],aD=[],lL=[],lD=[];
  var rows=P.st.hold.filter(P.filtCart).map(function(a){
    var x=P.holdPos(a);if(x.qty<=0)return'';
    val+=x.val;cost+=x.cost;aL.push(a.tk);aD.push(x.val);lL.push(a.tk);lD.push(x.lucro);
    var pc=x.cost>0?x.lucro/x.cost*100:0,cn=(P.st.carteiras.filter(function(c){return c.id===a.cart;})[0]||{}).nome||'—';
    return '<tr><td><div class="tk"><div class="tk-ic">'+e(a.tk)+'</div><div><b>'+e(a.tk)+'</b><small>'+e(cn)+'</small></div></div></td>'
     +'<td class="num mono">'+x.qty.toLocaleString('pt-BR',{maximumFractionDigits:6})+'</td><td class="num mono">'+P.money(x.avg,2)+'</td><td class="num mono">'+P.money(a.last||0,2)+'</td>'
     +'<td class="num mono">'+P.money(x.val)+'</td><td class="num mono '+P.cls(x.lucro)+'">'+P.money(x.lucro)+' <small style="color:var(--mut2)">('+P.pct(pc)+')</small></td>'
     +'<td class="num"><button class="btn btn-g btn-sm" data-tx="'+a.id+'">+ Transação</button></td></tr>';
  }).join('');
  var lucro=val-cost,rent=cost>0?lucro/cost*100:0;
  var html='<div class="mgrid">'
   +'<div class="mc"><div class="mc-accent" style="background:var(--gold,#F5B614)"></div><div class="mc-lbl">Valor em HOLD</div><div class="mc-val" data-cv="'+val+'">'+P.money(val)+'</div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--purple,#9945FF)"></div><div class="mc-lbl">Investido</div><div class="mc-val" data-cv="'+cost+'">'+P.money(cost)+'</div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--green,#14F195)"></div><div class="mc-lbl">Lucro</div><div class="mc-val '+P.cls(lucro)+'" data-cv="'+lucro+'">'+P.money(lucro)+'</div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--cyan,#00E5FF)"></div><div class="mc-lbl">Rentabilidade</div><div class="mc-val '+P.cls(rent)+'" data-cv="'+rent+'" data-t="p">'+P.pct(rent)+'</div></div>'
   +'</div>';
  html+='<div class="grid2b">'+P.grafCard(false,'chHA','Alocação por ativo',true)+P.grafCard(true,'chHL','Lucro por ativo',true)+'</div>';
  html+='<div class="card"><div class="card-hd"><div class="card-title">Ativos</div><div class="right">'+P.exportBtn('hold')+'</div></div><div class="tblw"><table style="min-width:760px"><thead><tr><th>Ativo</th><th class="num">Qtd</th><th class="num">Preço médio</th><th class="num">Preço atual</th><th class="num">Valor</th><th class="num">Lucro</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="7"><div class="empty">Nenhum ativo ainda — clique em <b>+ Adicionar</b>.</div></td></tr>')+'</tbody></table></div></div>';
  var txs=[];P.st.hold.filter(P.filtCart).forEach(function(a){a.txs.forEach(function(t){txs.push({a:a,t:t});});});
  txs.sort(function(x,y){return String(y.t.dt||'').localeCompare(String(x.t.dt||''));});
  var lim=P.histLim();
  var hrows=txs.slice(0,lim).map(function(x){return '<tr><td class="mono" style="color:var(--mut)">'+P.dBR(x.t.dt)+'</td><td><b>'+e(x.a.tk)+'</b></td><td><span class="badge '+(x.t.t==='c'?'b-open':'b-closed')+'">'+(x.t.t==='c'?'Compra':'Venda')+'</span></td><td class="num mono">'+x.t.q+'</td><td class="num mono">'+P.money(x.t.pr,2)+'</td><td class="num mono">'+P.money(x.t.q*x.t.pr)+'</td></tr>';}).join('');
  if(txs.length>lim)hrows+='<tr class="lockrow"><td colspan="6">🔒 Ver histórico completo — PRO</td></tr>';
  html+='<div class="card"><div class="card-hd"><div class="card-title">Histórico de transações</div></div><div class="tblw"><table style="min-width:620px"><thead><tr><th>Data</th><th>Ativo</th><th>Tipo</th><th class="num">Qtd</th><th class="num">Preço</th><th class="num">Total</th></tr></thead><tbody>'+(hrows||'<tr><td colspan="6"><div class="empty">Sem transações</div></td></tr>')+'</tbody></table></div></div>';
  html+=P.planosCTA();document.getElementById('pg').innerHTML=html;
  document.querySelectorAll('[data-tx]').forEach(function(b){b.onclick=function(){P.hFormTx({aid:b.dataset.tx});};});
  P.exporters={hold:function(){
    var L=[['Ativo','Carteira','Quantidade','Preço médio USD','Preço atual USD','Valor USD','Lucro USD']];
    P.st.hold.filter(P.filtCart).forEach(function(a){var x=P.holdPos(a);if(x.qty<=0)return;var cn=(P.st.carteiras.filter(function(c){return c.id===a.cart;})[0]||{}).nome||'';L.push([a.tk,cn,x.qty,x.avg.toFixed(2),(a.last||0).toFixed(2),x.val.toFixed(2),x.lucro.toFixed(2)]);});
    P.exportCSV('mundodefi-hold',L);
  }};
  var r=P.rt();
  P.mkChart('chHA',{type:'doughnut',data:{labels:aL,datasets:[{data:aD.map(function(v){return v*r;}),backgroundColor:['#F5B614','#9945FF','#00E5FF','#14F195','#FF4D6A','#9fd8ff'],borderColor:'#0C101C',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{color:'#8B93A7',font:{family:'Space Mono',size:11},boxWidth:11,boxHeight:11}},tooltip:{callbacks:{label:P.moneyCb()}}}}});
  P.mkChart('chHL',{type:'bar',data:{labels:lL,datasets:[{data:lD.map(function(v){return Math.round(v*r);}),backgroundColor:lD.map(function(v){return v>=0?'rgba(20,241,149,.65)':'rgba(255,77,106,.65)';}),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:P.moneyCb()}}},scales:{x:{grid:{display:false},ticks:P.gTicks()},y:{grid:P.gGrid(),ticks:P.gTicks()}}}});
  P.countUps();
};

/* ---------- TRADE ---------- */
P.tFormOp=function(){
  P.modal('Nova operação',
   '<div class="frow3"><div class="fg"><label>Ativo</label><input id="fAt" style="text-transform:uppercase"></div>'
   +'<div class="fg"><label>Direção</label><select id="fDir"><option value="L">Long</option><option value="S">Short</option></select></div>'
   +'<div class="fg"><label>Alavancagem</label><input id="fAl" type="number" step="1" value="1"></div></div>'
   +'<div class="frow"><div class="fg"><label>Resultado (US$, − p/ perda)</label><input id="fRes" type="number" step="any"></div>'
   +'<div class="fg"><label>Data</label><input id="fDt" type="date" value="'+P.today()+'"></div></div>'
   +'<div class="fg"><label>Anotação</label><textarea id="fTxt"></textarea></div>',
   {footer:'<button class="btn btn-p" id="okOp">Salvar</button>'});
  document.getElementById('okOp').onclick=function(){
    var at=P.val('fAt').toUpperCase();if(!at)return;var res=P.num('fRes');
    P.st.trade.ops.push({id:P.uid(),dt:P.val('fDt')||P.today(),ativo:at,dir:P.val('fDir')||'L',alav:P.num('fAl')||1,res:res,txt:P.val('fTxt')});
    P.st.trade.banca.atu=(Number(P.st.trade.banca.atu)||0)+res;P.save();P.closeModal();P.render();
  };
};
P.tFormBanca=function(){
  var b=P.st.trade.banca;
  P.modal('Configurar banca','<div class="frow"><div class="fg"><label>Banca inicial (US$)</label><input id="fIni" type="number" step="any" value="'+(b.ini||0)+'"></div><div class="fg"><label>Banca atual (US$)</label><input id="fAtu" type="number" step="any" value="'+(b.atu||0)+'"></div></div><div class="fhint">A banca atual também é ajustada a cada operação.</div>',{footer:'<button class="btn btn-p" id="okB">Salvar</button>'});
  document.getElementById('okB').onclick=function(){b.ini=P.num('fIni');b.atu=P.num('fAtu');P.save();P.closeModal();P.render();};
};
P.vTrade=function(){
  var e=P.esc,b=P.st.trade.banca,s=P.tradeStats(),ev=b.ini>0?(b.atu-b.ini)/b.ini*100:0;
  document.getElementById('pgTitle').textContent='Trade';
  document.getElementById('pgSub').textContent='Suas operações, gestão de banca e métricas de desempenho';
  document.getElementById('btnAdd').onclick=P.tFormOp;
  var html=P.atlasBanner('📓','Oráculo + Diário Inteligente','O Atlas lê suas operações e anotações e revela padrões, erros recorrentes e acertos — pergunte e entenda seu trade.');
  html+='<div class="mgrid">'
   +'<div class="mc"><div class="mc-accent" style="background:var(--purple,#9945FF)"></div><div class="mc-lbl">Banca atual</div><div class="mc-val" data-cv="'+b.atu+'">'+P.money(b.atu)+'</div><div class="mc-sub">inicial: '+P.money(b.ini)+' <span class="'+P.cls(ev)+'">('+P.pct(ev)+')</span></div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--green,#14F195)"></div><div class="mc-lbl">Resultado total</div><div class="mc-val '+P.cls(s.res)+'" data-cv="'+s.res+'">'+P.money(s.res)+'</div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--cyan,#00E5FF)"></div><div class="mc-lbl">Win rate</div><div class="mc-val" data-cv="'+s.win+'" data-t="n">'+s.win.toFixed(0)+'%</div><div class="mc-sub">'+s.n+' operações</div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--gold,#F5B614)"></div><div class="mc-lbl">Gestão</div><div class="mc-val" style="font-size:1rem;padding-top:6px"><button class="btn btn-g btn-sm" id="btnBanca">Configurar banca</button></div></div>'
   +'</div>';
  html+='<div class="grid2b">'+P.grafCard(true,'chTC','Evolução da banca',true)+P.grafCard(false,'chTO','Resultado por operação',true)+'</div>';
  var ops=P.st.trade.ops.slice().sort(function(a,c){return String(c.dt||'').localeCompare(String(a.dt||''));}),lim=P.histLim();
  var rows=ops.slice(0,lim).map(function(o){return '<tr><td class="mono" style="color:var(--mut)">'+P.dBR(o.dt)+'</td><td><b>'+e(o.ativo)+'</b></td><td><span class="badge '+(o.dir==='L'?'b-open':'b-closed')+'">'+(o.dir==='L'?'Long':'Short')+'</span></td><td class="num mono">'+(o.alav||1)+'x</td><td class="num"><span class="res-pill '+(o.res>=0?'res-up':'res-dn')+'">'+P.money(o.res)+'</span></td><td style="color:var(--mut);font-size:12px;max-width:280px">'+e(o.txt||'—')+'</td></tr>';}).join('');
  if(ops.length>lim)rows+='<tr class="lockrow"><td colspan="6">🔒 Ver histórico completo — PRO</td></tr>';
  html+='<div class="card"><div class="card-hd"><div class="card-title">Operações</div><div class="right">'+P.exportBtn('trade')+'</div></div><div class="tblw"><table style="min-width:720px"><thead><tr><th>Data</th><th>Ativo</th><th>Direção</th><th class="num">Alav.</th><th class="num">Resultado</th><th>Anotação</th></tr></thead><tbody>'+(rows||'<tr><td colspan="6"><div class="empty">Nenhuma operação — registre em <b>+ Adicionar</b>.</div></td></tr>')+'</tbody></table></div></div>';
  html+=P.planosCTA();document.getElementById('pg').innerHTML=html;
  document.getElementById('btnBanca').onclick=P.tFormBanca;
  P.exporters={trade:function(){var L=[['Data','Ativo','Direção','Alavancagem','Resultado USD','Anotação']];P.st.trade.ops.forEach(function(o){L.push([o.dt,o.ativo,o.dir==='L'?'Long':'Short',o.alav||1,(o.res||0).toFixed(2),o.txt||'']);});P.exportCSV('mundodefi-trade',L);}};
  var r=P.rt();
  var asc=P.st.trade.ops.slice().sort(function(a,c){return String(a.dt||'').localeCompare(String(c.dt||''));});
  var acc=Number(b.ini)||0,curve=[{l:'início',v:acc}];asc.forEach(function(o,i){acc+=Number(o.res)||0;curve.push({l:'#'+(i+1),v:acc});});
  P.mkChart('chTC',{type:'line',data:{labels:curve.map(function(c){return c.l;}),datasets:[{data:curve.map(function(c){return Math.round(c.v*r);}),borderColor:'#00E5FF',borderWidth:2.2,pointRadius:3,pointBackgroundColor:'#00E5FF',fill:true,backgroundColor:'rgba(0,229,255,.08)',tension:.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:P.moneyCb()}}},scales:{x:{grid:{display:false},ticks:P.gTicks()},y:{grid:P.gGrid(),ticks:P.gTicks()}}}});
  P.mkChart('chTO',{type:'bar',data:{labels:asc.map(function(o,i){return '#'+(i+1)+' '+o.ativo;}),datasets:[{data:asc.map(function(o){return Math.round((Number(o.res)||0)*r);}),backgroundColor:asc.map(function(o){return o.res>=0?'rgba(20,241,149,.65)':'rgba(255,77,106,.65)';}),borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:P.moneyCb()}}},scales:{x:{grid:{display:false},ticks:P.gTicks()},y:{grid:P.gGrid(),ticks:P.gTicks()}}}});
  P.countUps();
};

/* ---------- DEFI ---------- */
P.dTab='pools';
P.dPool=function(id){return P.st.defi.pools.filter(function(p){return p.id===id;})[0];};
P.dFormPool=function(){
  var e=P.esc,carts=P.st.carteiras.map(function(c){return '<option value="'+c.id+'">'+e(c.nome)+'</option>';}).join('');
  P.modal('Nova pool de liquidez',
   '<div class="frow3"><div class="fg"><label>Par</label><input id="fPar" placeholder="Ex: SOL/USDC" style="text-transform:uppercase"></div>'
   +'<div class="fg"><label>Plataforma</label><input id="fProto" placeholder="Ex: Orca, Raydium…"></div>'
   +'<div class="fg"><label>Blockchain</label><input id="fChain" placeholder="Ex: Solana"></div></div>'
   +'<div class="frow3"><div class="fg"><label>Carteira</label><select id="fCart">'+carts+'</select></div>'
   +'<div class="fg"><label>Depósito inicial (US$)</label><input id="fDep" type="number" step="any"></div>'
   +'<div class="fg"><label>Data de abertura</label><input id="fDt" type="date" value="'+P.today()+'"></div></div>'
   +'<div class="fg"><label>Tokens depositados</label><input id="fTok" placeholder="Ex: 20 SOL + 1.400 USDC"></div>'
   +'<div class="sb-sec" style="padding-left:0">📓 Diário estratégico</div>'
   +'<div class="fg"><label>Objetivo</label><input id="dObj"></div>'
   +'<div class="fg"><label>Motivo da entrada</label><input id="dMot"></div>'
   +'<div class="frow"><div class="fg"><label>Plano A</label><input id="dPa"></div><div class="fg"><label>Plano B</label><input id="dPb"></div></div>'
   +'<div class="fg"><label>Critério de saída</label><input id="dSai"></div>'
   +'<div class="fg"><label>Observações</label><textarea id="dObs"></textarea></div>',
   {wide:true,footer:'<button class="btn btn-p" id="okPool">Criar pool</button>'});
  document.getElementById('okPool').onclick=function(){
    var par=P.val('fPar').toUpperCase();if(!par)return;var dep=P.num('fDep'),dt=P.val('fDt')||P.today();
    P.st.defi.pools.push({id:P.uid(),par:par,proto:P.val('fProto')||'—',chain:P.val('fChain')||'—',cart:P.val('fCart')||P.st.carteiras[0].id,st:'a',ab:dt,en:null,dep:dep?[{dt:dt,usd:dep,tok:P.val('fTok')}]:[],ret:[],tax:[],reb:[],cur:{usd:dep,tok:P.val('fTok')},di:{obj:P.val('dObj'),mot:P.val('dMot'),pa:P.val('dPa'),pb:P.val('dPb'),sai:P.val('dSai'),obs:P.val('dObs')},notas:[]});
    P.save();P.closeModal();P.render();
  };
};
P.dAcao=function(p,tipo){
  var e=P.esc,cfg={tax:['Registrar taxas coletadas','Valor coletado (US$)'],dep:['Registrar aporte','Valor do aporte (US$)'],ret:['Registrar retirada','Valor retirado (US$)'],reb:['Registrar rebalanceamento',null],nota:['Adicionar nota',null],cur:['Atualizar valor atual','Valor atual (US$)']}[tipo];
  var body='';
  if(cfg[1])body+='<div class="fg"><label>'+cfg[1]+'</label><input id="aUsd" type="number" step="any"></div>';
  if(tipo==='dep'||tipo==='ret'||tipo==='cur')body+='<div class="fg"><label>Tokens</label><input id="aTok" placeholder="opcional"></div>';
  if(tipo==='reb'||tipo==='nota')body+='<div class="fg"><label>Descrição</label><textarea id="aTxt"></textarea></div>';
  body+='<div class="fg"><label>Data</label><input id="aDt" type="date" value="'+P.today()+'"></div>';
  P.modal(cfg[0]+' — '+e(p.par),body,{footer:'<button class="btn btn-p" id="okA">Salvar</button>'});
  document.getElementById('okA').onclick=function(){
    var dt=P.val('aDt')||P.today(),usd=P.num('aUsd'),txt=P.val('aTxt'),tok=P.val('aTok');
    if(tipo==='tax')p.tax.push({dt:dt,usd:usd});
    if(tipo==='dep'){p.dep.push({dt:dt,usd:usd,tok:tok});p.cur.usd=(Number(p.cur.usd)||0)+usd;}
    if(tipo==='ret'){p.ret.push({dt:dt,usd:usd,tok:tok});p.cur.usd=Math.max(0,(Number(p.cur.usd)||0)-usd);}
    if(tipo==='reb')p.reb.push({dt:dt,txt:txt});
    if(tipo==='nota')p.notas.push({dt:dt,txt:txt});
    if(tipo==='cur'){p.cur.usd=usd;if(tok)p.cur.tok=tok;}
    P.save();P.closeModal();P.render();P.dDetalhe(p.id);
  };
};
P.dEncerrar=function(p){
  var e=P.esc;
  P.modal('Encerrar pool — '+e(p.par),'<div class="notice">Ao encerrar, o valor final entra como retirada, a pool vai para o histórico e o resultado soma no acumulado da estratégia <b>'+e(P.stratKey(p))+'</b>. Nada é apagado.</div><div class="frow"><div class="fg"><label>Valor final retirado (US$)</label><input id="aUsd" type="number" step="any" value="'+(p.cur.usd||0)+'"></div><div class="fg"><label>Data</label><input id="aDt" type="date" value="'+P.today()+'"></div></div><div class="fg"><label>Tokens retirados</label><input id="aTok" value="'+e(p.cur.tok||'')+'"></div><div class="fg"><label>Nota de encerramento</label><textarea id="aTxt"></textarea></div>',{footer:'<button class="btn btn-red" id="okE">Encerrar pool</button>'});
  document.getElementById('okE').onclick=function(){var dt=P.val('aDt')||P.today(),usd=P.num('aUsd');if(usd)p.ret.push({dt:dt,usd:usd,tok:P.val('aTok')});var txt=P.val('aTxt');if(txt)p.notas.push({dt:dt,txt:'Encerramento: '+txt});p.st='e';p.en=dt;p.cur.usd=0;P.save();P.closeModal();P.render();};
};
P.dDetalhe=function(id){
  var e=P.esc,p=P.dPool(id);if(!p)return;
  var L=P.poolLucro(p),dep=P.poolSum(p,'dep'),ret=P.poolSum(p,'ret'),tax=P.poolSum(p,'tax'),tl=[];
  p.dep.forEach(function(x){tl.push({dt:x.dt,txt:'<b>Depósito</b> '+P.money(x.usd)+(x.tok?' · <span class="tok-line">'+e(x.tok)+'</span>':'')});});
  p.ret.forEach(function(x){tl.push({dt:x.dt,txt:'<b>Retirada</b> '+P.money(x.usd)+(x.tok?' · <span class="tok-line">'+e(x.tok)+'</span>':'')});});
  p.tax.forEach(function(x){tl.push({dt:x.dt,txt:'<b>Taxas</b> '+P.money(x.usd)});});
  p.reb.forEach(function(x){tl.push({dt:x.dt,txt:'<b>Rebalanceamento</b> — '+e(x.txt)});});
  p.notas.forEach(function(x){tl.push({dt:x.dt,txt:'<b>Nota</b> — '+e(x.txt)});});
  tl.sort(function(a,b){return String(b.dt||'').localeCompare(String(a.dt||''));});
  var di=p.di||{},diH=['obj|🎯 Objetivo','mot|💡 Motivo','pa|🅰 Plano A','pb|🅱 Plano B','sai|🚪 Critério de saída','obs|📝 Observações'].map(function(x){var k=x.split('|');return di[k[0]]?'<div class="d-item"><b>'+k[1]+'</b><p>'+e(di[k[0]])+'</p></div>':'';}).join('');
  var body='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:1rem"><span class="chain-tag" style="border:1px solid var(--line2)">'+e(p.proto)+'</span><span class="tag">'+e(p.chain)+'</span><span class="badge '+(p.st==='a'?'b-open':'b-closed')+'">'+(p.st==='a'?'Pool aberta':'Pool encerrada')+'</span><span class="mono" style="font-size:11px;color:var(--mut2)">'+P.dBR(p.ab)+(p.en?' → '+P.dBR(p.en):' → hoje')+'</span><span style="margin-left:auto">'+P.advBtn()+'</span></div>';
  body+='<div class="mgrid" style="grid-template-columns:repeat(5,1fr);margin-bottom:1rem"><div class="mc" style="padding:.7rem .8rem"><div class="mc-lbl">Depositado</div><div class="mc-val" style="font-size:1rem">'+P.money(dep)+'</div></div><div class="mc" style="padding:.7rem .8rem"><div class="mc-lbl">Retirado</div><div class="mc-val" style="font-size:1rem">'+P.money(ret)+'</div></div><div class="mc" style="padding:.7rem .8rem"><div class="mc-lbl">Taxas</div><div class="mc-val" style="font-size:1rem;color:var(--cyan,#00E5FF)">'+P.money(tax)+'</div></div><div class="mc" style="padding:.7rem .8rem"><div class="mc-lbl">Valor atual</div><div class="mc-val" style="font-size:1rem">'+(p.st==='a'?P.money(p.cur.usd):'—')+'</div></div><div class="mc" style="padding:.7rem .8rem"><div class="mc-lbl">Resultado</div><div class="mc-val '+P.cls(L)+'" style="font-size:1rem">'+P.money(L)+'</div></div></div>';
  if(p.st==='a'&&p.cur.tok)body+='<div class="notice">Tokens atuais: <span class="tok-line">'+e(p.cur.tok)+'</span></div>';
  if(p.st==='a')body+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1.2rem"><button class="btn btn-green btn-sm" data-a="tax">+ Taxas</button><button class="btn btn-g btn-sm" data-a="dep">+ Aporte</button><button class="btn btn-g btn-sm" data-a="ret">− Retirada</button><button class="btn btn-g btn-sm" data-a="reb">↔ Rebalanceamento</button><button class="btn btn-g btn-sm" data-a="cur">✎ Atualizar valor</button><button class="btn btn-g btn-sm" data-a="nota">📝 Nota</button><button class="btn btn-red btn-sm" data-a="end" style="margin-left:auto">Encerrar pool</button></div>';
  body+='<div class="grid2b"><div><div class="sb-sec" style="padding-left:0">📓 Diário estratégico</div><div class="diario">'+(diH||'<div class="empty">Diário vazio</div>')+'</div></div><div><div class="sb-sec" style="padding-left:0">🕐 Linha do tempo</div><div class="tl">'+(tl.map(function(x){return '<div class="tl-item"><span class="tl-date">'+P.dBR(x.dt)+'</span><span class="tl-txt">'+x.txt+'</span></div>';}).join('')||'<div class="empty">Sem eventos</div>')+'</div></div></div>';
  P.modal(e(p.par)+' <span style="color:var(--mut2);font-weight:400;font-size:12px">'+e(p.proto)+'</span>',body,{wide:true});
  document.querySelectorAll('[data-a]').forEach(function(b){b.onclick=function(){var a=b.dataset.a;if(a==='end')return P.dEncerrar(p);P.dAcao(p,a);};});
};
P.dFormSwap=function(){
  var e=P.esc,carts=P.st.carteiras.map(function(c){return '<option value="'+c.id+'">'+e(c.nome)+'</option>';}).join('');
  P.modal('Registrar swap','<div class="frow"><div class="fg"><label>Vendeu</label><input id="fDeT" style="text-transform:uppercase"></div><div class="fg"><label>Quantidade</label><input id="fDeQ"></div></div><div class="frow"><div class="fg"><label>Comprou</label><input id="fPaT" style="text-transform:uppercase"></div><div class="fg"><label>Quantidade</label><input id="fPaQ"></div></div><div class="frow"><div class="fg"><label>Data</label><input id="fDt" type="date" value="'+P.today()+'"></div><div class="fg"><label>Carteira</label><select id="fCart">'+carts+'</select></div></div><div class="fg"><label>Motivo</label><textarea id="fMot"></textarea></div>',{footer:'<button class="btn btn-p" id="okS">Salvar</button>'});
  document.getElementById('okS').onclick=function(){if(!P.val('fDeT')||!P.val('fPaT'))return;P.st.defi.swaps.push({id:P.uid(),dt:P.val('fDt')||P.today(),deT:P.val('fDeT').toUpperCase(),deQ:P.val('fDeQ'),paT:P.val('fPaT').toUpperCase(),paQ:P.val('fPaQ'),mot:P.val('fMot'),cart:P.val('fCart')});P.save();P.closeModal();P.render();};
};
P.dFormLend=function(){
  var e=P.esc,carts=P.st.carteiras.map(function(c){return '<option value="'+c.id+'">'+e(c.nome)+'</option>';}).join('');
  P.modal('Registrar lending','<div class="frow3"><div class="fg"><label>Plataforma</label><input id="fPlat" placeholder="Kamino, Aave"></div><div class="fg"><label>Blockchain</label><input id="fChain"></div><div class="fg"><label>Tipo</label><select id="fTipo"><option value="s">Supply</option><option value="b">Borrow</option></select></div></div><div class="frow3"><div class="fg"><label>Token</label><input id="fTk" style="text-transform:uppercase"></div><div class="fg"><label>Quantidade</label><input id="fQ"></div><div class="fg"><label>Valor (US$)</label><input id="fUsd" type="number" step="any"></div></div><div class="frow"><div class="fg"><label>APY (%)</label><input id="fApy" type="number" step="any"></div><div class="fg"><label>Carteira</label><select id="fCart">'+carts+'</select></div></div>',{footer:'<button class="btn btn-p" id="okL">Salvar</button>'});
  document.getElementById('okL').onclick=function(){if(!P.val('fTk'))return;P.st.defi.lend.push({id:P.uid(),plat:P.val('fPlat')||'—',chain:P.val('fChain')||'—',tipo:P.val('fTipo')||'s',tk:P.val('fTk').toUpperCase(),q:P.val('fQ'),usd:P.num('fUsd'),apy:P.num('fApy'),cart:P.val('fCart'),st:'a'});P.save();P.closeModal();P.render();};
};
P.dCard=function(p){
  var e=P.esc,L=P.poolLucro(p),tax=P.poolSum(p,'tax');
  return '<div class="pool-card" data-p="'+p.id+'"><div class="pool-hd"><div><div class="pool-par">'+e(p.par)+'</div><div class="pool-proto">'+e(p.proto)+' · '+e(p.chain)+'</div></div><span class="badge '+(p.st==='a'?'b-open':'b-closed')+'" style="margin-left:auto">'+(p.st==='a'?'Aberta':'Encerrada')+'</span></div><div class="pool-nums"><div><span>Valor atual</span><b>'+(p.st==='a'?P.money(p.cur.usd):'—')+'</b></div><div><span>Taxas</span><b style="color:var(--cyan,#00E5FF)">'+P.money(tax)+'</b></div><div><span>Resultado</span><b class="'+P.cls(L)+'">'+P.money(L)+'</b></div></div>'+(p.st==='a'&&p.cur.tok?'<div class="tok-line">'+e(p.cur.tok)+'</div>':'')+'</div>';
};
P.vDefi=function(){
  var e=P.esc;
  document.getElementById('pgTitle').textContent='DeFi';
  document.getElementById('pgSub').textContent='Pools de liquidez, swaps e lending — o coração do sistema';
  document.getElementById('btnAdd').onclick=function(){if(P.dTab==='swaps')return P.dFormSwap();if(P.dTab==='lend')return P.dFormLend();P.dFormPool();};
  var pools=P.st.defi.pools.filter(P.filtCart),abertas=pools.filter(function(p){return p.st==='a';});
  var valor=abertas.reduce(function(s,p){return s+(Number(p.cur.usd)||0);},0),tax=pools.reduce(function(s,p){return s+P.poolSum(p,'tax');},0),lucro=pools.reduce(function(s,p){return s+P.poolLucro(p);},0);
  var html=P.atlasBanner('🌊','Oráculo de Liquidez','O Atlas interpreta suas pools, taxas coletadas e rebalanceamentos — pergunte sobre suas estratégias de liquidez.');
  html+='<div class="mgrid">'
   +'<div class="mc"><div class="mc-accent" style="background:var(--green,#14F195)"></div><div class="mc-lbl">Valor em pools</div><div class="mc-val" data-cv="'+valor+'">'+P.money(valor)+'</div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--cyan,#00E5FF)"></div><div class="mc-lbl">Taxas coletadas</div><div class="mc-val" style="color:var(--cyan,#00E5FF)" data-cv="'+tax+'">'+P.money(tax)+'</div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--purple,#9945FF)"></div><div class="mc-lbl">Lucro DeFi total</div><div class="mc-val '+P.cls(lucro)+'" data-cv="'+lucro+'">'+P.money(lucro)+'</div></div>'
   +'<div class="mc"><div class="mc-accent" style="background:var(--gold,#F5B614)"></div><div class="mc-lbl">Pools ativas</div><div class="mc-val" data-cv="'+abertas.length+'" data-t="n">'+abertas.length+'</div></div></div>';
  html+='<div class="tabs"><button class="tab'+(P.dTab==='pools'?' on':'')+'" data-t="pools">🌊 Pools</button><button class="tab'+(P.dTab==='swaps'?' on':'')+'" data-t="swaps">🔁 Swaps</button><button class="tab'+(P.dTab==='lend'?' on':'')+'" data-t="lend">🏦 Lending</button><span style="margin-left:auto">'+P.exportBtn('defi')+'</span></div>';
  if(P.dTab==='pools'){
    html+='<div class="grid2b">'+P.grafCard(true,'chDT','Taxas coletadas por mês (renda em dólar)',true)+P.grafCard(true,'chDP','Distribuição por protocolo',true)+'</div>';
    var strats=P.strategies().filter(function(s){return s.closed.length>0;});
    if(strats.length)html+=strats.map(function(s){return '<div class="strat-res"><span style="font-size:16px">📈</span><div><b>'+e(s.key)+'</b> — resultado acumulado da estratégia ('+s.closed.length+' pool'+(s.closed.length>1?'s':'')+' encerrada'+(s.closed.length>1?'s':'')+'): <b class="'+P.cls(s.res)+'">'+P.money(s.res)+'</b>'+(s.open.length?' <span style="color:var(--mut);font-size:12px">· pool aberta em andamento (contada separada)</span>':'')+'</div></div>';}).join('');
    html+='<div class="sb-sec" style="padding-left:0">Pools abertas</div>'+(abertas.length?'<div class="pool-grid">'+abertas.map(P.dCard).join('')+'</div>':'<div class="empty">Nenhuma pool aberta — crie a primeira em <b>+ Adicionar</b>.</div>');
    var enc=pools.filter(function(p){return p.st==='e';}),lim=P.histLim();
    html+='<div class="sb-sec" style="padding-left:0;margin-top:1rem">Histórico — pools encerradas (nada é apagado)</div>';
    if(enc.length){var rows=enc.slice(0,lim).map(function(p){var L=P.poolLucro(p);return '<tr style="cursor:pointer" data-p="'+p.id+'"><td><div class="pool-name">'+e(p.par)+'</div><div class="pool-proj">'+e(p.proto)+'</div></td><td><span class="tag">'+e(p.chain)+'</span></td><td class="mono" style="color:var(--mut)">'+P.dBR(p.ab)+' → '+P.dBR(p.en)+'</td><td class="num mono">'+P.money(P.poolSum(p,'dep'))+'</td><td class="num mono" style="color:var(--cyan,#00E5FF)">'+P.money(P.poolSum(p,'tax'))+'</td><td class="num"><span class="res-pill '+(L>=0?'res-up':'res-dn')+'">'+P.money(L)+'</span></td></tr>';}).join('');if(enc.length>lim)rows+='<tr class="lockrow"><td colspan="6">🔒 Ver todo o histórico — PRO</td></tr>';html+='<div class="card"><div class="tblw"><table style="min-width:720px"><thead><tr><th>Pool</th><th>Chain</th><th>Período</th><th class="num">Depositado</th><th class="num">Taxas</th><th class="num">Resultado</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';}
    else html+='<div class="empty">Nenhuma pool encerrada ainda.</div>';
  }
  if(P.dTab==='swaps'){
    var sw=P.st.defi.swaps.filter(P.filtCart).slice().sort(function(a,b){return String(b.dt).localeCompare(String(a.dt));}),limS=P.histLim();
    var rowsS=sw.slice(0,limS).map(function(s){return '<tr><td class="mono" style="color:var(--mut)">'+P.dBR(s.dt)+'</td><td class="mono"><b>'+e(s.deQ)+' '+e(s.deT)+'</b> → <b style="color:var(--green,#14F195)">'+e(s.paQ)+' '+e(s.paT)+'</b></td><td style="color:var(--mut);font-size:12px;max-width:340px">'+e(s.mot||'—')+'</td></tr>';}).join('');
    if(sw.length>limS)rowsS+='<tr class="lockrow"><td colspan="3">🔒 Ver todos os swaps — PRO</td></tr>';
    html+='<div class="notice">Todo swap fica registrado: quantidade, data e motivo. É assim que você estuda suas próprias decisões depois.</div><div class="card"><div class="tblw"><table style="min-width:560px"><thead><tr><th>Data</th><th>Troca</th><th>Motivo</th></tr></thead><tbody>'+(rowsS||'<tr><td colspan="3"><div class="empty">Nenhum swap</div></td></tr>')+'</tbody></table></div></div>';
  }
  if(P.dTab==='lend'){
    var ld=P.st.defi.lend.filter(P.filtCart);
    var rowsL=ld.map(function(l){return '<tr><td><b>'+e(l.plat)+'</b></td><td><span class="tag">'+e(l.chain)+'</span></td><td><span class="badge '+(l.tipo==='s'?'b-open':'b-closed')+'">'+(l.tipo==='s'?'Supply':'Borrow')+'</span></td><td class="mono">'+e(l.q)+' '+e(l.tk)+'</td><td class="num mono">'+P.money(l.usd)+'</td><td class="num mono" style="color:var(--green,#14F195)">'+(l.apy?l.apy.toFixed(1)+'%':'—')+'</td></tr>';}).join('');
    html+='<div class="card"><div class="tblw"><table style="min-width:620px"><thead><tr><th>Plataforma</th><th>Chain</th><th>Tipo</th><th>Posição</th><th class="num">Valor</th><th class="num">APY</th></tr></thead><tbody>'+(rowsL||'<tr><td colspan="6"><div class="empty">Nenhuma posição</div></td></tr>')+'</tbody></table></div></div>';
  }
  html+=P.planosCTA();document.getElementById('pg').innerHTML=html;
  document.querySelectorAll('.tab').forEach(function(b){b.onclick=function(){P.dTab=b.dataset.t;P.render();};});
  document.querySelectorAll('[data-p]').forEach(function(el){el.onclick=function(){P.dDetalhe(el.dataset.p);};});
  P.exporters={defi:function(){var L=[['Par','Plataforma','Chain','Status','Abertura','Encerramento','Depositado USD','Retirado USD','Taxas USD','Resultado USD']];P.st.defi.pools.filter(P.filtCart).forEach(function(p){L.push([p.par,p.proto,p.chain,p.st==='a'?'Aberta':'Encerrada',p.ab,p.en||'',P.poolSum(p,'dep').toFixed(2),P.poolSum(p,'ret').toFixed(2),P.poolSum(p,'tax').toFixed(2),P.poolLucro(p).toFixed(2)]);});P.exportCSV('mundodefi-defi',L);}};
  if(P.dTab==='pools'){
    var r=P.rt(),mm={},labs=[];
    for(var i=5;i>=0;i--){var d=new Date();d.setMonth(d.getMonth()-i);var k=d.toISOString().slice(0,7);mm[k]=0;labs.push(k);}
    pools.forEach(function(p){p.tax.forEach(function(t){var k=String(t.dt||'').slice(0,7);if(k in mm)mm[k]+=Number(t.usd)||0;});});
    P.mkChart('chDT',{type:'bar',data:{labels:labs.map(function(k){var p=k.split('-');return p[1]+'/'+p[0].slice(2);}),datasets:[{data:labs.map(function(k){return Math.round(mm[k]*r);}),backgroundColor:'rgba(0,229,255,.55)',borderColor:'#00E5FF',borderWidth:1.5,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:P.moneyCb()}}},scales:{x:{grid:{display:false},ticks:P.gTicks()},y:{grid:P.gGrid(),ticks:P.gTicks()}}}});
    var pm={};abertas.forEach(function(p){pm[p.proto]=(pm[p.proto]||0)+(Number(p.cur.usd)||0);});var pl=Object.keys(pm);
    P.mkChart('chDP',{type:'doughnut',data:{labels:pl,datasets:[{data:pl.map(function(k){return pm[k]*r;}),backgroundColor:['#14F195','#9945FF','#F5B614','#00E5FF','#FF4D6A'],borderColor:'#0C101C',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{color:'#8B93A7',font:{family:'Space Mono',size:11},boxWidth:11,boxHeight:11}},tooltip:{callbacks:{label:P.moneyCb()}}}}});
  }
  P.countUps();
};

/* ---------- ATLAS (premium — visual elegante + Oráculo) ---------- */
P.vAtlas=function(){
  var e=P.esc;
  document.getElementById('pgTitle').textContent='Atlas';
  document.getElementById('pgSub').textContent='A camada inteligente do MundoDeFi — Oráculo, análises e insights sobre o seu patrimônio';
  if(!P.hasAtlas()){
    document.getElementById('pg').innerHTML=
     '<div class="atlas-hd"><div class="orb">🔮</div><div><h2>Atlas <span class="crown">Premium</span></h2><p>A versão mais avançada do MundoDeFi.</p></div></div>'
     +'<div class="up-hero" style="padding:2rem 0"><div class="big">👑</div><h3>O Atlas é exclusivo do plano Premium</h3><p>Ative o Oráculo, as análises e os insights que interpretam o seu patrimônio, suas pools e seus objetivos — tudo baseado nos seus próprios dados.</p></div>'
     +'<div class="ins-grid" style="max-width:720px;margin:0 auto 1.4rem">'
     +'<div class="ins"><div class="i" style="background:var(--purple-soft)">🔮</div><div><b>Oráculo</b><p>Pergunte sobre o seu patrimônio e receba respostas baseadas nos seus dados, histórico e diário.</p></div></div>'
     +'<div class="ins"><div class="i" style="background:var(--cyan-soft)">📊</div><div><b>Análises</b><p>Leitura automática das suas posições, concentração e evolução.</p></div></div>'
     +'<div class="ins"><div class="i" style="background:var(--green-soft)">📓</div><div><b>Diário Inteligente</b><p>O Atlas interpreta suas anotações e mostra padrões e lições.</p></div></div>'
     +'<div class="ins"><div class="i" style="background:var(--gold-soft)">🎓</div><div><b>Academy</b><p>Estudos avançados integrados ao seu contexto de investidor.</p></div></div>'
     +'</div><div style="text-align:center"><a href="/planos.html" class="btn btn-p btn-big" style="padding:13px 30px">Conhecer o Premium</a></div>';
    return;
  }
  /* Premium ativo */
  var T=P.totais(),strats=P.strategies();
  var maiorPool=null;P.st.defi.pools.forEach(function(p){if(p.st==='a'&&(!maiorPool||(p.cur.usd||0)>(maiorPool.cur.usd||0)))maiorPool=p;});
  var conc=T.pat>0?((maiorPool?(maiorPool.cur.usd||0):0)/T.pat*100):0;
  var html='<div class="atlas-hd"><div class="orb">🔮</div><div><h2>Atlas <span class="crown">Premium ativo</span></h2><p>Bem-vindo à camada inteligente. Tudo abaixo é gerado a partir dos seus próprios dados.</p></div></div>';
  /* Oráculo */
  html+='<div class="orac"><div class="orac-hd"><div class="orb2">🔮</div><div><b style="font-size:14.5px">Oráculo</b><div style="font-size:11.5px;color:var(--mut2)">Interpreta seu patrimônio — não faz previsões nem indica compra/venda</div></div></div>'
   +'<div class="orac-body"><div id="oracMsg"><div class="orac-msg">Olá! Sou o Oráculo. Posso interpretar o seu patrimônio, suas pools e sua estratégia com base nos seus dados. Sobre o que você quer entender melhor?</div></div>'
   +'<div class="orac-q">'
   +'<button class="orac-chip" data-q="patrimonio">Como está meu patrimônio?</button>'
   +'<button class="orac-chip" data-q="pools">E minhas pools de liquidez?</button>'
   +'<button class="orac-chip" data-q="risco">Tenho concentração de risco?</button>'
   +'<button class="orac-chip" data-q="trade">Como vai meu trade?</button>'
   +'</div>'
   +'<div class="orac-in"><input id="oracInput" placeholder="Pergunte sobre o seu patrimônio…"><button class="btn btn-p" id="oracSend">Perguntar</button></div>'
   +'<div class="orac-note">⚠️ O Oráculo interpreta apenas os seus dados registrados. Não é recomendação de investimento nem previsão de mercado.</div></div></div>';
  /* Insights automáticos */
  html+='<div class="sb-sec" style="padding-left:0">Insights do Atlas</div><div class="ins-grid">';
  html+='<div class="ins"><div class="i" style="background:var(--purple-soft)">💰</div><div><b>Patrimônio de '+P.money(T.pat)+'</b><p>Distribuído entre HOLD ('+P.money(T.hold)+'), DeFi ('+P.money(T.defi+T.lend)+') e Trade ('+P.money(T.trade)+').</p></div></div>';
  html+='<div class="ins"><div class="i" style="background:var(--cyan-soft)">🌊</div><div><b>Renda de '+P.money(T.tax)+' em taxas</b><p>Suas pools já geraram '+P.money(T.tax)+' em taxas coletadas — renda real em dólar.</p></div></div>';
  if(strats.length){var best=strats.slice().sort(function(a,b){return b.res-a.res;})[0];html+='<div class="ins"><div class="i" style="background:var(--green-soft)">📈</div><div><b>Estratégia destaque: '+e(best.key)+'</b><p>Acumulado de '+P.money(best.res)+' em '+best.closed.length+' pool(s) encerrada(s).</p></div></div>';}
  html+='<div class="ins"><div class="i" style="background:'+(conc>40?'var(--red-soft)':'var(--gold-soft)')+'">'+(conc>40?'⚠️':'🛡️')+'</div><div><b>Concentração: '+conc.toFixed(0)+'% na maior pool</b><p>'+(conc>40?'Atenção: parte relevante do patrimônio está em uma única posição.':'Boa diversificação entre as suas posições.')+'</p></div></div>';
  html+='</div>';
  document.getElementById('pg').innerHTML=html;
  function responder(q){
    var txt;
    if(/pool|liquid/i.test(q)){var open=P.st.defi.pools.filter(function(p){return p.st==='a';}).length;txt='Você tem <b>'+open+' pool(s) aberta(s)</b> somando '+P.money(P.totais().defi)+'. No total já coletou '+P.money(T.tax)+' em taxas. '+(strats.length?'Sua estratégia mais forte é <b>'+e(strats.slice().sort(function(a,b){return b.res-a.res;})[0].key)+'</b>.':'');}
    else if(/risc|concentr/i.test(q))txt='Sua maior posição isolada representa <b>'+conc.toFixed(0)+'%</b> do patrimônio. '+(conc>40?'Isso é uma concentração alta — vale avaliar se está confortável com esse peso.':'Está num nível saudável de diversificação.');
    else if(/trade/i.test(q)){var s=P.tradeStats();txt='Seu trade tem <b>win rate de '+s.win.toFixed(0)+'%</b> em '+s.n+' operações, com resultado acumulado de '+P.money(s.res)+'. A banca atual é '+P.money(P.st.trade.banca.atu)+'.';}
    else txt='Seu patrimônio total é <b>'+P.money(T.pat)+'</b>, com lucro de '+P.money(T.lucro)+' ('+P.pct(T.rent)+'). A maior fatia está em '+(T.hold>=T.defi?'HOLD':'DeFi')+'.';
    var box=document.getElementById('oracMsg');
    box.innerHTML+='<div class="orac-msg" style="background:var(--purple-soft);border-color:rgba(153,69,255,.25)">'+txt+'</div>';
    box.scrollTop=box.scrollHeight;
  }
  document.querySelectorAll('.orac-chip').forEach(function(b){b.onclick=function(){responder(b.dataset.q);};});
  document.getElementById('oracSend').onclick=function(){var v=P.val('oracInput');if(!v)return;var box=document.getElementById('oracMsg');box.innerHTML+='<div class="orac-msg" style="text-align:right;background:transparent;border:none;color:var(--mut)">'+e(v)+'</div>';document.getElementById('oracInput').value='';responder(v);};
  document.getElementById('oracInput').addEventListener('keydown',function(ev){if(ev.key==='Enter')document.getElementById('oracSend').click();});
};

/* ══════════════════ PÁGINAS (cada casca chama uma) ══════════════════ */
P.pageDash =function(){P.boot('dash', P.vDash );};
P.pageHold =function(){P.boot('hold', P.vHold );};
P.pageDefi =function(){P.boot('defi', P.vDefi );};
P.pageTrade=function(){P.boot('trade',P.vTrade);};
P.pageAtlas=function(){P.boot('atlas',P.vAtlas);};

})(); /* fecha a IIFE do núcleo */
