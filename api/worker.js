/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · PROXY DE ANÁLISE (Cloudflare Worker)                    ║
   ║                                                                      ║
   ║  POR QUE ISTO EXISTE                                                 ║
   ║  O token.html chamava api.anthropic.com direto do navegador, sem     ║
   ║  chave e sem header de versão. Falhava em CORS antes mesmo da        ║
   ║  autenticação, então TODO visitante via "Análise indisponível".      ║
   ║                                                                      ║
   ║  A correção não é colar uma chave no HTML. Chave de LLM é            ║
   ║  computação que alguém paga: bots varrem HTML público atrás disso    ║
   ║  e a cota de 5.000 buscas/mês vira zero numa tarde. A chave mora     ║
   ║  aqui, como secret do Worker, e nunca chega ao cliente.              ║
   ║                                                                      ║
   ║  ── DEPLOY (uma vez) ────────────────────────────────────────────    ║
   ║   1. aistudio.google.com/apikey        → cria a chave (grátis)       ║
   ║   2. npm install -g wrangler                                         ║
   ║   3. wrangler login                                                  ║
   ║   4. wrangler kv namespace create CACHE                              ║
   ║      (cole o id devolvido no wrangler.toml)                          ║
   ║   5. wrangler secret put GEMINI_API_KEY                              ║
   ║   6. wrangler deploy                                                 ║
   ║                                                                      ║
   ║  Depois é só apontar MDF_ANALISE_URL no token.html para a URL do     ║
   ║  Worker. Detalhes em api/README.md.                                  ║
   ╚══════════════════════════════════════════════════════════════════════╝ */

/* Flash é o que fica no tier gratuito — Pro saiu do free em abril/2026. */
const MODELO = 'gemini-3.5-flash';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

/* Origens autorizadas. Sem isso, qualquer site aponta para o seu Worker
   e gasta a sua cota servindo o público dele. */
const ORIGENS = [
  'https://mundodefi.com.br',
  'https://www.mundodefi.com.br',
  'http://localhost:8123'
];

/* A análise de um token não muda de minuto a minuto, e a página é pública.
   Cachear por 24h é o que mantém o custo dentro do tier gratuito: sem isso,
   uma página que viraliza consome a cota do mês inteiro numa tarde. */
const CACHE_HORAS = 24;

/* Teto por IP, para um script não drenar a cota sozinho. */
const LIMITE_HORA = 20;

/* ═══════════════ util ═══════════════ */

function cors(origem) {
  const permitida = ORIGENS.includes(origem) ? origem : ORIGENS[0];
  return {
    'Access-Control-Allow-Origin': permitida,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function json(dados, status, origem) {
  return new Response(JSON.stringify(dados), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(origem) }
  });
}

/* Janela fixa por hora. Simples de propósito: não vale complexidade extra
   para um limite que existe só para conter abuso grosseiro. */
async function excedeuLimite(env, ip) {
  if (!env.CACHE) return false;
  const chave = `rl:${ip}:${new Date().toISOString().slice(0, 13)}`;
  const atual = parseInt(await env.CACHE.get(chave) || '0', 10);
  if (atual >= LIMITE_HORA) return true;
  await env.CACHE.put(chave, String(atual + 1), { expirationTtl: 3700 });
  return false;
}

/* ═══════════════ prompt ═══════════════ */

function montarPrompt(t) {
  return `Você é analista de criptomoedas do MundoDeFi, escrevendo para investidores brasileiros.

Use a busca do Google para checar notícias e acontecimentos recentes sobre este ativo antes de responder.

Ativo: ${t.nome} (${t.simbolo})
Preço: ${t.preco}
Variação 24h: ${t.var24h} · 7d: ${t.var7d}
Market cap: ${t.mcap} (posição #${t.rank})
Volume 24h: ${t.volume}

Escreva em português do Brasil, no máximo 450 palavras, nesta estrutura:

**📊 Cenário atual** — o que está acontecendo com o ativo agora, citando fatos recentes que você encontrou na busca.
**🏗️ Fundamentos** — o que o projeto faz, em linguagem simples. Se for um token sem utilidade clara, diga isso.
**⚖️ A favor** — 2 pontos concretos.
**⚠️ Contra** — 2 riscos concretos e específicos deste ativo, não genéricos.
**🎯 O que observar** — quais eventos ou níveis mudariam a leitura.

Regras que você não pode quebrar:
- Não recomende comprar nem vender. Não dê preço-alvo.
- Não preveja preço futuro.
- Se a busca não trouxer nada relevante e recente, diga que não há novidades no período em vez de inventar.
- Nada de linguagem de hype ("vai explodir", "oportunidade única").
- Escreva para quem está aprendendo: explique o jargão que usar.`;
}

