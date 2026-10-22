import { brl, dataBR, diasAte, esc, fotoUrl, hojeISO, proximasDatas, selos, somarDias, toast } from './common.js';
import { chaveLegivel, pixCopiaECola } from './pix.js';
import { desenharStory } from './story.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const CHAVE = 'sf-token';
let token = '';
try {
  token = localStorage.getItem(CHAVE) || '';
} catch {}

let dados = { produtos: [], config: null, ocasioes: [] };
let editando = null; // produto em edição (null = novo)
let fotos = []; // [{ nome, preview, enviando }]

const NOMES = [
  'Jardim de Outono', 'Doce Manhã', 'Abraço de Rosas', 'Sussurro Rosé', 'Primavera Mineira', 'Luz de Domingo',
  'Café com Flores', 'Encanto Branco', 'Pôr do Sol', 'Delicadeza', 'Campo Lilás', 'Amor Perfeito', 'Bem-me-quer',
  'Dia de Sol', 'Noite de Gala', 'Carinho em Flor', 'Brisa do Campo', 'Nuvem de Algodão', 'Cerrado em Flor',
  'Coração Florido', 'Sonho de Valsa', 'Pétalas de Mel', 'Rosa dos Ventos', 'Ternura', 'Alma Leve', 'Primeiro Encontro',
];

// ---------- API ----------

async function api(metodo, url, corpo) {
  const res = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sair();
    throw new Error(json.erro || 'Faça login de novo.');
  }
  if (!res.ok) throw new Error(json.erro || 'Algo deu errado.');
  return json;
}

function sair() {
  token = '';
  try {
    localStorage.removeItem(CHAVE);
  } catch {}
  $('#painel').hidden = true;
  $('#login').hidden = false;
}

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const botao = $('button', e.target);
  botao.disabled = true;
  $('#login-erro').textContent = '';
  try {
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: e.target.senha.value }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.erro);
    token = json.token;
    try {
      localStorage.setItem(CHAVE, token);
    } catch {}
    await abrirPainel();
  } catch (erro) {
    $('#login-erro').textContent = erro.message || 'Não foi possível entrar.';
  } finally {
    botao.disabled = false;
  }
});

$('#sair').addEventListener('click', sair);

// ---------- Painel ----------

async function carregar() {
  dados = await api('GET', '/api/catalogo?admin=1');
  const avisos = {
    local: 'Modo teste: os dados ficam só neste computador.',
    leitura: 'Modo demonstração: dá para ver tudo, mas publicar ainda não salva. Falta configurar o GITHUB_TOKEN na Vercel.',
  };
  $('#aviso-dev').textContent = avisos[dados.modo] || '';
  $('#aviso-dev').hidden = !avisos[dados.modo];
  render();
}

async function abrirPainel() {
  $('#login').hidden = true;
  $('#painel').hidden = false;
  const h = new Date().getHours();
  $('#p-saudacao').textContent = `${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}, Simone`;
  await carregar();
  preencherLoja();
}

function naVitrine(p, hoje) {
  return p.status === 'ativo' && !(p.validade && p.validade < hoje);
}

function render() {
  const hoje = hojeISO();
  const vitrine = dados.produtos.filter((p) => naVitrine(p, hoje));
  const galeria = dados.produtos.filter((p) => !naVitrine(p, hoje));
  const saem = vitrine.filter((p) => p.validade && diasAte(p.validade, hoje) <= 1).length;
  const esgotados = vitrine.filter((p) => p.quantidade === 0).length;
  $('#resumo-vitrine').innerHTML = [
    `<b>${vitrine.length}</b> na vitrine`,
    saem && `<span class="alerta">${saem} ${saem > 1 ? 'saem' : 'sai'} até amanhã</span>`,
    esgotados && `${esgotados} ${esgotados > 1 ? 'esgotados' : 'esgotado'}`,
  ]
    .filter(Boolean)
    .join(' · ');
  $('#lista-vitrine').innerHTML = vitrine.map((p) => item(p, true, hoje)).join('');
  $('#lista-galeria').innerHTML = galeria.map((p) => item(p, false, hoje)).join('');
  $('#vazio-vitrine').hidden = vitrine.length > 0;
  $('#vazio-galeria').hidden = galeria.length > 0;
  $('#exemplos').hidden = !dados.produtos.some((p) => p.exemplo);
  $('#divulgar-vitrine').hidden = !vitrine.some((p) => p.quantidade !== 0);
  renderData(hoje);
  $('#abrir-cobrar').hidden = !dados.config?.pix;
}

