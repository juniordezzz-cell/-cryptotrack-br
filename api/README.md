# Proxy de análise — MundoDeFi

Worker que serve a análise dos tokens em `token.html`.

## Por que existe

O `token.html` chamava `api.anthropic.com` direto do navegador, sem chave e
sem header de versão. A requisição falhava em CORS antes mesmo da
autenticação, então **todo visitante via "⚠️ Análise indisponível"** — na
página de maior tráfego do site.

A correção não é colar uma chave no HTML. Chave de LLM é computação que
alguém paga: bots varrem HTML público atrás disso, e a cota gratuita de
5.000 buscas/mês vira zero numa tarde. Aqui a chave é um secret do Worker
e nunca chega ao cliente.

## Deploy

```bash
npm install -g wrangler
wrangler login

# 1. cria o cache (o que segura o custo dentro do tier gratuito)
wrangler kv namespace create CACHE
#    → cole o id devolvido em wrangler.toml

# 2. guarda a chave do Gemini (aistudio.google.com/apikey)
wrangler secret put GEMINI_API_KEY

# 3. sobe
wrangler deploy
```

O deploy imprime a URL, algo como
`https://mundodefi-analise.SEU-SUBDOMINIO.workers.dev`.

## Ligar no site

Em `token.html`, ajuste a constante no topo do bloco de análise:

```js
var MDF_ANALISE_URL = 'https://mundodefi-analise.SEU-SUBDOMINIO.workers.dev';
```

Enquanto ela estiver vazia, a seção de análise simplesmente **não aparece** —
nada de erro na tela para o visitante.

## Custo

| | Grátis | Uso esperado |
|---|---|---|
| Gemini + Google Search | 5.000 buscas/mês | ~100/dia com cache de 24h |
| Cloudflare Workers | 100.000 req/dia | bem abaixo |
| Cloudflare KV | 100.000 leituras/dia | bem abaixo |

O cache de 24h por token é o que mantém isso dentro do gratuito. Sem ele,
uma página que viraliza consome a cota do mês numa tarde.

## Limites embutidos

- **Origem**: só `mundodefi.com.br` e `localhost:8123`. Sem isso, qualquer
  site aponta para o seu Worker e gasta sua cota servindo o público dele.
- **20 análises por IP por hora**, para um script não drenar a cota sozinho.
- **Cota estourada** devolve 429 com mensagem própria, e o cliente mostra
  um aviso em vez de tratar como falha genérica.

## Ajustes

Tudo no topo de `worker.js`: `MODELO`, `ORIGENS`, `CACHE_HORAS`,
`LIMITE_HORA` e o prompt em `montarPrompt()`.

O prompt proíbe recomendação de compra/venda, preço-alvo e previsão de
preço. Se for mexer nele, mantenha essas restrições — é o que separa
análise de conteúdo de consultoria de investimento.