/* ═══════════════ Gemini ═══════════════ */

async function analisar(env, token) {
  const resposta = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'x-goog-api-key': env.GEMINI_API_KEY,
      'Content-Type': 'application/json',
      'Api-Revision': '2026-05-20'
    },
    body: JSON.stringify({
      model: MODELO,
      input: montarPrompt(token),
      tools: [{ type: 'google_search' }]
    })
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    const erro = new Error(`gemini ${resposta.status}: ${corpo.slice(0, 300)}`);
    erro.status = resposta.status;
    throw erro;
  }

  const dados = await resposta.json();

  /* A Interactions API devolve `steps[]`; o texto está no passo
     model_output, e as fontes vêm como annotations url_citation. */
  let texto = '';
  const fontes = [];
  for (const passo of (dados.steps || [])) {
    if (passo.type !== 'model_output') continue;
    for (const bloco of (passo.content || [])) {
      if (typeof bloco.text === 'string') texto += bloco.text;
      for (const nota of (bloco.annotations || [])) {
        const c = nota.url_citation;
        if (c && c.url && !fontes.some(f => f.url === c.url)) {
          fontes.push({ url: c.url, titulo: c.title || c.url });
        }
      }
    }
  }

  if (!texto.trim()) throw new Error('resposta do Gemini veio sem texto');
  return { texto: texto.trim(), fontes: fontes.slice(0, 6) };
}

/* ═══════════════ handler ═══════════════ */

export default {
  async fetch(request, env) {
    const origem = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origem) });
    }
    if (request.method !== 'POST') {
      return json({ erro: 'Use POST.' }, 405, origem);
    }
    if (origem && !ORIGENS.includes(origem)) {
      return json({ erro: 'Origem não autorizada.' }, 403, origem);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ erro: 'Proxy sem chave configurada.', configurar: true }, 503, origem);
    }

    let corpo;
    try { corpo = await request.json(); }
    catch { return json({ erro: 'JSON inválido.' }, 400, origem); }

    const id = String(corpo.id || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
    if (!id) return json({ erro: 'Informe o id do token.' }, 400, origem);

    /* Cache primeiro: a maioria das visitas nunca chega ao Gemini. */
    const chaveCache = `analise:${id}`;
    if (env.CACHE) {
      const guardado = await env.CACHE.get(chaveCache, { type: 'json' });
      if (guardado) return json({ ...guardado, cacheado: true }, 200, origem);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'sem-ip';
    if (await excedeuLimite(env, ip)) {
      return json({ erro: 'Muitas análises seguidas. Tente de novo em alguns minutos.' }, 429, origem);
    }

    try {
      const resultado = await analisar(env, {
        nome: String(corpo.nome || id).slice(0, 80),
        simbolo: String(corpo.simbolo || '').slice(0, 20),
        preco: String(corpo.preco || '—').slice(0, 40),
        var24h: String(corpo.var24h || '—').slice(0, 20),
        var7d: String(corpo.var7d || '—').slice(0, 20),
        mcap: String(corpo.mcap || '—').slice(0, 40),
        rank: String(corpo.rank || '—').slice(0, 10),
        volume: String(corpo.volume || '—').slice(0, 40)
      });

      const saida = { ...resultado, em: new Date().toISOString(), modelo: MODELO };
      if (env.CACHE) {
        await env.CACHE.put(chaveCache, JSON.stringify(saida), { expirationTtl: CACHE_HORAS * 3600 });
      }
      return json({ ...saida, cacheado: false }, 200, origem);

    } catch (e) {
      /* Cota estourada é o caso esperado no tier gratuito — merece uma
         mensagem própria, para o cliente não tratar como falha genérica. */
      if (e.status === 429) {
        return json({ erro: 'Cota de análises do dia esgotada. Volte amanhã.', cota: true }, 429, origem);
      }
      return json({ erro: 'Não foi possível gerar a análise agora.' }, 502, origem);
    }
  }
};
