// Regras do catálogo rotativo: o que está na vitrine, o que já saiu e virou galeria.

export const ARQ_PRODUTOS = 'dados/produtos.json';
export const ARQ_CONFIG = 'dados/config.json';

export const OCASIOES = [
  'Aniversário',
  'Amor',
  'Agradecimento',
  'Maternidade',
  'Casamento',
  'Formatura',
  'Condolências',
  'Só porque sim',
];

export const CONFIG_PADRAO = {
  nome: 'Simone Flores',
  whatsapp: '5534997168364',
  pix: '34997181745',
  instagram: 'simone.rezende.188',
  cidade: 'Uberlândia - MG',
  endereco: 'Av. Atlântica, 463 - Presidente Roosevelt',
  horario: 'Seg a Sáb · 9h às 18h\nDomingo fechado',
  entrega: 'Entregamos em Uberlândia. A taxa depende do bairro — combinamos pelo WhatsApp.',
  antecedencia: 'Encomendas com 1 dia de antecedência garantem as flores mais frescas.',
  sobre:
    'A Simone Flores nasceu do cuidado com cada detalhe — da escolha das flores ao laço final que envolve cada arranjo.\n\nAqui não tem catálogo fixo: toda semana nascem criações novas, e quando acabam, dão lugar às próximas. Também temos plantas, orquídeas, cestas personalizadas e tudo para o seu jardim.',
  aviso: '',
  // Perfil no Google: link, nota e quantidade de avaliações (atualizar de vez em quando no painel).
  google: 'https://share.google/fkQQJeKKAGJPss6A9',
  nota: 5,
  avaliacoes: 112,
  depoimentos: [
    { nome: 'Eduarda D.', texto: 'A Simone nos atende com muito carinho e faz os arranjos com cuidado, se atentando àquilo que queremos. Encomendei um arranjo maravilhoso para presente.' },
    { nome: 'Marcela G.', texto: 'A Simone é incrível, pedi um buquê perfeito, personalizado para parabenizar uma amiga e ela superou minhas expectativas. Sempre comprarei mais!' },
    { nome: 'Clara M.', texto: 'Atendimento ótimo, arranjos lindos e entrega rápida. Comprarei mais vezes ☺️' },
  ],
  tamanhos: [
    { nome: 'Pequeno', descricao: 'Delicado, cabe em qualquer abraço', aPartirDe: 90 },
    { nome: 'Médio', descricao: 'O queridinho para presentear', aPartirDe: 150 },
    { nome: 'Grande', descricao: 'Para causar aquele impacto', aPartirDe: 250 },
  ],
  complementos: [
    { nome: 'Cartão escrito à mão', preco: 0 },
    { nome: 'Caixa de chocolates', preco: 35 },
    { nome: 'Pelúcia', preco: 45 },
    { nome: 'Balão', preco: 25 },
  ],
};

export const PRODUTOS_PADRAO = { produtos: [] };

export function hojeSP() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function venceu(p, hoje = hojeSP()) {
  return Boolean(p.validade) && p.validade < hoje;
}

export function naVitrine(p, hoje = hojeSP()) {
  return p.status === 'ativo' && !venceu(p, hoje);
}

function texto(v, max) {
  return String(v ?? '').trim().slice(0, max);
}

function numeroOuNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function dataOuNull(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null;
}