// ---------- Divulgar no WhatsApp ----------

// Sem número: o WhatsApp pergunta para quem mandar (contato, grupo ou status).
function mandarNoWhatsApp(texto) {
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
}

function linkProduto(p) {
  return `${location.origin}/?p=${p.id}`;
}

function textoProduto(p) {
  return [
    '🌷 Novidade na vitrine da Simone Flores!',
    '',
    `*${p.nome}*${p.preco ? ` — ${brl(p.preco)}` : ''}`,
    ...(p.descricao ? [p.descricao.split('\n')[0]] : []),
    ...(p.quantidade === 1 ? ['⏳ Só tenho 1!'] : []),
    '',
    `Veja e peça: ${linkProduto(p)}`,
  ].join('\n');
}

$('#divulgar-vitrine').addEventListener('click', () => {
  const hoje = hojeISO();
  const lista = dados.produtos.filter((p) => naVitrine(p, hoje) && p.quantidade !== 0).slice(0, 10);
  const linhas = lista.map((p) => {
    const extra = p.quantidade === 1 ? ' (última!)' : p.validade === hoje ? ' (só hoje!)' : '';
    return `• ${p.nome}${p.preco ? ` — ${brl(p.preco)}` : ''}${extra}`;
  });
  mandarNoWhatsApp(['🌷 *Vitrine de hoje — Simone Flores*', '', ...linhas, '', `Veja as fotos e peça: ${location.origin}/#vitrine`].join('\n'));
});

// ---------- Cobrar no Pix ----------

const formCobrar = $('#form-cobrar');
let codigoPix = '';

function valorDigitado() {
  // Aceita "184,90", "1.250,00" e também "184.90".
  const t = String(formCobrar.valor.value).trim();
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function mostrarResultado(sim) {
  $('#pix-resultado').hidden = !sim;
  $('#pix-gerar').hidden = sim;
}

$('#abrir-cobrar').addEventListener('click', () => {
  formCobrar.reset();
  mostrarResultado(false);
  const hoje = hojeISO();
  const precos = [...new Set(dados.produtos.filter((p) => naVitrine(p, hoje) && p.preco).map((p) => p.preco))].sort((a, b) => a - b).slice(0, 6);
  $('#cobrar-rapidos').innerHTML = precos.map((v) => `<button type="button" class="chip" data-valor-pix="${v}">${brl(v)}</button>`).join('');
  $('#cobrar').showModal();
});

$('#cobrar-rapidos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-valor-pix]');
  if (!b) return;
  formCobrar.valor.value = String(b.dataset.valorPix).replace('.', ',');
  formCobrar.requestSubmit();
});

formCobrar.valor.addEventListener('input', () => mostrarResultado(false));

formCobrar.addEventListener('submit', (e) => {
  e.preventDefault();
  const valor = valorDigitado();
  if (!valor) return toast('Digite o valor, ex.: 150 ou 184,90');
  const c = dados.config;
  codigoPix = pixCopiaECola({ chave: c.pix, nome: c.nome, cidade: (c.cidade || '').split('-')[0], valor });
  $('#pix-valor').textContent = brl(valor);
  $('#pix-chave').textContent = chaveLegivel(c.pix);
  $('#pix-codigo').textContent = codigoPix;
  mostrarResultado(true);
});

