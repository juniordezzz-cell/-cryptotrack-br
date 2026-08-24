/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  RODA TODAS AS SUÍTES DE TESTE                                       ║
   ║                                                                      ║
   ║      node dev/testar.mjs                                             ║
   ║                                                                      ║
   ║  Três arquivos separados existiam e ninguém rodava os três. Um       ║
   ║  comando só, com saída resumida e código de saída 1 se algo          ║
   ║  falhar — para dar para usar antes de subir qualquer coisa.          ║
   ║                                                                      ║
   ║  Passe --detalhe para ver a saída completa de cada suíte.            ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const detalhe = process.argv.includes('--detalhe');

const SUITES = [
  ['Portfólio — matemática do núcleo', 'portfolio/testes/teste-core.js'],
  ['Ferramentas — matemática do núcleo', 'ferramentas/testes/teste-core.js'],
  ['IMD — motor de pontuação', 'ferramentas/testes/teste-imd.js']
];

let totalOk = 0, houveFalha = false;
console.log('');

for (const [nome, arquivo] of SUITES) {
  const caminho = path.join(RAIZ, arquivo);
  if (!fs.existsSync(caminho)) {
    console.log('  ??  ' + nome.padEnd(40) + 'arquivo nao encontrado');
    houveFalha = true;
    continue;
  }
  let saida = '', falhou = false;
  try {
    saida = execFileSync('node', [caminho], { cwd: RAIZ, encoding: 'utf8' });
  } catch (e) {
    saida = (e.stdout || '') + (e.stderr || '');
    falhou = true;
  }
  if (detalhe) console.log(saida);

  const m = saida.match(/TODOS OS (\d+) TESTES PASSARAM/);
  const f = saida.match(/(\d+) DE (\d+) FALHARAM/);
  if (m && !falhou) {
    totalOk += Number(m[1]);
    console.log('  ok  ' + nome.padEnd(40) + m[1] + ' testes');
  } else {
    houveFalha = true;
    console.log('  XX  ' + nome.padEnd(40) + (f ? f[0] : 'erro ao rodar'));
    if (!detalhe) {
      /* mostra so as linhas que falharam, para nao inundar a tela */
      saida.split('\n').filter(l => /FALHOU|Error|error/.test(l))
        .slice(0, 12).forEach(l => console.log('        ' + l.trim()));
    }
  }
}

console.log('');
console.log(houveFalha
  ? '  ALGUMA COISA FALHOU — nao suba assim. Rode com --detalhe para ver tudo.'
  : '  ' + totalOk + ' testes passaram.');
console.log('');
process.exit(houveFalha ? 1 : 0);
