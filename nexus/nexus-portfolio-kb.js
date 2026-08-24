/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  NEXUS · ADAPTADOR DO PORTFÓLIO                                      ║
   ║                                                                      ║
   ║  Cola entre o motor de regras (nexus-motor.js) e o widget de chat    ║
   ║  (nexus-core.js). Não contém regra nem conta: as regras estão em     ║
   ║  nexus-regras.json e as contas no PCore.                             ║
   ║                                                                      ║
   ║  A versão anterior deste arquivo calculava tudo por conta própria    ║
   ║  usando P.holdPos / P.poolLucro / P.st.hold — API que deixou de      ║
   ║  existir quando o portfólio virou modelo de eventos. Ficou quebrada  ║
   ║  em silêncio, porque só rodava para quem era PRO e abria o chat.     ║
   ║  Agora há uma fonte única de verdade e isso não pode se repetir.     ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
(function () {
  'use strict';

  var M = window.NexusMotor;
  if (!M) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[<>&]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c];
    });
  }

  var ICONE = { alerta: '⚠', atencao: '●', positivo: '✓', info: '·' };

  /* Cada achado vira um bloco com título, texto e um marcador de severidade.
     O marcador não é enfeite: é o que deixa "atenção" e "informação"
     distinguíveis numa olhada, sem depender de ler tudo. */
  function bloco(a) {
    return '<div class="nx-achado nx-' + esc(a.severidade) + '">'
      + '<div class="nx-achado-hd"><span class="nx-ico">' + (ICONE[a.severidade] || '·') + '</span>'
      + '<b>' + esc(a.titulo) + '</b></div>'
      + '<p>' + esc(a.texto) + '</p></div>';
  }

  function montar(r) {
    if (r.tipo === 'vazio' || r.tipo === 'semAchado') return '<p>' + esc(r.texto) + '</p>';
    if (r.tipo === 'naoEntendi') {
      return '<p>' + esc(r.texto) + '</p><ul class="nx-lista">'
        + (r.sugestoes || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('')
        + '</ul>';
    }
    return r.achados.map(bloco).join('');
  }

  window.NEXUS_KB = {
    nome: 'Nexus',
    /* O subtítulo diz o que ele é. "Assistente com IA" seria mentira e
       o usuário descobriria na terceira pergunta. */
    subtitulo: 'Leitura dos seus números',

    /* Chips de sugestão do chat — vêm do JSON, não daqui. */
    get sugestoes() { return M.sugestoes(); },

    fallback: [
      'Não consegui identificar o assunto dessa pergunta. Eu leio os seus números registrados — patrimônio, concentração, resultado, pools e trade.'
    ],

    /* O widget chama isto. Devolve HTML pronto.
       As regras carregam sob demanda: quem nunca abre o chat não paga
       o download do JSON. */
    answer: function (pergunta) {
      return M.carregar()
        .then(function () { return montar(M.responder(pergunta)); })
        .catch(function () {
          return '<p>Não consegui carregar minha base de regras agora. Recarregue a página e tente de novo.</p>';
        });
    },

    /* Primeira tela do chat: em vez de "olá, como posso ajudar", já entra
       dizendo o que viu. Se não houver nada a dizer, aí sim cumprimenta. */
    abertura: function () {
      return M.carregar().then(function () {
        var f = M.fatos();
        if (!f.temDados) {
          return '<p>' + esc((M.regrasCarregadas() || {}).mensagens.semDados) + '</p>';
        }
        var p = M.panorama(3);
        if (!p.length) return '<p>Olhei seus números e está tudo em ordem. Pergunte o que quiser sobre a carteira.</p>';
        return '<p class="nx-intro">Olhei seus números agora. O que me chamou atenção:</p>' + p.map(bloco).join('');
      }).catch(function () {
        return '<p>Não consegui carregar minha base de regras agora.</p>';
      });
    }
  };
})();