// Só o código, sem texto em volta: a cliente copia a mensagem inteira e cola no banco.
$('#pix-wpp').addEventListener('click', () => mandarNoWhatsApp(codigoPix));

$('#pix-copiar').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(codigoPix);
    toast('Código copiado! Cole na conversa da cliente 💚');
  } catch {
    toast('Toque e segure o código para copiar');
  }
});

// ---------- Datas comemorativas ----------

function renderData(hoje) {
  const d = proximasDatas(hoje, 30)[0];
  $('#data-especial').hidden = !d;
  if (!d) return;
  $('#data-dia').innerHTML = dataBR(d.data).replace('/', '<br>');
  $('#data-nome').textContent = d.nome;
  $('#data-faltam').textContent = d.faltam === 0 ? 'é hoje!' : d.faltam === 1 ? 'é amanhã!' : `faltam ${d.faltam} dias`;
  $('#data-dica').textContent = d.dica;
  const noAr = dados.config?.aviso === d.aviso;
  $('#data-aviso').textContent = noAr ? '✓ Aviso no site · tirar' : 'Colocar aviso no topo do site';
  $('#data-aviso').onclick = async () => {
    try {
      dados.config = await api('PUT', '/api/config', { aviso: noAr ? '' : d.aviso });
      preencherLoja();
      render();
      toast(noAr ? 'Aviso retirado' : 'Aviso no ar! As clientes vão ver no topo do site 💐');
    } catch (erro) {
      toast(erro.message);
    }
  };
}

$('#remover-exemplos').addEventListener('click', async (e) => {
  const exemplos = dados.produtos.filter((p) => p.exemplo);
  if (!confirm(`Remover os ${exemplos.length} produtos de exemplo? Os seus continuam.`)) return;
  e.target.disabled = true;
  try {
    // Um por vez: cada exclusão é um commit no mesmo arquivo do GitHub.
    for (const p of exemplos) {
      await api('DELETE', `/api/catalogo?id=${p.id}`);
      dados.produtos = dados.produtos.filter((x) => x.id !== p.id);
      render();
    }
    toast('Exemplos removidos. A vitrine agora é toda sua 🌷');
  } catch (erro) {
    toast(erro.message);
  } finally {
    e.target.disabled = false;
  }
});

function meta(p, hoje) {
  const partes = [];
  if (p.quantidade === null) partes.push(p.tipo === 'encomenda' ? 'Sob encomenda' : 'Sem limite');
  else partes.push(p.quantidade === 0 ? 'Esgotado' : `${p.quantidade} ${p.quantidade === 1 ? 'unidade' : 'unidades'}`);
  if (p.validade) {
    const d = diasAte(p.validade, hoje);
    partes.push(d < 0 ? `saiu em ${dataBR(p.validade)}` : d === 0 ? 'sai hoje' : d === 1 ? 'sai amanhã' : `até ${dataBR(p.validade)}`);
  } else if (p.status === 'ativo') partes.push('sem prazo');
  return partes.join(' · ');
}

function item(p, ativo, hoje) {
  const acoes = ativo
    ? `${p.quantidade > 0 ? `<button data-acao="vendi">Vendi 1</button>` : ''}
       ${p.quantidade !== 0 ? `<button data-acao="esgotou">Esgotou</button>` : `<button data-acao="repor">Repor</button>`}
       <button data-acao="divulgar">Divulgar</button>
       <button data-acao="story">Story</button>
       <button data-acao="arquivar" class="forte">Tirar</button>`
    : `<button data-acao="voltar">Voltar pra vitrine</button><button data-acao="story">Story</button><button data-acao="editar">Editar</button>`;
  return `
    <article class="item" data-id="${p.id}">
      <div class="item-topo" data-acao="editar">
        <img src="${fotoUrl(p.fotos[0])}" alt="" loading="lazy">
        <div class="item-info">
          <h3>${esc(p.nome)}</h3>
          <span class="item-preco">${p.preco ? brl(p.preco) : 'Sob consulta'}</span>
          <span class="item-meta">${meta(p, hoje)}</span>
          <div class="badges">${p.exemplo ? '<span class="badge exemplo">Exemplo</span>' : ''}${ativo ? selos(p, hoje).map((s) => `<span class="badge ${s.classe}">${esc(s.texto)}</span>`).join('') : ''}</div>
        </div>
      </div>
      <div class="acoes">${acoes}</div>
    </article>`;
}

