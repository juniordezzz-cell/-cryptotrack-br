# -*- coding: utf-8 -*-
u"""
╔══════════════════════════════════════════════════════════════════════╗
║  GERADOR DAS IMAGENS DE COMPARTILHAMENTO (og:image)                  ║
║                                                                      ║
║  ── O PROBLEMA ──────────────────────────────────────────────────    ║
║  Nenhuma página do site tinha og:image. Todo link do MundoDeFi       ║
║  colado no WhatsApp, no Twitter ou no LinkedIn aparecia como uma     ║
║  linha de texto sem imagem — e no Brasil o WhatsApp É o canal de     ║
║  compartilhamento. Link com imagem recebe muito mais clique que      ║
║  link sem, e a diferença aparece em todo link já compartilhado.      ║
║                                                                      ║
║  ── POR QUE PYTHON, SE OS OUTROS GERADORES SÃO .mjs ────────────     ║
║  WhatsApp e Twitter não renderizam SVG em og:image, então precisa    ║
║  ser PNG de verdade. A máquina tem Pillow e não tem node-canvas.     ║
║  A lista de páginas continua vindo do catálogo, via `node -e`, para  ║
║  não virar uma segunda lista escrita à mão.                          ║
║                                                                      ║
║  ── COMO RODAR ──────────────────────────────────────────────────    ║
║      python dev/gerar-og-imagens.py                                  ║
║                                                                      ║
║  Saída: /og/*.png  (1200x630, o tamanho que as redes esperam)        ║
╚══════════════════════════════════════════════════════════════════════╝
"""
import io, os, json, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SAIDA = os.path.join(RAIZ, 'og')

L, A = 1200, 630            # tamanho que Facebook, WhatsApp e Twitter esperam
MARGEM = 78

# Cores do sistema (mundodefi-tokens.css)
FUNDO      = (7, 10, 18)
SUPERFICIE = (13, 17, 28)
TEXTO      = (237, 240, 247)
TEXTO2     = (154, 163, 184)
OURO       = (245, 182, 20)
OURO_CLARO = (255, 212, 79)
ROXO       = (169, 107, 255)
CIANO      = (0, 229, 255)
VERDE      = (20, 241, 149)

F = 'C:/Windows/Fonts/'
def fonte(nome, tam):
    return ImageFont.truetype(F + nome, tam)

BOLD, REG, SEMI = 'segoeuib.ttf', 'segoeui.ttf', 'seguisb.ttf'


def catalogo():
    u"""Le o catalogo pelo Node: a fonte unica continua sendo o .js."""
    codigo = (
        "const fs=require('fs');"
        "const src=fs.readFileSync('mundodefi-catalogo.js','utf8');"
        "const w={};new Function('window',src)(w);"
        "console.log(JSON.stringify(w.MDF_CATALOGO.itens));"
    )
    saida = subprocess.check_output(['node', '-e', codigo], cwd=RAIZ)
    return json.loads(saida.decode('utf-8'))


def quebrar(texto, fnt, largura_max, desenho):
    u"""Quebra por largura real do texto, nao por contagem de caracteres."""
    palavras, linhas, atual = texto.split(), [], ''
    for p in palavras:
        teste = (atual + ' ' + p).strip()
        if desenho.textlength(teste, font=fnt) <= largura_max:
            atual = teste
        else:
            if atual:
                linhas.append(atual)
            atual = p
    if atual:
        linhas.append(atual)
    return linhas


def fundo(d, acento):
    u"""Fundo com um halo do acento no canto superior direito, para nao
       virar retangulo chapado. Circulos concentricos do maior para o menor,
       cada um um pouco mais proximo da cor de acento -- Pillow nao tem
       gradiente radial e a diferenca visual nao compensa a conta."""
    d.rectangle([0, 0, L, A], fill=FUNDO)
    cx, cy = L - 170, 120
    for i in range(30):
        raio = 560 - i * 18
        if raio <= 0:
            continue
        mistura = (i + 1) / 340.0                 # bem sutil de proposito
        cor = tuple(int(FUNDO[c] + (acento[c] - FUNDO[c]) * mistura) for c in range(3))
        d.ellipse([cx - raio, cy - raio, cx + raio, cy + raio], fill=cor)
    # faixa de superficie no rodape, por cima do halo
    d.rectangle([0, A - 132, L, A], fill=SUPERFICIE)


def marca(d, x, y, tamanho=58):
    u"""O mesmo quadrado dourado com o simbolo do bitcoin do favicon.

       Duas armadilhas encontradas desenhando isto: Georgia NAO tem o glifo
       U+20BF (o simbolo do bitcoin) e desenhava um retangulo vazio -- Arial
       Bold tem. E o "gradiente" feito com retangulos sobrepostos aparecia
       como um quadrado dentro do outro, pior que nada: virou cor chapada."""
    r = int(tamanho * 11 / 40.0)
    d.rounded_rectangle([x, y, x + tamanho, y + tamanho], radius=r, fill=OURO)
    fb = fonte('arialbd.ttf', int(tamanho * 0.72))
    d.text((x + tamanho / 2.0, y + tamanho / 2.0 + 1), u'₿',
           font=fb, fill=(36, 26, 4), anchor='mm')


