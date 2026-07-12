# Ferramentas PRO — MundoDeFi

Documento de referência interna. Não é linkado no site — é só pra você (Jeferson) não se perder na hora de decidir o que é gratuito e o que é PRO.

## Regra geral

- **Toda ferramenta PRO é navegável por qualquer visitante** ("modo vitrine"): a pessoa vê a interface, os campos preenchidos com dados de demonstração e os resultados calculados.
- **Só quem está logado E é PRO/Premium pode editar** os campos, arrastar, registrar dados etc.
- Quem tenta mexer sem ser PRO recebe um toast explicando e um banner roxo no topo convidando a assinar.
- Seu UID de admin (`y4uE6R6YalRR0K3u1lgV0ww93VB3`) sempre libera automaticamente, sem precisar de ativação manual — a checagem é 100% via Firebase Auth + campo `plano` no Firestore, nunca manual.

## Status atual das ferramentas

| Ferramenta | Status | Observação |
|---|---|---|
| Entradas e Saídas | 🔒 PRO | Dados salvos na nuvem (Firestore) quando PRO |
| Simulador de Trade | 🔒 PRO | Inclui gráfico de candles com linhas arrastáveis (também travado) |
| Juros Compostos | 🆓 Grátis | |
| Lucro Cripto | 🆓 Grátis | |
| Pool de Liquidez | 🆓 Grátis | |
| Staking | 🆓 Grátis | |
| Conversor | 🆓 Grátis | |
| Câmbio | 🆓 Grátis | |
| Comparador de Ativos | 🆓 Grátis | |

> Atualize esta tabela sempre que decidir tornar uma nova ferramenta PRO.

## Como aplicar o gating PRO numa ferramenta nova

1. Inclua os dois scripts, **nesta ordem**, antes do seu script da ferramenta (ou logo depois, tanto faz, desde que `nexus-auth.js` venha antes de `pro-gate.js`):
   ```html
   <script src="/nexus/nexus-auth.js"></script>
   <script src="/pro-gate.js"></script>
   ```
2. Marque com o atributo `data-mdf-lock-zone` qualquer bloco que só deve ser editável por PRO. Pode ser um card inteiro, uma seção, ou vários blocos separados — cada um recebe seu próprio selo "👑 Exclusivo PRO" e fica com `pointer-events:none` até a pessoa virar PRO.
3. Adicione ao CSS da página (ou ao CSS compartilhado) as classes `.pro-banner`, `.pro-banner-icon`, `.pro-banner-text`, `.pro-banner-btn`, `body.mdf-locked [data-mdf-lock-zone]` e `body.mdf-locked [data-mdf-lock-zone]::after` — copie do `simulador-de-trade.html` ou do `css/styles.css` do portfólio.
4. Pronto. O `pro-gate.js` cuida do resto: escuta o evento `nexus-auth-changed`, decide o estado (`carregando` / `deslogado` / `gratis` / `pro`) e trava ou libera a zona automaticamente.

### Ganchos opcionais

Se a ferramenta precisar reagir à mudança de status (ex.: ligar/desligar salvamento em nuvem, como faz o Entradas e Saídas), use:

```js
window.MdfProGate.onProChange(function (user) {
  // ativar recurso exclusivo, ex.: FinanceUtils.ativarNuvem(user.uid)
});
window.MdfProGate.onFreeChange(function (estado) {
  // desativar recurso, ex.: FinanceUtils.desativarNuvem()
});
```

Isso é opcional — a maioria das ferramentas PRO (como o Simulador de Trade) só precisa do trava/destrava visual, sem lógica extra.

## Cores e convenção

- **PRO = roxo** (`--purple` / `#9945FF`). Nunca usar dourado para o selo PRO — dourado é reservado para Premium/Mentoria.
- Selo de bloqueio: `👑 Exclusivo PRO`, fundo roxo translúcido.
- Banner de conversão: fundo roxo translúcido, texto claro, CTA roxo sólido para `/planos.html`.