export function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Limpa o que veio do painel antes de gravar.
export function normalizarProduto(entrada, anterior = {}) {
  const quantidade = numeroOuNull(entrada.quantidade);
  return {
    ...anterior,
    nome: texto(entrada.nome, 80) || 'Criação sem nome',
    descricao: texto(entrada.descricao, 600),
    preco: numeroOuNull(entrada.preco),
    fotos: (Array.isArray(entrada.fotos) ? entrada.fotos : [])
      .map((f) => texto(f, 300))
      .filter(Boolean)
      .slice(0, 5),
    ocasioes: (Array.isArray(entrada.ocasioes) ? entrada.ocasioes : []).filter((o) => OCASIOES.includes(o)),
    tipo: entrada.tipo === 'encomenda' ? 'encomenda' : 'pronta',
    quantidade: quantidade === null ? null : Math.floor(quantidade),
    validade: dataOuNull(entrada.validade),
    destaque: Boolean(entrada.destaque),
    status: entrada.status === 'arquivado' ? 'arquivado' : 'ativo',
    // Produtos de demonstração (fotos de banco de imagens) e o crédito exigido pela licença.
    exemplo: Boolean(entrada.exemplo),
    credito: texto(entrada.credito, 200),
  };
}

// O que o site público recebe: vitrine viva + galeria do que já saiu.
export function visaoPublica(produtos) {
  const hoje = hojeSP();
  const limpar = (p) => ({ ...p, esgotado: p.quantidade === 0 });
  const vitrine = produtos
    .filter((p) => naVitrine(p, hoje))
    .sort(
      (a, b) =>
        Number(a.quantidade === 0) - Number(b.quantidade === 0) ||
        Number(b.destaque) - Number(a.destaque) ||
        (b.publicadoEm || '').localeCompare(a.publicadoEm || ''))
    .map(limpar);
  const galeria = produtos
    .filter((p) => !naVitrine(p, hoje) && p.fotos.length)
    .sort((a, b) => (b.atualizadoEm || '').localeCompare(a.atualizadoEm || ''))
    .slice(0, 24)
    .map((p) => ({ id: p.id, nome: p.nome, fotos: p.fotos.slice(0, 1), ocasioes: p.ocasioes, preco: p.preco, credito: p.credito }));
  return { hoje, vitrine, galeria };
}

export function normalizarConfig(entrada) {
  const c = { ...CONFIG_PADRAO };
  for (const chave of ['nome', 'cidade', 'endereco', 'horario', 'entrega', 'antecedencia', 'aviso', 'pix']) {
    if (entrada[chave] !== undefined) c[chave] = texto(entrada[chave], 300);
  }
  if (entrada.sobre !== undefined) c.sobre = texto(entrada.sobre, 1200);
  if (entrada.google !== undefined) c.google = /^https:\/\//.test(entrada.google) ? texto(entrada.google, 300) : '';
  if (entrada.nota !== undefined) c.nota = Math.min(5, numeroOuNull(entrada.nota) ?? 0);
  if (entrada.avaliacoes !== undefined) c.avaliacoes = Math.floor(numeroOuNull(entrada.avaliacoes) ?? 0);
  if (Array.isArray(entrada.depoimentos)) {
    c.depoimentos = entrada.depoimentos
      .map((d) => ({ nome: texto(d.nome, 40), texto: texto(d.texto, 400) }))
      .filter((d) => d.nome && d.texto)
      .slice(0, 6);
  }
  if (entrada.whatsapp !== undefined) {
    let n = String(entrada.whatsapp).replace(/\D/g, '');
    if (n.length === 10 || n.length === 11) n = '55' + n;
    c.whatsapp = n || CONFIG_PADRAO.whatsapp;
  }
  if (entrada.instagram !== undefined) c.instagram = texto(entrada.instagram, 60).replace(/^@/, '');
  if (Array.isArray(entrada.tamanhos)) {
    c.tamanhos = entrada.tamanhos
      .map((t) => ({ nome: texto(t.nome, 40), descricao: texto(t.descricao, 80), aPartirDe: numeroOuNull(t.aPartirDe) }))
      .filter((t) => t.nome)
      .slice(0, 6);
  }
  if (Array.isArray(entrada.complementos)) {
    c.complementos = entrada.complementos
      .map((t) => ({ nome: texto(t.nome, 40), preco: numeroOuNull(t.preco) ?? 0 }))
      .filter((t) => t.nome)
      .slice(0, 10);
  }
  return c;
}
