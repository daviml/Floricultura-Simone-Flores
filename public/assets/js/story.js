// Gera a arte 1080×1920 para Story do Instagram / status do WhatsApp.

import { brl, fotoUrl, selos } from './common.js';

const MODELOS = {
  creme: { fundo: '#f7f0e5', papel: '#fffaf3', texto: '#2d3b27', destaque: '#b0884a', faixa: '#2d3b27', faixaTexto: '#fffaf3' },
  verde: { fundo: '#2d3b27', papel: '#354630', texto: '#fffaf3', destaque: '#e9d6b0', faixa: '#e9d6b0', faixaTexto: '#2d3b27' },
  rosa: { fundo: '#f3dcd6', papel: '#fbeeea', texto: '#4a2f2c', destaque: '#b9605d', faixa: '#b9605d', faixaTexto: '#fffaf3' },
};

function carregar(src) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = falha;
    img.src = src;
  });
}

function arco(ctx, x, y, w, h) {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h - 36);
  ctx.quadraticCurveTo(x + w, y + h, x + w - 36, y + h);
  ctx.lineTo(x + 36, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - 36);
  ctx.closePath();
}

function cobrir(ctx, img, x, y, w, h) {
  const escala = Math.max(w / img.width, h / img.height);
  const iw = img.width * escala;
  const ih = img.height * escala;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function quebrar(ctx, texto, largura) {
  const palavras = texto.split(' ');
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = teste;
  }
  linhas.push(atual);
  return linhas.slice(0, 2);
}

export async function desenharStory(canvas, produto, config, modelo = 'creme') {
  const c = MODELOS[modelo];
  const ctx = canvas.getContext('2d');
  const W = 1080;
  const H = 1920;
  await Promise.all([
    document.fonts.load('600 90px "Cormorant Garamond"'),
    document.fonts.load('500 40px Jost'),
    document.fonts.load('80px Parisienne'),
  ]).catch(() => {});

  ctx.fillStyle = c.fundo;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = c.destaque;
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, W - 88, H - 88);

  ctx.textAlign = 'center';
  ctx.fillStyle = c.texto;
  ctx.font = '600 76px "Cormorant Garamond"';
  ctx.letterSpacing = '18px';
  ctx.fillText('SIMONE', W / 2 + 9, 190);
  ctx.fillStyle = c.destaque;
  ctx.font = '500 34px Jost';
  ctx.letterSpacing = '22px';
  ctx.fillText('FLORES', W / 2 + 11, 248);
  ctx.letterSpacing = '0px';

  const s = selos(produto)[0];
  ctx.font = '78px Parisienne';
  ctx.fillText(s && s.texto !== 'Novo' ? s.texto.toLowerCase() : 'nova na vitrine', W / 2, 345);

  const x = 150;
  const y = 400;
  const w = W - 300;
  const h = 1000;
  ctx.save();
  arco(ctx, x - 16, y - 16, w + 32, h + 32);
  ctx.strokeStyle = c.destaque;
  ctx.lineWidth = 3;
  ctx.stroke();
  arco(ctx, x, y, w, h);
  ctx.fillStyle = c.papel;
  ctx.fill();
  ctx.clip();
  try {
    cobrir(ctx, await carregar(fotoUrl(produto.fotos[0])), x, y, w, h);
  } catch {}
  ctx.restore();

  ctx.fillStyle = c.texto;
  ctx.font = '600 92px "Cormorant Garamond"';
  const linhas = quebrar(ctx, produto.nome, W - 200);
  linhas.forEach((l, i) => ctx.fillText(l, W / 2, 1530 + i * 92));
  let yy = 1530 + (linhas.length - 1) * 92 + 80;
  ctx.fillStyle = c.destaque;
  ctx.font = '500 52px Jost';
  ctx.fillText(produto.preco ? brl(produto.preco) : 'Peça o seu', W / 2, yy);

  const tel = config.whatsapp.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
  const texto = `Peça no WhatsApp ${tel}`;
  ctx.font = '500 40px Jost';
  const larg = ctx.measureText(texto).width + 110;
  const by = Math.max(yy + 60, 1700);
  ctx.fillStyle = c.faixa;
  ctx.beginPath();
  ctx.roundRect((W - larg) / 2, by, larg, 100, 50);
  ctx.fill();
  ctx.fillStyle = c.faixaTexto;
  ctx.fillText(texto, W / 2, by + 64);

  ctx.fillStyle = c.texto;
  ctx.globalAlpha = 0.7;
  ctx.font = '400 30px Jost';
  ctx.fillText(`@${config.instagram}`, W / 2, Math.min(by + 160, H - 70));
  ctx.globalAlpha = 1;
}
