# Portfólio · Fase 3 — RWA e Meta (design)

> **Fase 3 de 3** do rework do portfólio do MundoDeFi.
>
> - Fase 1 ✅ — layout e navegação (topo + restyle). No ar.
> - Fase 2 ✅ — caixa, movimentações e supervisor. No ar.
> - **Fase 3 (este spec) — RWA e Meta**, hoje abas desativadas com selo "breve".

## O problema

Duas abas prometem algo que não existe. Quem clica não vê nada — é a única
parte do portfólio que o usuário enxerga e não pode usar.

## Decisões do dono

1. **RWA = AÇÃO TOKENIZADA.** NVDA, GOOGL, AAPL, TSLA via xStocks, Ondo,
   Backed. **Não** é imóvel, CDB nem ação fora da blockchain — é ação
   comprada pelos trilhos da cripto.
2. **Meta = alvo + plano de aporte.** A pessoa diz quanto quer ter e até
   quando; o sistema calcula quanto precisa aportar por mês e avisa quando o
   ritmo real fica abaixo disso.
3. **Comercial: as duas são do plano grátis** (decisão do controlador pela
   estratégia registrada de "grátis generoso"; sujeita a veto do dono). O PRO
   segue vendendo o que já vende: carteiras separadas, Nexus sobre os próprios
   números, exportação CSV e as duas ferramentas PRO.

## RWA

**RWA aqui = ação tokenizada.** NVDA, GOOGL, AAPL, TSLA compradas pelos
trilhos da cripto — xStocks, Ondo, Backed e afins. Não é imóvel, não é CDB,
não é título fora da blockchain.

### É o HOLD, em aba separada

A matemática é a mesma do HOLD: compra, venda, preço médio ponderado, lucro
realizado e não realizado. A mesma cadeia de preço (API quando o token é
conhecido, preço à mão quando não é, como o HOLD já faz com `lastAt: null`).

**Então por que aba separada, e não dentro do HOLD?** Porque é outra decisão
de investimento. Quem compra NVDA tokenizada não está fazendo a mesma coisa
que quem compra SOL, e misturar as duas na mesma tabela esconde de qual lado
o patrimônio está. A separação é de leitura, não de motor.

### Campos

`st.rwa = []`, no padrão dos irmãos (`pools`/`lend`/`trades`). Cada item:

| Campo | Para quê |
|---|---|
| `tk` | O token (ex.: `NVDAx`) |
| `nome` | A ação que ele representa (ex.: Nvidia) — sem isso a tabela vira sopa de ticker |
| `plataforma` | Quem emitiu: xStocks, Ondo, Backed. É o risco de contraparte desta classe, e a pessoa tem direito de ver de quem depende |
| `cg`, `last`, `lastAt` | Preço, igual ao HOLD |
| `cart` | Carteira, igual ao resto |

Nada de vencimento nem de rendimento declarado — isso era coisa de título, e
ação tokenizada não tem.

### Movimentos

Entram no livro que já existe (`st.mov`), com dois tipos novos:

| tipo | grupo | sinal (caixa) | externo | rótulo |
|---|---|---|---|---|
| `rwa_compra` | `rwa` | −1 | false | Compra de ação tokenizada |
| `rwa_venda` | `rwa` | +1 | false | Venda de ação tokenizada |

`externo: false` porque, desde a fase 2, o fluxo externo do portfólio é
**depósito e saque** — comprar ação tokenizada é redistribuição entre caixa e
posição. Marcá-la como externa repetiria o bug de XIRR que a fase 2 corrigiu.

A trava de caixa da fase 2 vale aqui: **não se compra sem saldo.**

### Soma no total

O valor do RWA entra no **patrimônio total** do dashboard e vira o quinto
pilar de KPI, ao lado de HOLD, DeFi e Trade. Uma aba que não soma seria uma
aba mentindo sobre o seu total.

## Meta

### O que ela é — e o que ela NÃO é

A Meta é **aritmética sobre os seus próprios aportes**, não uma previsão de
mercado. O sistema nunca diz "você vai chegar lá" nem projeta valorização.
Ele responde uma pergunta fechada:

