# IMD — Índice Mundo DeFi

Diagnóstico adaptativo de conhecimento em cripto/DeFi. 100% HTML + CSS + JS puro,
sem IA e sem backend. Calcula um índice de **0 a 100** a partir de 4 pilares e salva
no Firebase (login Google). Roda em **GitHub Pages**.

## Estrutura

```
imd-mundodefi/
├── index.html          → landing ("Começar diagnóstico")
├── quiz.html           → quiz adaptativo + confete na conclusão
├── resultado.html      → IMD + perfil + login + consentimento + salvar
├── css/style.css       → visual dark premium (identidade MundoDeFi)
├── js/
│   ├── motor.js        → núcleo: estado, árvore adaptativa, cálculo do IMD
│   ├── app.js          → utilitários + telas landing e resultado
│   ├── quiz-ui.js      → tela do quiz (render, progresso, voltar)
│   └── firebase.js     → login Google + salvar no Firestore
├── data/
│   ├── perguntas.json  → banco de perguntas (com condições adaptativas)
│   ├── competencias.json
│   └── regras.json     → pilares, pesos, penalidades e perfis
├── assets/confetti.js  → confete da conclusão
└── firebase/config.js  → COLE AQUI as chaves do seu Firebase
```

## Como funciona o índice

| Pilar | Peso |
|---|---|
| 🛡 Segurança | 25% |
| 📚 Fundamentos | 20% |
| 🌐 DeFi | 30% |
| ⚙️ Autonomia | 25% |

- **IMD** = média ponderada dos 4 pilares.
- **Penalidade de segurança:** se Segurança < 40, o IMD final é multiplicado por 0,85
  (saber muito sem se proteger é arriscado).
- **Teto de autonomia:** se Autonomia < 30, o IMD máximo fica em 70.
- **Perfis:** 0–25 Iniciante Absoluto · 26–50 Explorador · 51–75 Usuário Ativo ·
  76–90 Avançado · 91–100 Nativo DeFi.

Tudo isso está em `data/regras.json` — dá pra ajustar pesos, penalidades e perfis
sem mexer no código. As perguntas e a lógica adaptativa estão em `data/perguntas.json`
(campo `condicao` libera perguntas avançadas só pra quem acerta as anteriores).

## Ativar o Firebase (login + salvar)

Sem isso o app roda em **modo local**: o diagnóstico funciona 100%, só não salva.
Para ativar, abra `firebase/config.js` e cole as chaves do **mesmo projeto Firebase do
MundoDeFi** (Console → Configurações do projeto → Seus apps → SDK config). No Console,
habilite **Authentication → Google** e o **Firestore**. Os diagnósticos são salvos em:

```
users/{uid}/diagnosticos/{id}
```

## Publicar e plugar no site

1. Coloque a pasta `imd-mundodefi` dentro do seu repositório (ex.: em `/ferramentas/imd/`).
2. Suba pelo **GitHub Desktop** (links internos são relativos, então a pasta funciona
   em qualquer subpasta).
3. No seu `index.html`, aponte um botão para a landing do IMD, ex.:
   `<a href="/ferramentas/imd/index.html">Descubra seu IMD</a>`

> ⚠️ Teste pelo **GitHub Pages**, não por duplo-clique: o navegador bloqueia leitura de
> JSON via `file://`, então localmente a página do quiz fica em branco — no site no ar,
> funciona normalmente.
