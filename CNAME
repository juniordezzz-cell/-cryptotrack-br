# CLAUDE.md — Mundo DeFi

Este arquivo orienta o Claude Code ao trabalhar neste projeto. Leia antes de qualquer alteração.

## Sobre o projeto

**Mundo DeFi** (mundodefi.com.br | @mundodefi) é uma plataforma brasileira de conteúdo e ferramentas DeFi, com dados de mercado, rastreamento de portfólio, calculadoras e um centro educacional. O público é brasileiro — **todo o conteúdo visível ao usuário deve estar em português (pt-BR)**.

A plataforma tem três níveis de assinatura: **Free**, **PRO** e **Premium**. Conteúdos PRO ficam atrás de paywall (gating no front-end).

## Identidade visual (obrigatória)

Sempre seguir esta paleta e tipografia em qualquer página ou componente novo:

- **Fundo principal:** `#0a0a0a` (dark theme sempre — nunca criar versão clara sem pedido explícito)
- **Cor primária / destaque:** roxo neon `#9945ff`
- **Cor secundária:** verde Solana `#14f195`
- **Tipografia:** Space Grotesk (Google Fonts)
- Estilo geral: moderno, cripto-nativo, alto contraste, sem poluição visual

No dashboard de portfólio e em apps de tracking, o layout de referência é o **Investidor10** (cards de resumo no topo, gráficos, tabela de alocação, feed de transações). Verde de lucro usado em dashboards: `#00c853`.

## Stack técnica

- **HTML + CSS + JS puro (vanilla)** — sem frameworks (não usar React, Vue, Tailwind etc. a não ser que seja pedido)
- Preferência por **arquivos HTML autocontidos** (CSS e JS no mesmo arquivo quando fizer sentido)
- **Firebase:** Auth para login e Firestore para dados do usuário
- **localStorage** para persistência local e compartilhamento de dados entre páginas
- **Deploy:** Netlify conectado ao GitHub (edições geralmente via GitHub web editor — manter código legível e organizado)

## Estrutura de arquivos principais

- `index.html` — página principal (busca de tokens com autocomplete em tempo real, ticker de preços, seções de ferramentas e PRO)
- `estudos.html` — portal editorial de estudos/artigos, formato de leitura, com gating de conteúdo PRO
- `portfolio.html` — dashboard geral do portfólio
- `hold.html` — carteira de hold
- `defi.html` — posições DeFi
- `trade.html` — operações de trade

As quatro páginas de portfólio **compartilham dados via localStorage e Firestore** — qualquer mudança na estrutura de dados de uma delas precisa ser refletida nas outras. Nunca alterar chaves do localStorage ou esquema do Firestore sem verificar o impacto nos outros arquivos.

## Regras de trabalho

1. **Mudanças incrementais e mensuráveis** — nunca redesenhar uma página inteira sem pedido explícito. Prefiro melhorias pontuais que eu consiga avaliar uma a uma.
2. **Antes de editar, ler o arquivo inteiro** e entender as dependências (localStorage, Firestore, funções compartilhadas).
3. **Não quebrar o que funciona** — autocomplete de busca, ticker de preços e sistema de portfólio são funcionalidades críticas.
4. **Explicar o que foi mudado** em resumo curto ao final de cada alteração (o quê, onde e por quê).
5. **Sugestões de design são bem-vindas** — pode agir como designer e propor melhorias de hierarquia visual, espaçamento, CTAs e conversão, mas implementar só depois da minha aprovação quando a mudança for grande.
6. **SEO básico:** páginas novas devem ter `<title>`, meta description e tags Open Graph em português.
7. **Responsividade:** tudo precisa funcionar bem no mobile — grande parte do tráfego vem do Instagram.

## Contexto de conteúdo

Áreas de melhoria já mapeadas no site: hero section, estabilidade do ticker de preços, enquadramento da seção PRO, prova social, posicionamento de CTAs, visual dos cards de ferramentas e SEO/Open Graph.

O projeto também produz **carrosséis para Instagram** a partir de HTML (workflow de screenshot no navegador). Slides de carrossel seguem a mesma identidade visual do site, em formato 1080x1350.

## O que NÃO fazer

- Não adicionar frameworks ou build steps (Webpack, Vite etc.)
- Não criar tema claro
- Não usar inglês em textos visíveis ao usuário
- Não remover ou renomear chaves do localStorage existentes
- Não fazer redesigns completos sem aprovação