async function alterar(id, campos, msg) {
  try {
    const p = await api('PUT', `/api/catalogo?id=${id}`, campos);
    dados.produtos = dados.produtos.map((x) => (x.id === id ? p : x));
    render();
    if (msg) toast(msg);
    return p;
  } catch (erro) {
    toast(erro.message);
  }
}

$('main').addEventListener('click', async (e) => {
  const alvo = e.target.closest('[data-acao]');
  const art = e.target.closest('.item');
  if (!alvo || !art) return;
  const p = dados.produtos.find((x) => x.id === art.dataset.id);
  const acao = alvo.dataset.acao;
  if (acao === 'editar') abrirEditor(p);
  if (acao === 'vendi') alterar(p.id, { quantidade: p.quantidade - 1 }, p.quantidade - 1 === 0 ? 'Vendeu tudo! 🎉' : 'Venda registrada 💚');
  if (acao === 'esgotou') alterar(p.id, { quantidade: 0 }, 'Marcado como esgotado');
  if (acao === 'repor') alterar(p.id, { quantidade: 1 }, 'Voltou a ter estoque');
  if (acao === 'arquivar') alterar(p.id, { status: 'arquivado' }, 'Foi para a galeria');
  if (acao === 'story') abrirStory(p);
  if (acao === 'divulgar') mandarNoWhatsApp(textoProduto(p));
  if (acao === 'voltar') {
    const dias = await perguntarPrazo();
    if (dias === null) return;
    alterar(
      p.id,
      { status: 'ativo', validade: dias === 'sem' ? null : somarDias(hojeISO(), Number(dias)), quantidade: p.quantidade === 0 ? null : p.quantidade },
      'De volta na vitrine ✨',
    );
  }
});

function perguntarPrazo() {
  const d = $('#republicar');
  d.returnValue = '';
  d.showModal();
  return new Promise((ok) => d.addEventListener('close', () => ok(d.returnValue || null), { once: true }));
}

// ---------- Abas ----------

$('.abas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-aba]');
  if (!b) return;
  $$('.abas [data-aba]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  $$('[data-painel]').forEach((s) => (s.hidden = s.dataset.painel !== b.dataset.aba));
  $('#nova').hidden = b.dataset.aba === 'loja';
});

// ---------- Editor ----------

const editor = $('#editor');
const form = $('#form-editor');

