import { brl, compartilhar, dataBR, diasDesde, esc, fotoUrl, hojeISO, selos, toast, waLink } from './common.js';
import { chaveLegivel, chaveNormalizada } from './pix.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

let estado = { vitrine: [], galeria: [], config: null, ocasioes: [], hoje: hojeISO() };
let filtro = 'Todas';
let produtoAberto = null;

// ---------- Seleção genérica (chips, estilos, tamanhos) ----------

document.addEventListener('click', (e) => {
  const botao = e.target.closest('[data-campo] [data-valor]');
  if (!botao) return;
  const grupo = botao.closest('[data-campo]');
  const ligado = botao.getAttribute('aria-pressed') === 'true';
  if (grupo.hasAttribute('data-unico')) $$('[data-valor]', grupo).forEach((b) => b.setAttribute('aria-pressed', 'false'));
  botao.setAttribute('aria-pressed', String(!ligado));
  grupo.dispatchEvent(new Event('mudou', { bubbles: true }));
});

function valores(grupo) {
  return $$('[aria-pressed="true"]', grupo).map((b) => b.dataset.valor);
}

// ---------- Entrega e cartão (mesmo bloco no modal e no monte o seu) ----------

function montarEntrega() {
  const tpl = $('#tpl-entrega');
  $$('[data-entrega]').forEach((alvo) => {
    alvo.append(tpl.content.cloneNode(true));
    $('input[type=date]', alvo).min = estado.hoje;
    alvo.addEventListener('change', () => {
      const retirada = $('input[name=modo]:checked', alvo).value === 'Retirada';
      $$('[data-so-entrega]', alvo).forEach((c) => (c.hidden = retirada));
    });
  });
}

function lerEntrega(form) {
  const f = form.elements;
  return {
    modo: f.modo.value,
    data: f.data.value,
    bairro: f.bairro.value.trim(),
    para: f.para.value.trim(),
    cartao: f.cartao.value.trim(),
  };
}

function linhasEntrega(e) {
  const l = [];
  const quando = e.data ? ` em ${dataBR(e.data)}` : '';
  // Só fala de entrega se a cliente preencheu algo; senão a Simone combina na conversa.
  if (e.modo === 'Retirada') l.push(`🛍️ Vou retirar${quando}`);
  else if (e.data || e.bairro) l.push(`🚗 Entrega${quando}${e.bairro ? ` · bairro ${e.bairro}` : ''}`);
  if (e.para) l.push(`💐 Para: ${e.para}`);
  if (e.cartao) l.push(`💌 Cartão: "${e.cartao}"`);
  return l;
}

function complementosEscolhidos(grupo) {
  const nomes = valores(grupo);
  return estado.config.complementos.filter((c) => nomes.includes(c.nome));
}

function textoComplementos(lista) {
  return lista.map((c) => (c.preco ? `${c.nome} (+${brl(c.preco)})` : c.nome)).join(', ');
}

function abrirWhatsApp(texto) {
  window.open(waLink(estado.config.whatsapp, texto), '_blank', 'noopener');
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copiar-pix]');
  if (!b) return;
  try {
    await navigator.clipboard.writeText(chaveNormalizada(estado.config.pix));
    toast('Chave Pix copiada 💚');
  } catch {
    toast(`Chave Pix: ${chaveLegivel(estado.config.pix)}`, 5000);
  }
});

// ---------- Render ----------

