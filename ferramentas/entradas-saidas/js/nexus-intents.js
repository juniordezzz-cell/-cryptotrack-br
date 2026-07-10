/* ============================================================
   NEXUS — Base de conhecimento (edite aqui sem tocar na lógica)
   ------------------------------------------------------------
   Este arquivo é o "JSON" do Nexus. Está em .js (objeto dentro
   de window.NEXUS_KB) porque navegadores bloqueiam fetch() de
   .json local quando o site é aberto direto do arquivo — assim
   funciona tanto local quanto no Netlify/GitHub Pages.

   Para adicionar frases novas, é só mexer nos arrays abaixo.
   {valor}, {termo}, {periodo}, {qtd} são preenchidos pela lógica.
   ============================================================ */

window.NEXUS_KB = {
  version: 1,

  nome: "Nexus",
  subtitulo: "Analista financeiro do Mundo DeFi",

  saudacoes: [
    "E aí! Sou o Nexus, seu analista financeiro. Me pergunta coisas como \"quanto gastei com mercado esse mês?\" que eu respondo na hora.",
    "Olá! Nexus na área. Posso calcular seus gastos, entradas, saldo e muito mais. Manda a pergunta!"
  ],

  /* Chips de sugestão que aparecem no chat */
  sugestoes: [
    "Quanto gastei esse mês?",
    "Quanto entrou esse mês?",
    "Qual meu maior gasto?",
    "Como está minha reserva de emergência?",
    "O que falta pagar na lista de compras?"
  ],

  /* Quando o Nexus não entende a pergunta */
  fallback: [
    "Hmm, essa eu ainda não sei responder. Tenta algo como: \"quanto gastei com {exemplo} nos últimos 3 meses?\"",
    "Não entendi essa. Eu sou bom em: gastos por categoria, entradas, saldo, maior gasto, reserva de emergência e lista de compras. Reformula pra mim?"
  ],

  /* ---------- INTENÇÕES ----------
     keywords: se QUALQUER grupo bater, a intenção é ativada.
     Cada grupo é uma lista de palavras que precisam aparecer JUNTAS.
     Os textos são normalizados (sem acento, minúsculo) antes de comparar. */
  intents: [
    {
      id: "gasto",
      keywords: [["quanto", "gastei"], ["quanto", "gasto"], ["gastei", "com"], ["gastos", "com"], ["gasto", "com"], ["quanto", "saiu"], ["total", "de", "gastos"], ["total", "de", "despesas"], ["quanto", "gastamos"]],
      respostas: {
        comTermo: "Você gastou {valor} com \"{termo}\" {periodo} ({qtd}).",
        semTermo: "Suas despesas {periodo} somam {valor} ({qtd}).",
        nadaEncontrado: "Não encontrei nenhum gasto com \"{termo}\" {periodo}. Confere se o nome bate com a categoria ou a descrição que você cadastrou em Despesas.",
        semRegistros: "Você ainda não tem despesas cadastradas {periodo}. Registra na aba Despesas que eu passo a calcular tudo."
      }
    },
    {
      id: "entrada",
      keywords: [["quanto", "entrou"], ["quanto", "ganhei"], ["quanto", "recebi"], ["total", "de", "entradas"], ["minhas", "entradas"], ["quanto", "faturei"]],
      respostas: {
        comTermo: "Entrou {valor} de \"{termo}\" {periodo} ({qtd}).",
        semTermo: "Suas entradas {periodo} somam {valor} ({qtd}).",
        nadaEncontrado: "Não achei entradas de \"{termo}\" {periodo}.",
        semRegistros: "Nenhuma entrada registrada {periodo}. Cadastra na aba Entradas!"
      }
    },
    {
      id: "saldo",
      keywords: [["saldo"], ["quanto", "sobrou"], ["quanto", "sobra"], ["sobrou"], ["sobrou", "quanto"], ["estou", "no", "azul"], ["estou", "no", "vermelho"]],
      respostas: {
        positivo: "{periodo} entrou {entradas} e saiu {saidas}: você está no azul com {valor} de saldo. 💚",
        negativo: "{periodo} entrou {entradas} e saiu {saidas}: você está no vermelho em {valor}. Bora olhar os gastos não essenciais?",
        zerado: "{periodo} entradas e saídas empataram: {entradas} contra {saidas}. Saldo zero."
      }
    },
    {
      id: "maior_gasto",
      keywords: [["maior", "gasto"], ["mais", "gastei"], ["onde", "gastei", "mais"], ["gastei", "mais", "com"], ["categoria", "que", "mais"]],
      respostas: {
        resultado: "Seu maior gasto {periodo} foi com {termo}: {valor} ({pct}% de tudo que saiu). O maior lançamento individual foi \"{maiorItem}\" de {maiorValor}.",
        semRegistros: "Sem despesas {periodo} pra analisar ainda."
      }
    },
    {
      id: "reserva",
      keywords: [["reserva"], ["emergencia"], ["fundo", "de", "emergencia"]],
      respostas: {
        comMeta: "Sua reserva ideal é {meta} (6 meses dos gastos essenciais do seu orçamento). Você tem {atual} guardado — {pct}% do caminho. Faltam {falta}.",
        completa: "Reserva completa! Você tem {atual} e a meta era {meta}. Agora é focar nos investimentos. 🚀",
        semOrcamento: "Pra eu calcular sua reserva ideal, preenche seus gastos essenciais na aba Entradas x Saídas. A conta é 6 meses de gastos essenciais."
      }
    },
    {
      id: "orcamento",
      keywords: [["orcamento"], ["planejado"], ["vai", "sobrar"], ["quanto", "posso", "gastar"], ["renda", "comprometida"]],
      respostas: {
        resultado: "Pelo seu orçamento: entradas de {entradas}, saídas de {saidas} — planejado pra sobrar {sobra} por mês ({pct}% da renda comprometida).",
        negativo: "Atenção: pelo seu orçamento as saídas ({saidas}) passam as entradas ({entradas}) em {sobra}. Vale revisar os não essenciais na aba Entradas x Saídas.",
        semOrcamento: "Você ainda não montou seu orçamento. Preenche a aba Entradas x Saídas que eu te dou esse raio-x."
      }
    },
    {
      id: "lista_compras",
      keywords: [["lista", "de", "compras"], ["falta", "pagar"], ["contas", "pendentes"], ["o", "que", "falta"]],
      respostas: {
        pendentes: "Na sua lista de compras faltam {qtd} somando {valor}: {itens}.",
        vazia: "Lista de compras zerada — nada pendente. 👊",
        tudoPago: "Tudo pago na lista de compras! {qtd} concluídos."
      }
    },
    {
      id: "ajuda",
      keywords: [["ajuda"], ["o", "que", "voce", "faz"], ["o", "que", "vc", "faz"], ["como", "funciona"], ["help"], ["comandos"]],
      respostas: {
        texto: "Eu leio os dados que você cadastra na ferramenta e respondo na hora. Exemplos do que posso calcular:\n• \"Quanto gastei com mercado nos últimos 3 meses?\"\n• \"Quanto entrou em junho?\"\n• \"Qual meu saldo esse mês?\"\n• \"Onde gastei mais?\"\n• \"Como está minha reserva de emergência?\"\n• \"O que falta pagar na lista de compras?\""
      }
    }
  ],

  /* Palavras ignoradas na hora de extrair o termo de busca
     (ex.: em "quanto gastei com ifood", sobra só "ifood") */
  stopwords: [
    "quanto", "gastei", "gasto", "gastos", "gastamos", "saiu", "com", "de", "do", "da", "dos", "das",
    "no", "na", "nos", "nas", "em", "e", "o", "a", "os", "as", "um", "uma", "total", "despesas", "despesa",
    "entrou", "ganhei", "recebi", "entradas", "entrada", "faturei", "minhas", "meus", "meu", "minha",
    "esse", "este", "essa", "esta", "mes", "meses", "ano", "anos", "ultimo", "ultima", "ultimos", "ultimas",
    "passado", "passada", "atual", "hoje", "ontem", "semana", "durante", "entre", "ate", "que", "qual",
    "foi", "foram", "eu", "ja", "tem", "tive", "por", "pra", "para", "valor", "dinheiro", "reais", "rs"
  ]
};