$$('[data-fechar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

$('#nova').addEventListener('click', () => {
  abrirEditor(null);
  // Criação nova já abre a câmera/galeria: o primeiro passo é sempre a foto.
  $('#foto-input').click();
});

const PRECOS = [79, 99, 129, 149, 189, 249];

function abrirEditor(p) {
  editando = p;
  form.reset();
  fotos = (p?.fotos || []).map((nome) => ({ nome, preview: fotoUrl(nome) }));
  $('#editor-titulo').textContent = p ? 'Editar criação' : 'Nova criação';
  $('#editor-salvar').textContent = p ? 'Salvar' : 'Publicar';
  $('#editor-salvar-baixo').textContent = p ? 'Salvar alterações' : 'Publicar na vitrine';
  $('#mais-detalhes').open = Boolean(p && (p.descricao || p.ocasioes.length || p.tipo === 'encomenda' || p.destaque));
  $('#precos-rapidos').innerHTML = PRECOS.map((v) => `<button type="button" class="chip" data-preco="${v}">${brl(v)}</button>`).join('');
  $('#editor-extra').hidden = !p;
  form.nome.value = p?.nome || '';
  form.preco.value = p?.preco ?? '';
  form.descricao.value = p?.descricao || '';
  form.tipo.value = p?.tipo || 'pronta';
  form.quantidade.value = p?.quantidade ?? (p ? '' : 1);
  form.destaque.checked = Boolean(p?.destaque);
  form.validade.min = hojeISO();
  form.validade.value = p ? p.validade || '' : somarDias(hojeISO(), 7);
  $('#ocasioes-editor').innerHTML = dados.ocasioes
    .map((o) => `<button type="button" class="chip" data-valor="${esc(o)}" aria-pressed="${Boolean(p?.ocasioes.includes(o))}">${esc(o)}</button>`)
    .join('');
  textoValidade();
  marcarPreco();
  renderFotos();
  editor.showModal();
}

function renderFotos() {
  $$('.foto-mini', $('#fotos-editor')).forEach((el) => el.remove());
  const add = $('.foto-add');
  fotos.forEach((f, i) => {
    const el = document.createElement('div');
    el.className = `foto-mini${i === 0 ? ' capa' : ''}${f.enviando ? ' enviando' : ''}`;
    el.innerHTML = `<img src="${f.preview}" alt=""><button type="button" class="tirar" aria-label="Remover foto">×</button>`;
    el.addEventListener('click', (e) => {
      if (e.target.closest('.tirar')) fotos.splice(i, 1);
      else fotos.unshift(...fotos.splice(i, 1));
      renderFotos();
    });
    add.before(el);
  });
}

function comprimir(arquivo, max = 1400) {
  return new Promise((ok, falha) => {
    const img = new Image();
    const url = URL.createObjectURL(arquivo);
    img.onload = () => {
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.84));
    };
    img.onerror = () => falha(new Error('Não consegui ler essa foto.'));
    img.src = url;
  });
}

$('#foto-input').addEventListener('change', async (e) => {
  const arquivos = [...e.target.files].slice(0, 5 - fotos.length);
  e.target.value = '';
  await Promise.all(
    arquivos.map(async (arquivo) => {
      const f = { nome: null, preview: '', enviando: true };
      try {
        f.preview = await comprimir(arquivo);
        fotos.push(f);
        renderFotos();
        f.nome = (await api('POST', '/api/foto', { imagem: f.preview })).foto;
      } catch (erro) {
        fotos = fotos.filter((x) => x !== f);
        toast(erro.message);
      }
      f.enviando = false;
      renderFotos();
    }),
  );
});

$('#ocasioes-editor').addEventListener('click', (e) => {
  const b = e.target.closest('[data-valor]');
  if (b) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
});

function marcarPreco() {
  $$('#precos-rapidos [data-preco]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preco === form.preco.value.trim())));
}

$('#precos-rapidos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-preco]');
  if (!b) return;
  form.preco.value = b.dataset.preco;
  marcarPreco();
});
form.preco.addEventListener('input', marcarPreco);

$('#sugerir').addEventListener('click', () => {
  const usados = new Set(dados.produtos.map((p) => p.nome));
  const livres = NOMES.filter((n) => !usados.has(n) && n !== form.nome.value);
  form.nome.value = (livres.length ? livres : NOMES)[Math.floor(Math.random() * (livres.length || NOMES.length))];
});

$$('[data-qtd]').forEach((b) =>
  b.addEventListener('click', () => {
    const atual = form.quantidade.value === '' ? 0 : Number(form.quantidade.value) || 0;
    const novo = atual + Number(b.dataset.qtd);
    form.quantidade.value = novo < 0 ? '' : novo;
  }),
);

$('#validade-chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dias]');
  if (!b) return;
  form.validade.value = b.dataset.dias === '' ? '' : somarDias(hojeISO(), Number(b.dataset.dias));
  textoValidade();
});
form.validade.addEventListener('change', textoValidade);