function aplicarConfig() {
  const c = estado.config;
  $$('[data-wpp]').forEach((a) => (a.href = waLink(c.whatsapp, a.dataset.wpp)));
  const tel = c.whatsapp.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
  $('#rodape-wpp').textContent = `WhatsApp ${tel}`;
  const insta = `https://www.instagram.com/${c.instagram}/`;
  $('#link-insta').href = insta;
  $('#rodape-insta').href = insta;
  $('#rodape-insta').textContent = `@${c.instagram}`;
  $('#rodape-horario').textContent = c.horario;
  $('#rodape-entrega').textContent = [c.entrega, c.antecedencia].filter(Boolean).join('\n');
  $('#rodape-endereco-bloco').hidden = !(c.endereco || c.cidade);
  $('#rodape-endereco').textContent = [c.endereco, c.cidade].filter(Boolean).join('\n');
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(['Simone Flores Floricultura', c.endereco, c.cidade].filter(Boolean).join(', '))}`;
  $('#rodape-mapa').href = mapa;
  $('#rodape-mapa').hidden = !c.endereco;
  aplicarAvaliacoes(c, mapa);
  $$('[data-pix]').forEach((el) => (el.hidden = !c.pix));
  $$('[data-pix-chave]').forEach((el) => (el.textContent = chaveLegivel(c.pix)));
  $('#sobre-texto').textContent = c.sobre;
  $('#ano').textContent = new Date().getFullYear();
  if (c.aviso) {
    $('#aviso').textContent = c.aviso;
    $('#aviso').hidden = false;
  }

  $('[data-campo="ocasiao"]').innerHTML = estado.ocasioes.map((o) => `<button type="button" class="chip" data-valor="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join('');
  $('#tamanhos').innerHTML = c.tamanhos
    .map((t) => `<button type="button" class="tamanho" data-valor="${esc(t.nome)}" aria-pressed="false"><b>${esc(t.nome)}</b><small>${esc(t.descricao)}</small>${t.aPartirDe ? `<span>a partir de ${brl(t.aPartirDe)}</span>` : ''}</button>`)
    .join('');
  const chipsComplementos = c.complementos
    .map((x) => `<button type="button" class="chip" data-valor="${esc(x.nome)}" aria-pressed="false">${esc(x.nome)}${x.preco ? `<small>+${brl(x.preco)}</small>` : ''}</button>`)
    .join('');
  $('#m-complementos').innerHTML = chipsComplementos;
}

function aplicarAvaliacoes(c, mapa) {
  const nota = c.nota ? c.nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '';
  const total = c.avaliacoes ? `${c.avaliacoes} avaliações no Google` : 'no Google';
  $('.selo-google').hidden = !c.nota;
  $('#hero-nota').textContent = nota;
  $('#hero-avaliacoes').textContent = total;
  $('#avaliacoes').hidden = !c.nota && !c.depoimentos?.length;
  $('#av-nota').textContent = nota;
  $('#av-total').textContent = c.avaliacoes ? `${total} — obrigada a cada cliente ♡` : '';
  $('#depoimentos').innerHTML = (c.depoimentos || [])
    .map((d) => `<figure class="depoimento"><blockquote>${esc(d.texto)}</blockquote><figcaption><b>${esc(d.nome)}</b><span>★★★★★</span></figcaption></figure>`)
    .join('');
  $('#av-link').href = c.google || '#';
  $('#av-link').hidden = !c.google;
  $('#av-chegar').href = mapa;
  $('#av-chegar').hidden = !c.endereco;
}

