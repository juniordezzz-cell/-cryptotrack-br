# -*- coding: utf-8 -*-
u"""
╔══════════════════════════════════════════════════════════════════════╗
║  GERADOR DOS ÍCONES DO SITE (favicon + apple-touch-icon)             ║
║                                                                      ║
║  ── O PROBLEMA ──────────────────────────────────────────────────    ║
║  Toda visita disparava três 404 no servidor: /favicon.ico,           ║
║  /apple-touch-icon.png e /apple-touch-icon-precomposed.png. Nada     ║
║  quebrava na tela, mas o iPhone e o Android pedem esses arquivos     ║
║  pela raiz, SEM depender de <link> no HTML — e sem eles, quem        ║
║  adiciona o MundoDeFi à tela inicial recebe um retângulo cinza com   ║
║  um pedaço da página dentro. Num site cujo público entra pelo        ║
║  celular, isso é o ícone do produto.                                 ║
║                                                                      ║
║  ── POR QUE NÃO BASTA O favicon.svg ─────────────────────────────    ║
║  Ele existe e funciona na aba do navegador, mas:                     ║
║   1. iOS ignora SVG para ícone de tela inicial;                      ║
║   2. ele desenha o ₿ como TEXTO em Georgia — e Georgia não tem o     ║
║      glifo U+20BF. A mesma armadilha que já tinha estragado a        ║
║      imagem de compartilhamento, onde o símbolo virou retângulo      ║
║      vazio. Aqui o risco é o mesmo, só que depende da fonte que      ║
║      cada aparelho resolve usar.                                     ║
║  PNG resolve os dois: vira pixel aqui, na minha máquina, com uma     ║
║  fonte que eu verifiquei ter o glifo. Nenhum aparelho precisa ter    ║
║  fonte nenhuma.                                                      ║
║                                                                      ║
║  ── COMO RODAR ──────────────────────────────────────────────────    ║
║      python dev/gerar-favicons.py                                    ║
╚══════════════════════════════════════════════════════════════════════╝
"""
import os
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Mesmas cores do gradiente de favicon.svg e de .nav-logo-mark no CSS.
OURO_CLARO = (255, 212, 79)
OURO_MEIO = (245, 182, 20)
OURO_ESCURO = (181, 126, 4)
TINTA = (36, 26, 4)

# Arial Bold tem o U+20BF. Georgia NÃO tem — conferido quando o símbolo
# saiu como retângulo vazio na imagem de compartilhamento.
FONTE = r'C:\Windows\Fonts\arialbd.ttf'


def marca(lado):
    u"""Desenha a marca no tamanho pedido, com 4x de supersampling."""
    S = lado * 4
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))

    # gradiente diagonal, do canto superior esquerdo ao inferior direito
    grad = Image.new('RGB', (S, S))
    px = grad.load()
    for y in range(S):
        for x in range(S):
            t = (x + y) / float(2 * (S - 1))
            if t <= 0.52:
                k = t / 0.52
                a, b = OURO_CLARO, OURO_MEIO
            else:
                k = (t - 0.52) / 0.48
                a, b = OURO_MEIO, OURO_ESCURO
            px[x, y] = (int(a[0] + (b[0] - a[0]) * k),
                        int(a[1] + (b[1] - a[1]) * k),
                        int(a[2] + (b[2] - a[2]) * k))

    # máscara de quadrado arredondado — raio 141/512, igual ao SVG
    mascara = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mascara).rounded_rectangle([0, 0, S - 1, S - 1],
                                              radius=int(S * 141 / 512.0), fill=255)
    img.paste(grad, (0, 0), mascara)

    # o símbolo, centralizado pela caixa real do glifo (não pela métrica
    # da fonte, que deixa o desenho visivelmente alto dentro do quadrado)
    d = ImageDraw.Draw(img)
    fonte = ImageFont.truetype(FONTE, int(S * 0.60))
    cx0, cy0, cx1, cy1 = d.textbbox((0, 0), u'\u20bf', font=fonte)
    d.text((S / 2.0 - (cx0 + cx1) / 2.0, S / 2.0 - (cy0 + cy1) / 2.0),
           u'\u20bf', font=fonte, fill=TINTA)

    return img.resize((lado, lado), Image.LANCZOS)


def main():
    # 180 é o tamanho que o iOS pede; o Android usa o maior disponível.
    saidas = [
        ('apple-touch-icon.png', 180),
        ('apple-touch-icon-precomposed.png', 180),   # aparelhos antigos pedem este nome
        ('favicon-512.png', 512),
        ('favicon-192.png', 192),
        ('favicon-32.png', 32),
    ]
    for nome, lado in saidas:
        caminho = os.path.join(RAIZ, nome)
        marca(lado).save(caminho, 'PNG', optimize=True)
        print('  %-38s %dx%d  %5.1f KB' % (nome, lado, lado,
                                           os.path.getsize(caminho) / 1024.0))

    # .ico com várias resoluções dentro — é o que o navegador antigo pede
    # sozinho na raiz, sem <link> nenhum
    ico = os.path.join(RAIZ, 'favicon.ico')
    marca(64).save(ico, 'ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print('  %-38s 16/32/48/64  %5.1f KB' % ('favicon.ico', os.path.getsize(ico) / 1024.0))

    print('\nOs arquivos ficam na RAIZ de proposito: iOS e navegadores pedem')
    print('/apple-touch-icon.png e /favicon.ico por convencao, sem precisar')
    print('de <link> em nenhum HTML. Um arquivo resolve o site inteiro.')


if __name__ == '__main__':
    main()
