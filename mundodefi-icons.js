/* Ícones vetoriais da interface. Traços consistentes, sem dependências externas. */
(function () {
  'use strict';
  var paths = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    portfolio: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>',
    hold: '<path d="m12 2 9 7-9 13L3 9l9-7Z"/><path d="M3 9h18M8 9l4 13 4-13M8 9l4-7 4 7"/>',
    defi: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3-4 6-4 9s1 6 4 9M12 3c3 3 4 6 4 9s-1 6-4 9"/>',
    trade: '<path d="M3 17 9 11l4 4 8-9M15 6h6v6"/>',
    rwa: '<path d="m3 10 9-7 9 7M4 10h16M6 10v9m4-9v9m4-9v9m4-9v9M3 21h18"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h2"/>',
    chart: '<path d="M3 3v18h18M6 16l4-5 3 2 5-7"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    pool: '<circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/><path d="M11 12h2"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9 9h5a2 2 0 0 1 0 4h-4a2 2 0 0 0 0 4h5M12 6v3m0 8v2"/>',
    balance: '<path d="M12 3v17M5 7h14M3 7l3 7H0l3-7Zm18 0 3 7h-6l3-7ZM8 21h8"/>',
    exchange: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4 4-2Z"/>',
    calculator: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2"/>',
    sliders: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    shield: '<path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/>'
  };
  var map = { '📊':'dashboard', '💼':'portfolio', '💎':'hold', '🌊':'defi', '⚡':'trade', '🏛':'rwa', '🎯':'target', '💰':'wallet', '📈':'chart', '🔒':'lock', '💧':'pool', '🪙':'coin', '⚖️':'balance', '🔄':'exchange', '💱':'exchange', '💵':'wallet', '🧭':'compass', '🧰':'calculator', '📋':'sliders', '🚀':'chart', '🛠️':'calculator', '🛡':'shield' };
  function svg(name) {
    var path = paths[name] || paths.dashboard;
    return '<svg class="mdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + path + '</svg>';
  }
  function emoji(value) { return svg(map[value] || value); }
  window.MDFIcons = { svg: svg, emoji: emoji };
})();