function textoValidade() {
  const v = form.validade.value;
  const d = v ? diasAte(v) : null;
  $$('#validade-chips [data-dias]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dias === (d === null ? '' : String(d)))));
  $('#validade-texto').textContent = v
    ? d === 0
      ? 'Sai da vitrine no fim do dia de hoje.'
      : `Sai da vitrine depois de ${dataBR(v)} e vai para a galeria sozinha.`
    : 'Fica na vitrine até você tirar.';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (fotos.some((f) => f.enviando)) return toast('Espera as fotos terminarem de subir 📷');
  if (!fotos.length && !confirm('Publicar sem foto? Com foto vende muito mais.')) return;
  const botoes = [$('#editor-salvar'), $('#editor-salvar-baixo')];
  botoes.forEach((b) => (b.disabled = true));
  const campos = {
    nome: form.nome.value,
    preco: form.preco.value,
    descricao: form.descricao.value,
    tipo: form.tipo.value,
    quantidade: form.quantidade.value,
    validade: form.validade.value || null,
    destaque: form.destaque.checked,
    fotos: fotos.map((f) => f.nome).filter(Boolean),
    ocasioes: $$('#ocasioes-editor [aria-pressed="true"]').map((b) => b.dataset.valor),
  };
  try {
    if (editando) {
      await alterar(editando.id, { ...campos, status: editando.status === 'arquivado' ? 'arquivado' : 'ativo' }, 'Salvo 💚');
      editor.close();
    } else {
      const p = await api('POST', '/api/catalogo', campos);
      dados.produtos.unshift(p);
      render();
      editor.close();
      abrirPublicado(p);
    }
  } catch (erro) {
    toast(erro.message);
  } finally {
    botoes.forEach((b) => (b.disabled = false));
  }
});

let publicadoAgora = null;

function abrirPublicado(p) {
  publicadoAgora = p;
  $('#publicado-foto').src = fotoUrl(p.fotos[0]);
  $('#publicado-story').hidden = !p.fotos.length;
  $('#publicado').showModal();
}

$('#publicado-wpp').addEventListener('click', () => {
  mandarNoWhatsApp(textoProduto(publicadoAgora));
  $('#publicado').close();
});

$('#publicado-story').addEventListener('click', () => {
  $('#publicado').close();
  abrirStory(publicadoAgora);
});

$('#editor-excluir').addEventListener('click', async () => {
  if (!editando || !confirm(`Excluir “${editando.nome}” de vez? Isso não tem volta. (Para só tirar da vitrine, use “Tirar”.)`)) return;
  try {
    await api('DELETE', `/api/catalogo?id=${editando.id}`);
    dados.produtos = dados.produtos.filter((p) => p.id !== editando.id);
    render();
    editor.close();
    toast('Excluído');
  } catch (erro) {
    toast(erro.message);
  }
});

// ---------- Story ----------

let storyProduto = null;
let storyModelo = 'creme';

async function abrirStory(p) {
  storyProduto = p;
  $('#story').showModal();
  await desenharStory($('#story-canvas'), p, dados.config, storyModelo);
}

$('#story-modelos').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-modelo]');
  if (!b) return;
  storyModelo = b.dataset.modelo;
  $$('#story-modelos [data-modelo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  await desenharStory($('#story-canvas'), storyProduto, dados.config, storyModelo);
});

function storyBlob() {
  return new Promise((ok) => $('#story-canvas').toBlob(ok, 'image/png'));
}

function nomeArquivo() {
  return `story-${storyProduto.nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}.png`;
}

$('#story-baixar').addEventListener('click', async () => {
  const url = URL.createObjectURL(await storyBlob());
  const a = Object.assign(document.createElement('a'), { href: url, download: nomeArquivo() });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});