function aplicarHero() {
  const v = estado.vitrine.filter((p) => !p.esgotado);
  const p = v.find((x) => x.destaque && x.fotos.length) || v.find((x) => x.fotos.length);
  const recentes = estado.vitrine.filter((x) => diasDesde(x.publicadoEm) < 1).length;
  $('#hero-status').textContent = estado.vitrine.length
    ? recentes
      ? `${recentes} ${recentes > 1 ? 'novidades' : 'novidade'} hoje · ${estado.vitrine.length} na vitrine`
      : `${estado.vitrine.length} ${estado.vitrine.length > 1 ? 'criações' : 'criação'} na vitrine`
    : 'Novidades a caminho';
  if (!p) {
    $('#hero-arco').classList.add('logo');
    return;
  }
  // A foto do topo passeia pelas criações da vitrine: o site parece vivo.
  const fila = [p, ...v.filter((x) => x !== p && x.fotos.length)].slice(0, 6);
  fila.slice(1).forEach((x) => (new Image().src = fotoUrl(x.fotos[0])));
  let i = 0;
  const mostrar = (x) => {
    const img = $('#hero-img');
    img.src = fotoUrl(x.fotos[0]);
    img.alt = x.nome;
    $('#hero-nome').textContent = x.nome;
    $('#hero-preco').textContent = x.preco ? brl(x.preco) : 'Sob consulta';
    $('.mini-rotulo').textContent = x.destaque ? 'Queridinho da vitrine' : diasDesde(x.publicadoEm) < 3 ? 'Nova na vitrine' : 'Na vitrine';
    $('#hero-cartao').onclick = () => abrirProduto(x.id);
  };
  mostrar(p);
  $('#hero-cartao').hidden = false;
  if (fila.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(() => {
    if (document.hidden || modal.open) return;
    const img = $('#hero-img');
    img.classList.add('saindo');
    setTimeout(() => {
      i = (i + 1) % fila.length;
      mostrar(fila[i]);
      img.classList.remove('saindo');
    }, 600);
  }, 5000);
}

const ATE_100 = 'Até R$ 100';

function passaFiltro(p) {
  if (filtro === 'Todas') return true;
  if (filtro === ATE_100) return p.preco !== null && p.preco <= 100;
  return p.ocasioes.includes(filtro);
}

function aplicarFiltros() {
  const presentes = estado.ocasioes.filter((o) => estado.vitrine.some((p) => p.ocasioes.includes(o)));
  if (estado.vitrine.some((p) => p.preco !== null && p.preco <= 100)) presentes.unshift(ATE_100);
  const el = $('#filtros');
  el.hidden = presentes.length < 2;
  el.innerHTML = ['Todas', ...presentes].map((o) => `<button class="chip" data-filtro="${esc(o)}" aria-pressed="${o === filtro}">${esc(o)}</button>`).join('');
}

$('#filtros').addEventListener('click', (e) => {
  const b = e.target.closest('[data-filtro]');
  if (!b) return;
  filtro = b.dataset.filtro;
  aplicarFiltros();
  aplicarGrade();
});

function htmlSelos(p, max = 3) {
  return selos(p, estado.hoje).slice(0, max).map((s) => `<span class="badge ${s.classe}">${esc(s.texto)}</span>`).join('');
}

function aplicarGrade() {
  const lista = estado.vitrine.filter(passaFiltro);
  $('#vazio').hidden = estado.vitrine.length > 0;
  $('#filtros').hidden ||= !estado.vitrine.length;
  $('#vitrine-sub').textContent = estado.vitrine.length
    ? 'Cada criação fica pouco tempo por aqui. Gostou? Garanta a sua.'
    : 'A vitrine se renova o tempo todo.';
  $('#grade').innerHTML = lista
    .map(
      (p, i) => `
      <button class="card${p.esgotado ? ' esgotado' : ''}" data-id="${p.id}" style="animation-delay:${Math.min(i, 8) * 60}ms">
        <div class="card-foto">
          <img src="${fotoUrl(p.fotos[0])}" alt="${esc(p.nome)}" loading="${i < 4 ? 'eager' : 'lazy'}">
          <div class="badges">${htmlSelos(p, 2)}</div>
        </div>
        <div class="card-corpo">
          <h3>${esc(p.nome)}</h3>
          <span class="card-preco">${p.preco ? brl(p.preco) : '<small>Sob consulta</small>'}</span>
          <span class="card-acao">${p.esgotado ? 'Quero um parecido →' : 'Quero este →'}</span>
        </div>
      </button>`,
    )
    .join('');
}

$('#grade').addEventListener('click', (e) => {
  const c = e.target.closest('.card[data-id]');
  if (c) abrirProduto(c.dataset.id);
});

function aplicarGaleria() {
  $('#atelie').hidden = !estado.galeria.length;
  $('#mosaico').innerHTML = estado.galeria
    .map((p) => `<button class="peca" data-id="${p.id}"${p.credito ? ` title="Foto: ${esc(p.credito)}"` : ''}><img src="${fotoUrl(p.fotos[0])}" alt="${esc(p.nome)}" loading="lazy"><span>${esc(p.nome)}<small>Quero um parecido →</small></span></button>`)
    .join('');
}

$('#mosaico').addEventListener('click', (e) => {
  const b = e.target.closest('.peca');
  if (!b) return;
  const p = estado.galeria.find((x) => x.id === b.dataset.id);
  abrirWhatsApp(`Olá, Simone! 🌷 Vi no site o "${p.nome}" que já saiu da vitrine. Consegue fazer um parecido pra mim?\n\n${fotoUrl(p.fotos[0], true)}`);
});

// ---------- Modal do produto ----------

const modal = $('#modal');

function abrirProduto(id, empilhar = true) {
  const p = estado.vitrine.find((x) => x.id === id);
  if (!p) return;
  produtoAberto = p;
  const fotos = p.fotos.length ? p.fotos : [null];
  $('#m-fotos').innerHTML = fotos.map((f) => `<img src="${fotoUrl(f)}" alt="${esc(p.nome)}">`).join('');
  $('#m-pontos').innerHTML = fotos.length > 1 ? fotos.map((_, i) => `<i class="${i ? '' : 'ativo'}"></i>`).join('') : '';
  $('#m-fotos').scrollLeft = 0;
  $('#m-badges').innerHTML = htmlSelos(p);
  $('#m-nome').textContent = p.nome;
  $('#m-preco').textContent = p.preco ? brl(p.preco) : 'Valor sob consulta';
  $('#m-descricao').textContent = p.descricao || '';
  $('#m-ocasioes').textContent = p.ocasioes.length ? `Perfeito para: ${p.ocasioes.join(' · ')}` : '';
  $('#m-credito').hidden = !p.exemplo;
  $('#m-credito').textContent = p.exemplo ? `Foto ilustrativa${p.credito ? ` · ${p.credito}` : ''}` : '';
  $('#m-pedido').querySelector('h4').hidden = !estado.config.complementos.length;
  $$('#m-complementos [data-valor]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  $('#m-pedir span').textContent = p.esgotado ? 'Quero parecido' : p.tipo === 'encomenda' ? 'Encomendar' : 'Pedir agora';
  totalModal();
  if (!modal.open) modal.showModal();
  if (empilhar) history.pushState({ p: id }, '', `?p=${id}`);
}

function totalModal() {
  const p = produtoAberto;
  const extras = complementosEscolhidos($('#m-complementos'));
  const soma = extras.reduce((t, c) => t + (c.preco || 0), 0);
  $('#m-rotulo').textContent = p.esgotado ? 'Esgotou' : extras.length ? `Com ${extras.length} ${extras.length > 1 ? 'extras' : 'extra'}` : 'Total';
  $('#m-total').textContent = p.esgotado ? 'Faço outro!' : p.preco ? brl(p.preco + soma) : 'A combinar';
}

$('#m-complementos').addEventListener('mudou', totalModal);

$('#m-fotos').addEventListener('scroll', (e) => {
  const i = Math.round(e.target.scrollLeft / e.target.clientWidth);
  $$('#m-pontos i').forEach((p, j) => p.classList.toggle('ativo', i === j));
});

modal.addEventListener('close', () => {
  if (new URLSearchParams(location.search).has('p')) history.pushState({}, '', location.pathname);
});

window.addEventListener('popstate', () => {
  const id = new URLSearchParams(location.search).get('p');
  if (id) abrirProduto(id, false);
  else if (modal.open) modal.close();
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});

$('#form-produto').addEventListener('submit', (e) => {
  e.preventDefault();
  const p = produtoAberto;
  const extras = complementosEscolhidos($('#m-complementos'));
  const soma = extras.reduce((t, c) => t + (c.preco || 0), 0);
  const l = [
    p.esgotado ? `Olá, Simone! 🌷 Vi no site o *${p.nome}* (esgotou). Consegue fazer um parecido?` : `Olá, Simone! 🌷 Quero pedir pelo site:`,
    '',
    `*${p.nome}*${p.preco ? ` — ${brl(p.preco)}` : ''}`,
  ];
  if (extras.length) l.push(`➕ ${textoComplementos(extras)}`);
  if (p.preco && soma) l.push(`💰 Total estimado: ${brl(p.preco + soma)}`);
  l.push(...linhasEntrega(lerEntrega(e.target)), '', `${location.origin}/?p=${p.id}`);
  abrirWhatsApp(l.join('\n'));
});

$('#m-compartilhar').addEventListener('click', () => {
  const p = produtoAberto;
  compartilhar({ title: p.nome, text: `Olha que lindo esse da Simone Flores: ${p.nome} 🌷`, url: `${location.origin}/?p=${p.id}` });
});

// ---------- Monte o seu ----------

const formMonte = $('#form-monte');

function lerMonte() {
  const pegar = (campo) => valores($(`[data-campo="${campo}"]`, formMonte));
  const tamanho = estado.config.tamanhos.find((t) => t.nome === pegar('tamanho')[0]);
  return {
    ocasiao: pegar('ocasiao')[0],
    estilo: pegar('estilo')[0],
    tamanho,
    entrega: lerEntrega(formMonte),
  };
}

function atualizarResumo() {
  const m = lerMonte();
  const linhas = [
    ['Ocasião', m.ocasiao],
    ['Estilo', m.estilo],
    ['Tamanho', m.tamanho?.nome],
    ['Quando', m.entrega.data ? `${m.entrega.modo === 'Retirada' ? 'Retirada' : 'Entrega'} ${dataBR(m.entrega.data)}` : ''],
    ['Para', m.entrega.para],
  ];
  $('#resumo-lista').innerHTML = linhas
    .map(([k, v]) => `<div><dt>${k}</dt><dd class="${v ? '' : 'falta'}">${v ? esc(v) : 'a escolher'}</dd></div>`)
    .join('');
  const base = m.tamanho?.aPartirDe || 0;
  $('#resumo-total').textContent = base ? `A partir de ${brl(base)}` : '';
  $('#barra-monte-total').textContent = base
    ? `A partir de ${brl(base)}`
    : [m.ocasiao, m.estilo].filter(Boolean).join(' · ') || 'Monte do seu jeito';
}

// No celular o resumo fica lá embaixo; enquanto a cliente monta, uma barra fixa mantém o "Enviar" à mão.
const barraMonte = $('#barra-monte');
const vistos = new Map();
const observador = new IntersectionObserver((itens) => {
  itens.forEach((it) => vistos.set(it.target, it.isIntersecting));
  const mostrar = vistos.get($('.monte-passos')) && !vistos.get($('.resumo'));
  barraMonte.classList.toggle('visivel', Boolean(mostrar));
  document.body.classList.toggle('com-barra', Boolean(mostrar) && innerWidth < 960);
});
observador.observe($('.monte-passos'));
observador.observe($('.resumo'));

formMonte.addEventListener('mudou', atualizarResumo);
formMonte.addEventListener('input', atualizarResumo);
formMonte.addEventListener('change', atualizarResumo);

formMonte.addEventListener('submit', (e) => {
  e.preventDefault();
  const m = lerMonte();
  if (!m.ocasiao && !m.estilo && !m.tamanho) {
    $('#monte').scrollIntoView({ behavior: 'smooth' });
    return toast('Escolha pelo menos a ocasião ou o estilo 🌸');
  }
  const l = ['Olá, Simone! 🌷 Quero montar um buquê pelo site:', ''];
  if (m.ocasiao) l.push(`🎀 Ocasião: ${m.ocasiao}`);
  if (m.estilo) l.push(`🌸 Estilo: ${m.estilo}`);
  if (m.tamanho) l.push(`📏 Tamanho: ${m.tamanho.nome}${m.tamanho.aPartirDe ? ` (a partir de ${brl(m.tamanho.aPartirDe)})` : ''}`);
  l.push(...linhasEntrega(m.entrega));
  abrirWhatsApp(l.join('\n'));
});

// ---------- Início ----------

window.addEventListener('scroll', () => $('#topo').classList.toggle('rolou', scrollY > 10), { passive: true });

async function iniciar() {
  try {
    const res = await fetch('/api/catalogo');
    if (!res.ok) throw new Error();
    estado = await res.json();
  } catch {
    estado.config = (await import('./padrao.js')).CONFIG;
    estado.ocasioes = (await import('./padrao.js')).OCASIOES;
  }
  aplicarConfig();
  montarEntrega();
  aplicarHero();
  aplicarFiltros();
  aplicarGrade();
  aplicarGaleria();
  atualizarResumo();
  const id = new URLSearchParams(location.search).get('p');
  if (id) {
    if (estado.vitrine.some((p) => p.id === id)) abrirProduto(id, false);
    else history.replaceState({}, '', location.pathname);
  }
}

iniciar();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