> Para sair de onde estou e chegar em X até a data D, **quanto preciso
> aportar por mês** — e o meu ritmo real está acima ou abaixo disso?

Isso é a mesma linha do Nexus, que é determinístico por escolha: número que
sai de conta, não de palpite.

### As contas (todas determinísticas)

```
atual          patrimônio do escopo da meta, hoje
falta          alvo − atual
mesesRestantes meses entre hoje e o prazo
aporteNecessario = falta / mesesRestantes          (zero se já bateu)

ritmoReal      = (depósitos − saques) dos últimos 3 meses ÷ 3
                 — vem do livro da fase 2, é fato registrado
situacao       ritmoReal >= aporteNecessario ? 'no ritmo' : 'abaixo do ritmo'
```

**A honestidade obrigatória:** `aporteNecessario` assume **valor de mercado
parado**. A tela é obrigada a dizer isso — sem essa frase, o número vira
promessa. Se o mercado subir, a pessoa chega antes; se cair, depois. Nós não
adivinhamos qual.

**Quando não dá para calcular:** sem histórico de aporte suficiente (menos de
um mês de movimentações), `ritmoReal` é **nulo** e a tela escreve "ainda não
dá para medir seu ritmo" — nunca zero. Zero é uma afirmação ("você não
aportou nada"); ausência de dado não é. Mesma regra do supervisor.

**Prazo vencido:** meta cujo prazo passou não vira erro nem some — vira
"prazo encerrado", mostrando se bateu ou quanto faltou. Apagar o passado seria
esconder o resultado.

### Modelo

`st.metas = []`, cada uma:
`{ id, nome, alvo, prazo, escopo, criadaEm }`

`escopo`: `'total'` (patrimônio inteiro) ou o id de uma carteira. Várias metas
são permitidas — a pessoa tem mais de um objetivo na vida.

O alvo é armazenado em **USD**, como todo valor do sistema; a moeda escolhida
é camada de exibição (regra que o projeto já segue).

## Telas

- **RWA** (`/portfolio/rwa.html`): KPIs do módulo (valor, investido, não
  realizado, realizado — os mesmos do HOLD), tabela de posições com token,
  ação representada, plataforma, preço médio, preço atual e resultado, e as
  ações de comprar/vender usando a trava de caixa.
- **Meta** (`/portfolio/meta.html`): lista de metas, cada uma com barra de
  progresso, quanto falta, aporte necessário por mês, o ritmo real e a
  situação. Criar/editar/excluir meta.
- **Abas**: RWA e Meta deixam de ser `<span>` desativado e viram links reais;
  o selo "breve" sai.
- **Dashboard**: RWA entra como quinto pilar de KPI, e o patrimônio total
  passa a somá-lo.

## Fora de escopo

- Ativos **fora** da blockchain (imóvel, CDB, ação na corretora) — decisão explícita do dono.
- Previsão de valorização de mercado em qualquer forma.
- Provedor de dados macro — o Atlas deixou registrado por que painel macro
  decorativo é pior que nenhum, e aqui vale o mesmo.
- As duas verificações do supervisor deferidas na fase 2.

## Verificação

- **Testes novos** em `portfolio/testes/teste-core.js`, com valores calculados
  à mão: caixa correto após compra/venda de RWA; RWA somando no patrimônio;
  trava de caixa valendo para RWA; e a matemática da meta (aporte necessário,
  ritmo real, `null` quando não há histórico, prazo vencido).
- `node dev/testar.mjs` verde (497 atuais + os novos).
- Browser: as 6 telas, **estado vazio e com dados**, desktop **e** mobile,
  console limpo. Estado vazio é obrigatório — foi o que falhou na fase 1.
- `node dev/versionar.mjs` ao fim, confirmando que as páginas novas entraram
  no versionamento (senão nunca atualizam no navegador de ninguém).

## Deploy

Merge na `main` publica no GitHub Pages — **só com o "vai" do dono.**