$('#story-compartilhar').addEventListener('click', async () => {
  const link = `${location.origin}/?p=${storyProduto.id}`;
  navigator.clipboard?.writeText(link).catch(() => {});
  const arquivo = new File([await storyBlob()], nomeArquivo(), { type: 'image/png' });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: storyProduto.nome });
    } catch {}
  } else {
    $('#story-baixar').click();
    toast('Imagem baixada e link copiado ✨');
  }
});

// ---------- Loja ----------

const formLoja = $('#form-loja');

function linhaTamanho(t = {}) {
  return `<div class="linha tres"><input placeholder="Nome" value="${esc(t.nome)}" data-k="nome"><input placeholder="Descrição" value="${esc(t.descricao)}" data-k="descricao"><input placeholder="A partir de" inputmode="decimal" value="${t.aPartirDe ?? ''}" data-k="aPartirDe"><button type="button" aria-label="Remover">×</button></div>`;
}

function linhaComplemento(c = {}) {
  return `<div class="linha"><input placeholder="Nome" value="${esc(c.nome)}" data-k="nome"><input placeholder="Preço" inputmode="decimal" value="${c.preco ?? ''}" data-k="preco"><button type="button" aria-label="Remover">×</button></div>`;
}

function linhaDepoimento(d = {}) {
  return `<div class="linha dep"><input placeholder="Nome (ex.: Maria S.)" value="${esc(d.nome)}" data-k="nome"><textarea placeholder="O que a cliente escreveu" data-k="texto">${esc(d.texto)}</textarea><button type="button" aria-label="Remover">×</button></div>`;
}

const CAMPOS_LOJA = ['whatsapp', 'pix', 'instagram', 'cidade', 'endereco', 'horario', 'aviso', 'sobre', 'entrega', 'antecedencia', 'google', 'nota', 'avaliacoes'];
const LINHAS = { tamanhos: linhaTamanho, complementos: linhaComplemento, depoimentos: linhaDepoimento };

function preencherLoja() {
  const c = dados.config;
  for (const k of CAMPOS_LOJA) formLoja[k].value = c[k] ?? '';
  formLoja.whatsapp.value = c.whatsapp.replace(/^55/, '');
  formLoja.instagram.value = c.instagram ? `@${c.instagram}` : '';
  formLoja.nota.value = c.nota ? String(c.nota).replace('.', ',') : '';
  for (const [k, fn] of Object.entries(LINHAS)) $(`#linhas-${k}`).innerHTML = (c[k] || []).map(fn).join('');
}

formLoja.addEventListener('click', (e) => {
  if (e.target.matches('.linha button')) e.target.parentElement.remove();
  const add = e.target.dataset.add;
  if (add) $(`#linhas-${add}`).insertAdjacentHTML('beforeend', LINHAS[add]());
});

function lerLinhas(sel) {
  return $$(`${sel} .linha`).map((l) => Object.fromEntries($$('[data-k]', l).map((i) => [i.dataset.k, i.value])));
}

formLoja.addEventListener('submit', async (e) => {
  e.preventDefault();
  const entrada = Object.fromEntries(CAMPOS_LOJA.map((k) => [k, formLoja[k].value]));
  for (const k of Object.keys(LINHAS)) entrada[k] = lerLinhas(`#linhas-${k}`);
  const botao = $('.salvar-loja');
  botao.disabled = true;
  try {
    dados.config = await api('PUT', '/api/config', entrada);
    preencherLoja();
    toast('Dados da loja salvos 💚');
  } catch (erro) {
    toast(erro.message);
  } finally {
    botao.disabled = false;
  }
});

// ---------- Início ----------

// Sem internet não é motivo para deslogar: só a resposta 401 (tratada em api()) pede a senha de novo.
async function iniciar(tentativa = 0) {
  if (!token) return sair();
  try {
    await abrirPainel();
  } catch {
    if (!token) return;
    toast('Sem conexão. Tentando de novo…', 3000);
    setTimeout(() => iniciar(tentativa + 1), Math.min(10000, 2000 * (tentativa + 1)));
  }
}

iniciar();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
