# Proxy de IA — não está em uso

> **Nenhuma página chama isto hoje.**
>
> Foi escrito para a análise de tokens, que depois saiu do produto. Fica
> como implementação de referência para o dia em que o Nexus ganhar uma
> camada de IA opcional.

## O "espaço para API" do Nexus não é este Worker

É o `nexus-core.js`:

```js
NEXUS_CORE_CONFIG.mode = "api";
NEXUS_CORE_CONFIG.api.endpoint = "https://...";
```

O chat envia `POST { question, context }` e espera `{ answer }`. O contexto
já vai com os fatos completos do portfólio (`NexusMotor.fatos()`). Se a API
falhar, cai sozinho no motor de regras local.

O Nexus é determinístico **por escolha**: para dinheiro, regra auditável
ganha de texto gerado — responde igual toda vez, não inventa número e cada
afirmação é rastreável até a conta. Uma eventual IA seria camada extra,
nunca substituta do motor.

## Se um dia for ligar

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
