/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  TESTES DO MOTOR DO IMD                                              ║
   ║                                                                      ║
   ║      node ferramentas/testes/teste-imd.js                           ║
   ║                                                                      ║
   ║  Testa o motor DE VERDADE (imd/js/motor.js), com os JSON reais de    ║
   ║  perguntas, competências e regras — não uma cópia. Cópia de código   ║
   ║  em teste prova que a cópia funciona, não o produto.                 ║
   ║                                                                      ║
   ║  ── POR QUE ESTE ARQUIVO PASSOU A IMPORTAR ──────────────────────    ║
   ║  O resultado do IMD agora fica atrás do login: a pessoa cria conta   ║
   ║  para ver aquele número. Ele precisa estar certo.                    ║
   ║                                                                      ║
   ║  ── O QUE UM ARQUIVO DE DADOS PODE QUEBRAR ──────────────────────    ║
   ║  As regras são editáveis em JSON, o que é bom — e perigoso. Se os    ║
   ║  pesos dos pilares deixarem de somar 1, toda nota do site muda em    ║
   ║  silêncio, sem erro nenhum na tela. É o primeiro teste daqui.        ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '../..');
const DIR = path.join(RAIZ, 'ferramentas/imd');

/* motor.js termina em `})(window)`; no Node emprestamos um window. */
const janela = {};
new Function('window', fs.readFileSync(path.join(DIR, 'js/motor.js'), 'utf8'))(janela);
const M = janela.IMDMotor;

const ler = f => JSON.parse(fs.readFileSync(path.join(DIR, 'data', f), 'utf8'));
M.dados.perguntas = ler('perguntas.json').perguntas;
M.dados.competencias = ler('competencias.json').competencias;
M.dados.regras = ler('regras.json');

let ok = 0, fail = 0;
function sec(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }
function eq(nome, real, esperado, tol) {
  tol = tol == null ? 1e-9 : tol;
  const bom = Math.abs(real - esperado) <= tol;
  console.log('  ' + (bom ? 'ok  ' : 'FALHOU') + ' ' + nome + '  = ' + real
    + (bom ? '' : '   esperado ' + esperado));
  bom ? ok++ : fail++;
}
function eqv(nome, real, esperado) {
  const bom = real === esperado;
  console.log('  ' + (bom ? 'ok  ' : 'FALHOU') + ' ' + nome + '  = ' + real
    + (bom ? '' : '   esperado ' + esperado));
  bom ? ok++ : fail++;
}

/* Responde o quiz inteiro escolhendo por uma estratégia e devolve o
   resultado. `escolha` recebe as opções e devolve o índice. */
function simular(escolha) {
  M.iniciar();
  let guarda = 0;
  let q;
  while ((q = M.proxima()) && guarda++ < 200) {
    M.responder(q.id, escolha(q.opcoes, q));
  }
  return M.calcular();
}
const pior = ops => ops.reduce((iMin, o, i, a) => o.pontos < a[iMin].pontos ? i : iMin, 0);
const melhor = ops => ops.reduce((iMax, o, i, a) => o.pontos > a[iMax].pontos ? i : iMax, 0);

/* ══════════════════════════════════════════════════════════════
   1. O INVARIANTE QUE UM JSON MAL EDITADO QUEBRA
   ══════════════════════════════════════════════════════════════ */
sec('Pesos dos pilares');
const pesos = M.dados.regras.pilares;
const soma = Object.keys(pesos).reduce((s, k) => s + pesos[k].peso, 0);
eq('somam exatamente 1', soma, 1, 1e-9);
Object.keys(pesos).forEach(k => {
  eqv('peso de ' + k + ' e' + ' positivo', pesos[k].peso > 0, true);
});

sec('Faixas de perfil cobrem 0 a 100 sem buraco nem sobreposicao');
const perfis = (M.dados.regras.perfis || []).slice().sort((a, b) => a.min - b.min);
eqv('existe ao menos um perfil', perfis.length > 0, true);
eq('o primeiro comeca em 0', perfis[0].min, 0);
eq('o ultimo termina em 100', perfis[perfis.length - 1].max, 100);
for (let i = 1; i < perfis.length; i++) {
  eq('faixa ' + i + ' encosta na anterior', perfis[i].min, perfis[i - 1].max + 1);
}
/* nenhuma nota inteira de 0 a 100 pode ficar sem perfil */
let semPerfil = [];
for (let n = 0; n <= 100; n++) {
  if (!perfis.find(p => n >= p.min && n <= p.max)) semPerfil.push(n);
}
eqv('toda nota de 0 a 100 cai num perfil', semPerfil.length, 0);

/* ══════════════════════════════════════════════════════════════
   2. LIMITES DA NOTA
   ══════════════════════════════════════════════════════════════ */
sec('Nota nos extremos');
const ruim = simular(pior);
const bom = simular(melhor);
eqv('respondendo o pior possivel, nota >= 0', ruim.imd >= 0, true);
eqv('respondendo o melhor possivel, nota <= 100', bom.imd <= 100, true);
eqv('o melhor pontua mais que o pior', bom.imd > ruim.imd, true);
console.log('       (pior = ' + ruim.imd + ', melhor = ' + bom.imd + ')');
eqv('o melhor caminho chega ao topo da escala', bom.imd >= 90, true);

