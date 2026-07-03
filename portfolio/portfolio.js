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

/* ── shell (sidebar + topo) ── */
P.init=function(page,render){
  P.load();
  var e=P.esc;
  var items=[
    ['dash','📊','Dashboard','/portfolio/index.html'],
    ['hold','💎','HOLD','/portfolio/hold.html'],
    ['defi','🌊','DeFi','/portfolio/defi.html'],
    ['trade','⚡','Trade','/portfolio/trade.html']
  ];
  var side='<aside class="sb"><a href="/" class="sb-logo"><div class="sb-logo-mark"><span>₿</span></div><div class="sb-logo-text">Mundo<em>DeFi</em></div></a>'
   +'<div class="sb-sec">Portfólio</div>'
   +items.map(function(it){return '<a class="sb-item'+(page===it[0]?' active':'')+'" href="'+it[3]+'"><span class="ico">'+it[1]+'</span>'+it[2]+'</a>';}).join('')
   +'<div class="sb-sec">Inteligência</div>'
   +'<button class="sb-item lockbtn-side" id="sbAtlas" style="width:100%;border:none;background:transparent;text-align:left;cursor:pointer"><span class="ico">🔮</span>Atlas <span class="badge" style="background:var(--gold-soft);color:var(--gold,#F5B614);margin-left:auto">🔒 Premium</span></button>'
   +'<div class="sb-foot">'
   +'<div class="sb-plan"><div class="sb-plan-lbl">Plano (demo — simular)</div><select id="planSel">'
   +['gratis','pro','premium'].map(function(p){return '<option value="'+p+'"'+(P.st.cfg.plano===p?' selected':'')+'>'+P.PLAN_LBL[p]+'</option>';}).join('')
   +'</select></div>'
   +'<div class="sb-atlas"><span>🔮</span><div><b>Atlas AI</b><br>Em desenvolvimento — camada Premium</div></div>'
   +'<a class="sb-link" href="#" id="sbSeed">↻ Recarregar dados demo</a>'
   +'<a class="sb-link" href="#" id="sbClear">🗑 Limpar e começar do zero</a>'
   +'<a class="sb-link" href="/">← Voltar ao site</a>'
   +'</div></aside>';

  var carts='<select class="fsel" id="cartSel"><option value="all">Todas as carteiras</option>'
   +P.st.carteiras.map(function(c){return '<option value="'+c.id+'"'+(P.st.cfg.cart===c.id?' selected':'')+'>'+e(c.nome)+'</option>';}).join('')+'</select>';

  var top='<div class="mob-top"><button class="mob-burger" onclick="document.body.classList.toggle(\'snav\')">☰</button><div class="sb-logo-text" style="font-size:16px">Mundo<em>DeFi</em></div></div>'
   +'<main class="main"><div class="top"><h1 id="pgTitle"></h1><div class="top-right">'
   +carts
   +'<div class="seg"><button id="mUsd" class="'+(P.st.cfg.moeda==='usd'?'on':'')+'">US$</button><button id="mBrl" class="'+(P.st.cfg.moeda==='brl'?'on':'')+'">R$</button></div>'
   +'<button class="btn btn-p" id="btnAdd">+ Adicionar</button>'
   +'</div><div class="top-sub" id="pgSub"></div></div>'
   +'<div id="pg"></div></main>'
   +'<div class="mdl-bg" id="mdlBg"><div class="mdl" id="mdlBox"><div class="mdl-hd"><div class="mdl-title" id="mdlTitle"></div><button class="mdl-x" onclick="P.closeModal()">×</button></div><div class="mdl-bd" id="mdlBody"></div><div class="mdl-ft" id="mdlFoot"></div></div></div>';

  document.getElementById('app').innerHTML=side+'<div style="flex:1;min-width:0">'+top+'</div>';

  document.getElementById('planSel').addEventListener('change',function(){P.st.cfg.plano=this.value;P.save();location.reload();});
  document.getElementById('cartSel').addEventListener('change',function(){P.st.cfg.cart=this.value;P.save();render();});
  document.getElementById('mUsd').addEventListener('click',function(){P.st.cfg.moeda='usd';P.save();location.reload();});
  document.getElementById('mBrl').addEventListener('click',function(){P.st.cfg.moeda='brl';P.save();location.reload();});
  document.getElementById('sbSeed').addEventListener('click',function(ev){ev.preventDefault();if(confirm('Substituir os dados atuais pelos dados de exemplo?'))P.reset();});
  document.getElementById('sbClear').addEventListener('click',function(ev){ev.preventDefault();if(confirm('Apagar TUDO e começar do zero?'))P.clearAll();});
  document.getElementById('sbAtlas').addEventListener('click',function(){P.upsell('premium');});
  document.getElementById('mdlBg').addEventListener('click',function(ev){if(ev.target===this)P.closeModal();});
  document.addEventListener('click',function(ev){
    var b=ev.target.closest('.lockbtn');if(b)P.upsell(b.dataset.need||'premium');
    var lr=ev.target.closest('.lockrow');if(lr)P.upsell('pro');
  });

  P.loadRate().then(function(){render();P.loadPrices().then(render);});
};
})();
