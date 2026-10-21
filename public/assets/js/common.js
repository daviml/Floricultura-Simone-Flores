// Utilidades compartilhadas entre o site e o painel.

export const PLACEHOLDER = '/assets/img/buque.svg';

export function fotoUrl(f, absoluta = false) {
  if (!f) return PLACEHOLDER;
  if (/^(https?:|data:|\/)/.test(f)) return f;
  const rel = `/api/foto?f=${encodeURIComponent(f)}`;
  return absoluta ? location.origin + rel : rel;
}

export function brl(n) {
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: n % 1 ? 2 : 0 });
}

export function waLink(numero, texto) {
  // api.whatsapp.com direto: o redirecionamento do wa.me estraga alguns emojis.
  return `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(texto)}`;
}

export function dataBR(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function hojeISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function somarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasAte(iso, hoje = hojeISO()) {
  return Math.round((new Date(`${iso}T12:00:00`) - new Date(`${hoje}T12:00:00`)) / 86400000);
}

export function diasDesde(isoDataHora) {
  if (!isoDataHora) return Infinity;
  return (Date.now() - new Date(isoDataHora)) / 86400000;
}

// Selos que criam urgência e mostram que a vitrine está viva.
export function selos(p, hoje = hojeISO()) {
  const s = [];
  if (p.esgotado || p.quantidade === 0) return [{ texto: 'Esgotado', classe: 'cinza' }];
  if (p.validade) {
    const d = diasAte(p.validade, hoje);
    if (d <= 0) s.push({ texto: 'Último dia', classe: 'urgente' });
    else if (d === 1) s.push({ texto: 'Só até amanhã', classe: 'urgente' });
    else if (d <= 4) s.push({ texto: `Até ${dataBR(p.validade)}`, classe: 'ouro' });
  }
  if (p.quantidade === 1) s.push({ texto: 'Última unidade', classe: 'urgente' });
  else if (p.quantidade === 2) s.push({ texto: 'Últimas 2', classe: 'urgente' });
  if (diasDesde(p.publicadoEm) < 3) s.push({ texto: 'Novo', classe: 'novo' });
  if (p.tipo === 'encomenda') s.push({ texto: 'Sob encomenda', classe: '' });
  if (p.destaque && s.length < 2) s.push({ texto: 'Queridinho', classe: 'ouro' });
  return s.slice(0, 3);
}

// Datas que mais vendem flor no Brasil. Dia das Mães e dos Pais caem no 2º domingo do mês.
function segundoDomingo(ano, mes) {
  const d = new Date(ano, mes - 1, 1);
  const primeiro = ((7 - d.getDay()) % 7) + 1;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(primeiro + 7).padStart(2, '0')}`;
}

export function proximasDatas(hoje = hojeISO(), janela = 30) {
  const ano = Number(hoje.slice(0, 4));
  const lista = [];
  for (const a of [ano, ano + 1]) {
    const fixa = (m, d) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    lista.push(
      { nome: 'Dia da Mulher', data: fixa(3, 8), dica: 'Buquês delicados e mimos vendem muito.' },
      { nome: 'Dia das Mães', data: segundoDomingo(a, 5), dica: 'A maior data do ano: publique cedo e aceite encomendas.' },
      { nome: 'Dia dos Namorados', data: fixa(6, 12), dica: 'Rosas vermelhas, cartão e chocolate.' },
      { nome: 'Dia dos Avós', data: fixa(7, 26), dica: 'Vasos e plantas que duram fazem sucesso.' },
      { nome: 'Dia dos Pais', data: segundoDomingo(a, 8), dica: 'Plantas e arranjos sóbrios.' },
      { nome: 'Dia da Secretária', data: fixa(9, 30), dica: 'Empresas compram: ofereça arranjos para mesa.' },
      { nome: 'Dia dos Professores', data: fixa(10, 15), dica: 'Mimos pequenos e baratos vendem em quantidade.' },
      { nome: 'Finados', data: fixa(11, 2), dica: 'Arranjos e coroas sob encomenda. Marque a ocasião Condolências.', aviso: 'Finados (02/11): arranjos e homenagens sob encomenda. Peça com antecedência.' },
      { nome: 'Natal', data: fixa(12, 25), dica: 'Arranjos de mesa e presentes com vaso.' },
    );
  }
  return lista
    .map((d) => ({ ...d, faltam: diasAte(d.data, hoje) }))
    .filter((d) => d.faltam >= 0 && d.faltam <= janela)
    .sort((a, b) => a.faltam - b.faltam)
    .map((d) => ({ ...d, aviso: d.aviso || `${d.nome} é dia ${dataBR(d.data)}! Garanta o seu presente com antecedência 💐` }));
}

export function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

let toastEl;
export function toast(msg, ms = 2600) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    document.body.append(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('visivel');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('visivel'), ms);
}

export async function compartilhar({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  await navigator.clipboard.writeText(url);
  toast('Link copiado! É só colar no WhatsApp 💚');
}