sec('Nota nunca sai da escala, em 300 caminhos aleatorios');
let fora = 0, semPerfilRnd = 0, menor = 101, maior = -1;
for (let i = 0; i < 300; i++) {
  const r = simular(ops => Math.floor(Math.random() * ops.length));
  if (r.imd < 0 || r.imd > 100) fora++;
  if (!r.perfil) semPerfilRnd++;
  menor = Math.min(menor, r.imd);
  maior = Math.max(maior, r.imd);
}
eqv('nenhuma fora de 0 a 100', fora, 0);
eqv('nenhuma sem perfil', semPerfilRnd, 0);
console.log('       (faixa observada: ' + menor + ' a ' + maior + ')');

/* ══════════════════════════════════════════════════════════════
   3. O PILAR QUE NAO FOI PERGUNTADO
   ══════════════════════════════════════════════════════════════ */
sec('Todo pilar chega a ser perguntado, em qualquer caminho');
/* Um pilar sem nenhuma pergunta respondida pontua ZERO e leva junto o
   peso inteiro dele. Se o quiz adaptativo puder pular um pilar, a nota
   despenca por um motivo que nao tem nada a ver com a pessoa. */
const nomes = Object.keys(pesos);
let caminhosComPilarVazio = 0;
const vaziosPorPilar = {};
nomes.forEach(n => { vaziosPorPilar[n] = 0; });
for (let i = 0; i < 300; i++) {
  simular(ops => Math.floor(Math.random() * ops.length));
  const contagem = {};
  nomes.forEach(n => { contagem[n] = 0; });
  Object.keys(M.estado.respostas).forEach(id => {
    const q = M.dados.perguntas.find(x => x.id === id);
    if (q) contagem[q.pilar]++;
  });
  const vazios = nomes.filter(n => contagem[n] === 0);
  if (vazios.length) {
    caminhosComPilarVazio++;
    vazios.forEach(n => { vaziosPorPilar[n]++; });
  }
}
eqv('nenhum caminho deixa um pilar sem pergunta', caminhosComPilarVazio, 0);
if (caminhosComPilarVazio) {
  console.log('       pilares que ficaram vazios: ' + JSON.stringify(vaziosPorPilar));
}

/* ══════════════════════════════════════════════════════════════
   4. PENALIDADES
   ══════════════════════════════════════════════════════════════ */
sec('Penalidades so podem reduzir, nunca aumentar');
for (let i = 0; i < 200; i++) {
  const r = simular(ops => Math.floor(Math.random() * ops.length));
  if (r.imd > Math.round(r.bruto)) {
    eqv('nota ' + r.imd + ' maior que o bruto ' + Math.round(r.bruto), false, true);
    i = 999;
  }
}
if (fail === 0) { console.log('  ok   em 200 caminhos, a nota nunca superou o bruto'); ok++; }

sec('Penalidade de seguranca reduz de fato');
/* Monta a mao: seguranca no chao, resto no teto. */
M.iniciar();
let q2, guarda = 0;
while ((q2 = M.proxima()) && guarda++ < 200) {
  M.responder(q2.id, q2.pilar === 'seguranca' ? pior(q2.opcoes) : melhor(q2.opcoes));
}
const comRisco = M.calcular();
eqv('seguranca ficou abaixo do gatilho', comRisco.pilares.seguranca < 40, true);
eqv('alguma penalidade foi aplicada', (comRisco.penalidades || []).length > 0, true);
eqv('a nota final ficou abaixo do bruto', comRisco.imd < Math.round(comRisco.bruto), true);
console.log('       (bruto ' + Math.round(comRisco.bruto) + ' -> final ' + comRisco.imd + ')');

/* ══════════════════════════════════════════════════════════════
   5. PONTUACAO POR PILAR
   ══════════════════════════════════════════════════════════════ */
sec('Pilar e a fracao do maximo possivel');
const cheio = simular(melhor);
nomes.forEach(n => {
  eq(n + ' no melhor caminho', cheio.pilares[n], 100);
});
const zerado = simular(pior);
nomes.forEach(n => {
  eqv(n + ' no pior caminho fica entre 0 e 100',
    zerado.pilares[n] >= 0 && zerado.pilares[n] <= 100, true);
});

sec('Responder melhor nunca piora a nota (dentro da mesma trilha)');
/* CUIDADO AO ESCREVER ESTE TESTE: a primeira versao que eu fiz estava
   ERRADA e acusou 18 violacoes em 40. O quiz e' adaptativo -- melhorar a
   resposta de ENTRADA-01 muda a TRILHA inteira, de INI-* para INT-*, e
   comparar indices de resposta entre perguntas diferentes nao significa
   nada. Nao era bug do motor, era do teste.

   A versao valida melhora a ULTIMA pergunta respondida: ela nao pode
   mudar o caminho ja percorrido, entao a comparacao e' legitima. */