def cartao(titulo, subtitulo, selo, acento):
    img = Image.new('RGB', (L, A), FUNDO)
    d = ImageDraw.Draw(img)
    fundo(d, acento)

    # ── marca, no topo ──
    marca(d, MARGEM, MARGEM - 6)
    d.text((MARGEM + 76, MARGEM + 8), 'Mundo', font=fonte(BOLD, 34), fill=TEXTO)
    largura_mundo = d.textlength('Mundo', font=fonte(BOLD, 34))
    d.text((MARGEM + 76 + largura_mundo, MARGEM + 8), 'DeFi', font=fonte(BOLD, 34), fill=acento)

    # ── titulo e subtitulo, centralizados no espaco livre ──
    # Fixar a altura deixava um buraco enorme quando o titulo tinha uma
    # linha so. O bloco agora e' medido antes e centrado entre a marca e a
    # faixa do rodape.
    ft = fonte(BOLD, 66)
    linhas = quebrar(titulo, ft, L - MARGEM * 2, d)
    if len(linhas) > 3:                      # titulo comprido diminui a fonte
        ft = fonte(BOLD, 54)
        linhas = quebrar(titulo, ft, L - MARGEM * 2, d)[:3]

    fs = fonte(REG, 29)
    linhas_sub = quebrar(subtitulo, fs, L - MARGEM * 2 - 40, d)[:2] if subtitulo else []

    altura_titulo = len(linhas) * (ft.size + 12)
    altura_sub = (16 + len(linhas_sub) * 40) if linhas_sub else 0
    topo_livre, base_livre = 176, A - 168
    y = topo_livre + ((base_livre - topo_livre) - (altura_titulo + altura_sub)) / 2.0

    for ln in linhas:
        d.text((MARGEM, y), ln, font=ft, fill=TEXTO)
        y += ft.size + 12
    if linhas_sub:
        y += 16
        for ln in linhas_sub:
            d.text((MARGEM, y), ln, font=fs, fill=TEXTO2)
            y += 40

    # ── rodape: risco de acento + selo ──
    d.rectangle([MARGEM, A - 132, MARGEM + 96, A - 128], fill=acento)
    if selo:
        d.text((MARGEM, A - 96), selo, font=fonte(SEMI, 25), fill=TEXTO2)
    d.text((L - MARGEM, A - 96), 'mundodefi.com.br',
           font=fonte(SEMI, 25), fill=TEXTO2, anchor='ra')
    return img


def gravar(img, nome):
    os.makedirs(SAIDA, exist_ok=True)
    caminho = os.path.join(SAIDA, nome)
    img.save(caminho, 'PNG', optimize=True)
    kb = os.path.getsize(caminho) / 1024.0
    print('  %-34s %5.0f KB' % (nome, kb))
    return kb


if __name__ == '__main__':
    total = 0
    print('Gerando imagens de compartilhamento...')

    # ── home ──
    total += gravar(cartao(
        u'As melhores ferramentas de cripto do Brasil',
        u'Impermanent loss, staking, juros compostos e portfólio completo. Em português.',
        u'A MAIORIA GRÁTIS', OURO), 'home.png')

    # ── ferramentas, do catalogo ──
    for it in catalogo():
        if it['slug'] == 'portfolio':
            continue
        acento = ROXO if it.get('plano') == 'pro' else VERDE
        selo = u'ASSINATURA PRO' if it.get('plano') == 'pro' else u'GRÁTIS · SEM CADASTRO'
        total += gravar(cartao(it['nome'], it.get('curto') or it['resumo'], selo, acento),
                        'ferramenta-%s.png' % it['slug'])

    # ── portfolio ──
    PF = [
        ('index', u'Portfólio de criptomoedas, grátis',
         u'HOLD, DeFi e trade num lugar só, com as contas que a planilha não faz.'),
        ('hold', u'Carteira HOLD: preço médio e lucro real',
         u'Lucro realizado separado do que ainda existe só no papel.'),
        ('defi', u'Pools de liquidez e lending',
         u'As taxas cobriram o impermanent loss? Essa é a conta que importa.'),
        ('trade', u'Diário de trade: banca e drawdown',
         u'Win rate alto não significa lucro. Aqui dá para ver a diferença.'),
        ('rwa', u'Carteira RWA: ações tokenizadas',
         u'Nvidia e Google pelos trilhos da cripto, no mesmo preço médio do resto.'),
        ('meta', u'Meta: quanto aportar por mês',
         u'A conta sai do seu ritmo real de aportes, nunca de uma previsão de preço.'),
    ]
    for slug, t, s in PF:
        total += gravar(cartao(t, s, u'GRÁTIS COM UMA CARTEIRA', CIANO), 'portfolio-%s.png' % slug)

    # ── paginas soltas ──
    total += gravar(cartao(u'Planos do MundoDeFi',
                           u'O portfólio é grátis. O PRO é para quando uma carteira não basta.',
                           u'PRO POR R$ 19,90/MÊS', ROXO), 'planos.png')
    total += gravar(cartao(u'Nexus: a leitura dos seus números',
                           u'Lê o seu portfólio e responde por regras auditáveis, não por texto gerado.',
                           u'EXCLUSIVO PRO', ROXO), 'nexus.png')

    # ── moedas ──
    desc = json.load(io.open(os.path.join(RAIZ, 'token-descricoes.json'), encoding='utf-8'))
    ids = [k for k in desc if not k.startswith('_')]
    nomes = json.load(io.open(os.path.join(RAIZ, 'mundodefi-ids.json'), encoding='utf-8'))['ids']
    for cg in ids:
        titulo = (desc[cg].get('titulo') or u'O que é %s?' % cg).replace('?', '')
        primeira = (desc[cg].get('texto') or '').split('\n\n')[0].split('. ')[0] + '.'
        total += gravar(cartao(titulo, primeira, u'COTAÇÃO AO VIVO · EM PORTUGUÊS', OURO),
                        'moeda-%s.png' % cg)

    print('\nTotal: %.0f KB em /og/' % total)
