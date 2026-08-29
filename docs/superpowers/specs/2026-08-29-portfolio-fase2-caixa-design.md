# Portfólio · Fase 2 — Caixa, movimentações e coerência (design)

> **Fase 2 de 3** do rework do portfólio do MundoDeFi, trazendo ideias do
> Atlas (produto premium separado) **sem copiar**.
>
> - Fase 1 ✅ — layout e navegação (topo + restyle). Concluída.
> - **Fase 2 (este spec) — caixa por carteira, movimentações e supervisor.**
> - Fase 3 — áreas novas: RWA e Meta.

## O problema

Hoje o portfólio registra **posições**, mas não registra **dinheiro parado**.
Consequências reais:

1. **Dá para abrir posição do nada.** Nada impede registrar uma compra de
   $10.000 numa carteira onde nunca entrou um dólar. O sistema aceita e
   passa a exibir um patrimônio que não tem origem.
2. **Não existe depósito nem saque.** O que entrou de fora e o que saiu para
   fora não são fatos registrados — então "quanto eu já pus aqui" é uma
   pergunta sem resposta.
3. **Não existe transferência entre carteiras.** Mover valor da corretora
   para a cold wallet é impossível de representar; a pessoa apaga de um lado
   e recria do outro, e o histórico mente.
4. **Ninguém confere as contas entre si.** Cada número está certo
   isoladamente; a incoerência só aparece com dois lado a lado.

## O que NÃO fazer (lição do Atlas, e do próprio código)

- **Não criar um segundo livro-razão.** `st.mov` já é o livro: `C.TIPOS`
  declara o efeito de cada evento no dinheiro (`sinal`: −1 saiu capital para
  a posição, +1 voltou), `C.addMov` grava com `seq` para ordem estável, e
  todo movimento já carrega `cart`. **O caixa é derivado daí.**
- **Caixa nunca é variável gravada.** Não existe `setCaixa`. É sempre a soma
  do livro, recalculada na leitura — assim não tem como divergir do extrato
  que o produziu.
- **O supervisor não recalcula, confere.** Se ele recalcular, vira uma
  segunda fonte de verdade — exatamente o defeito que ele existe para achar.
- **Arredondamento é da tela, nunca da camada de dados.**

## Decisão comercial (do dono)

**Caixa é grátis; transferência entre carteiras é PRO.**

- **Grátis:** caixa da carteira, depósito, saque, swap, o bloqueio "não dá
  para investir sem ter dinheiro" e o supervisor. Todo mundo ganha contas
  que fecham.
- **PRO:** transferência **entre** carteiras — que só existe com 2+
  carteiras, e ter 2+ carteiras já é a trava do PRO hoje
  (`PLANOS.gratis.carteiras = 1`).

Consequência de desenho: **a transferência não precisa de trava nova.** Ela
só aparece quando `st.carteiras.length >= 2`, e chegar em 2 já passa pelo
`P.limCart()`/`P.upsell()` existente. Inventar um segundo portão seria
paywall duplicado no mesmo recurso.

## Modelo

### Tipos novos em `C.TIPOS`

| tipo | grupo | sinal (caixa) | externo | rótulo |
|---|---|---|---|---|
| `deposito` | `caixa` | +1 | **true** | Depósito |
| `saque` | `caixa` | −1 | **true** | Saque |
| `transf` | `caixa` | 0 (duas pernas) | false | Transferência |
| `swap` | `caixa` | 0 | false | Troca de ativo |

`externo` marca o que é fluxo de caixa do portfólio (base do XIRR).
**Só depósito e saque mudam o patrimônio total** — todo o resto redistribui.
Isso corrige o XIRR: hoje ele usa compra/venda como proxy de aporte; com
depósito e saque explícitos, o aporte passa a ser o fato registrado.

### Transferência: duas pernas, um id