let quebras = 0, comparacoes = 0;
for (let i = 0; i < 60; i++) {
  M.iniciar();
  const trilha = [];
  let qq, g = 0;
  while ((qq = M.proxima()) && g++ < 200) {
    const idx = Math.floor(Math.random() * qq.opcoes.length);
    trilha.push({ id: qq.id, idx: idx, opcoes: qq.opcoes });
    M.responder(qq.id, idx);
  }
  if (!trilha.length) continue;
  const ultima = trilha[trilha.length - 1];
  const melhorIdx = melhor(ultima.opcoes);
  if (ultima.opcoes[melhorIdx].pontos <= ultima.opcoes[ultima.idx].pontos) continue;

  const base = M.calcular().imd;

  /* repete o mesmo caminho, so subindo a ultima resposta */
  M.iniciar();
  g = 0;
  let passo = 0;
  while ((qq = M.proxima()) && g++ < 200) {
    const igual = trilha[passo] && trilha[passo].id === qq.id;
    if (!igual) break;                       /* o caminho divergiu: descarta */
    const ehUltima = passo === trilha.length - 1;
    M.responder(qq.id, ehUltima ? melhorIdx : trilha[passo].idx);
    passo++;
  }
  if (passo !== trilha.length) continue;     /* nao deu para repetir igual */
  comparacoes++;
  if (M.calcular().imd < base) quebras++;
}
eqv('em ' + comparacoes + ' comparacoes validas, nunca piorou', quebras, 0);

sec('A trilha define o teto do diagnostico');
/* O PROBLEMA QUE ISTO CORRIGE, medido antes da correcao:
     declara pouca experiencia e acerta tudo -> 97, "Nativo DeFi", 12 perguntas
     declara muita experiencia e acerta tudo -> 100, 30 perguntas
   Tres pontos de diferenca. Como o pilar e' medido contra o maximo
   PERGUNTADO, acertar tudo no facil valia quase o mesmo que acertar tudo
   no dificil -- e ser honesto sobre ser avancado so dava mais chance de
   perder ponto.

   Agora a trilha define ate onde o diagnostico chega, alinhado as faixas
   de perfil que ja existiam. Quem nunca comprou cripto nao e' "Nativo
   DeFi" por saber responder pergunta de iniciante. */
function porTrilha(entradaIdx, ruimEm) {
  M.iniciar();
  let q4, g4 = 0, n = 0;
  while ((q4 = M.proxima()) && g4++ < 200) {
    let i;
    if (q4.id === 'ENTRADA-01') i = entradaIdx;
    else if (ruimEm && ruimEm.indexOf(q4.id) >= 0) i = pior(q4.opcoes);
    else i = melhor(q4.opcoes);
    M.responder(q4.id, i);
    n++;
  }
  return Object.assign({ perguntas: n }, M.calcular());
}

const tIni = porTrilha(0, null);
const tInt = porTrilha(2, ['INT-09']);
const tAv  = porTrilha(4, null);
console.log('       iniciante    : ' + tIni.imd + ' (' + tIni.perfil.nome + '), ' + tIni.perguntas + ' perguntas');
console.log('       intermediario: ' + tInt.imd + ' (' + tInt.perfil.nome + '), ' + tInt.perguntas + ' perguntas');
console.log('       avancado     : ' + tAv.imd + ' (' + tAv.perfil.nome + '), ' + tAv.perguntas + ' perguntas');

eqv('a trilha e identificada', tIni.trilha.id + '/' + tInt.trilha.id + '/' + tAv.trilha.id,
  'iniciante/intermediario/avancado');
eq('acertando tudo na trilha inicial, para no teto', tIni.imd, 50);
eq('na intermediaria, para no teto dela', tInt.imd, 75);
eq('na avancada, chega a 100', tAv.imd, 100);
eqv('declarar mais experiencia agora vale mais', tAv.imd > tInt.imd && tInt.imd > tIni.imd, true);
eqv('o teto NAO entra como penalidade', (tIni.penalidades || []).length, 0);
eqv('mas fica registrado que limitou', tIni.trilha.limitou, true);
eqv('quem chega ao fim nao e limitado', tAv.trilha.limitou, false);
eqv('e o motivo esta escrito, para a tela explicar',
  typeof tIni.trilha.motivo === 'string' && tIni.trilha.motivo.length > 40, true);

sec('Os tetos batem com as faixas de perfil');
/* Cada teto deve cair no FIM de uma faixa: um teto no meio de uma faixa
   deixaria perfis inalcancaveis pela trilha, o que confunde sem motivo. */
(M.dados.regras.trilhas || []).forEach(function (t) {
  const fecha = perfis.some(p => p.max === t.teto);
  eqv('teto ' + t.teto + ' (' + t.id + ') fecha uma faixa de perfil', fecha, true);
});

/* ══════════════════════════════════════════════════════════════
   1. O INVARIANTE QUE UM JSON MAL EDITADO QUEBRA
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════ */
console.log('\n' + '═'.repeat(62));
console.log(fail === 0
  ? 'TODOS OS ' + ok + ' TESTES PASSARAM'
  : fail + ' DE ' + (ok + fail) + ' FALHARAM');
console.log('═'.repeat(62));
process.exit(fail === 0 ? 0 : 1);