Uma transferência é **um evento com duas pernas** (`transf` na origem com
`sinal −1` e `transf` no destino com `sinal +1`), unidas pelo mesmo `ref`.
Nunca duas movimentações soltas: se uma perna sumir, o supervisor acusa, e
apagar a transferência apaga as duas.

### Caixa derivado

```js
C.caixaDe(st, cartId)   // Σ (sinal × usd) dos movimentos daquela carteira
```

O `sinal` que já existe em `C.TIPOS` **já é** o efeito no caixa para todos os
tipos atuais (−1 = saiu para a posição, +1 = voltou). Os tipos novos entram
na mesma régua. Nenhum tipo existente muda de sinal.

### A trava de caixa

**Carteira sem caixa não abre posição.** A verificação vive na **camada de
dados** (onde a posição é criada), não na tela — assim vale para importação,
restauração de backup e qualquer tela futura. A tela também checa, mas só
para poder dizer **quanto falta**.

O primeiro passo de qualquer carteira passa a ser um **depósito**.

### Dados que já existem

Portfólio criado antes desta fase tem posições sem nenhum evento de caixa
que as explique. A resposta é uma **abertura de saldo**: um `deposito`
automático, datado do primeiro evento da carteira, com nota explicando a
origem — e que **some sozinha** quando não há o que migrar. Sem isso, todo
usuário atual abriria o portfólio com caixa negativo e alertas falsos.

## O supervisor

`portfolio/portfolio-supervisor.js` — **confere, não calcula.**

| Verificação | A pergunta |
|---|---|
| capital × caixa | o que saiu do caixa virou posição? |
| patrimônio | caixa + investido = depositado − sacado + resultado |
| transferência | as duas pernas existem e somam zero? |
| carteira | carteira apagada com dinheiro dentro; caixa negativo |
| tela | o KPI exibido é o que os dados dizem? |

Regras:

- **Conserta uma coisa só:** cache derivado, reescrito a partir da fonte.
  Divergência que não seja cópia velha ele **relata e não toca** — ajustar
  número para a conta fechar apaga o sintoma e mantém a causa.
- **Diz quando não pôde conferir.** Sem fonte para comparar, o resultado é
  `null` e a tela escreve "não conferido" — nunca "tudo certo". Um
  verificador que tranquiliza sobre o vazio é pior que nenhum.
- **Fica calado no uso normal.** Só acende o que não se resolve esperando:
  capital que não bate com o caixa, patrimônio que não fecha com o extrato,
  carteira apagada com dinheiro dentro, caixa negativo.

## Telas

- **Carteiras** (novo bloco no dashboard, expandido): cada carteira mostra
  **Investido / Caixa** com a barra — o que a fase 1 deixou pronto e não
  pôde preencher.
- **Extrato da carteira:** o livro daquela carteira, em ordem, com saldo
  corrente. É a prova de que o caixa é consequência dos eventos.
- **Ações:** Depositar, Sacar, Transferir (PRO), Swap.
- **Supervisão:** um painel discreto em Configurações; o sino só acende o
  que é incoerência de verdade.

## Fora de escopo

- RWA e Meta (fase 3).
- Multi-moeda no armazenamento: tudo continua em USD, conversão é
  apresentação.
- Preço histórico por data (`emData`) — o portfólio já pede o preço à mão
  quando não conhece o ativo.

## Verificação

- **Testes novos em `dev/testar.mjs`** para a matemática do caixa: soma de
  eventos, transferência que fecha em zero, bloqueio sem saldo, abertura de
  saldo na migração, e a invariante `caixa + investido = depositado − sacado
  + resultado`.
- `node dev/testar.mjs` verde (444 atuais + os novos).
- Browser: as 4 telas, **estado vazio e com dados**, desktop e mobile,
  console limpo. (A fase 1 falhou justamente por não checar estado vazio e
  larguras intermediárias — aqui isso é obrigatório.)
- `node dev/versionar.mjs` ao fim.

## Deploy

Merge na `main` publica no GitHub Pages — **só com o "vai" do dono.**
