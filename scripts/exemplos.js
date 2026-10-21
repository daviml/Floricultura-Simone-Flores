// Carrega produtos de demonstração com fotos reais de buquês (Flickr, licença CC BY 2.0)
// para a Simone ver como o site fica. No painel, "Remover exemplos" apaga todos de uma vez.
//
// Uso:
//   node scripts/exemplos.js                                    → servidor local (senha "simone")
//   node scripts/exemplos.js https://seusite.vercel.app SENHA   → site publicado

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const SENHA = process.argv[3] || 'simone';
const CC = 'Flickr, CC BY 2.0';

const VITRINE = [
  {
    nome: 'Abraço de Rosas',
    descricao: 'Rosas cor-de-rosa colhidas no ponto, com mosquitinho e folhagem fresca.\nEmbrulho em papel de seda e laço de cetim.',
    preco: 169,
    ocasioes: ['Amor', 'Aniversário'],
    quantidade: 1,
    dias: 2,
    diasAtras: 0,
    destaque: true,
    fotos: ['https://live.staticflickr.com/5320/7099106625_3a903e2ed6_b.jpg', 'https://live.staticflickr.com/5508/9074239772_0ffa35af26_b.jpg'],
    credito: `Kurozumi e Patty Vicknair (${CC})`,
  },
  {
    nome: 'Encanto de Peônias',
    descricao: 'Peônias brancas e rosadas em vaso de vidro. Abrem devagar e perfumam a casa inteira por dias.',
    preco: 229,
    ocasioes: ['Casamento', 'Amor', 'Agradecimento'],
    quantidade: 2,
    dias: 4,
    diasAtras: 1,
    fotos: ['https://live.staticflickr.com/2831/9166367393_6bcf84f14d_b.jpg'],
    credito: `Rockspindeln (${CC})`,
  },
  {
    nome: 'Luz de Domingo',
    descricao: 'Rosas amarelas e tulipas num pote de vidro azul. Alegria para colocar na mesa.',
    preco: 119,
    ocasioes: ['Agradecimento', 'Formatura'],
    quantidade: 1,
    dias: 1,
    diasAtras: 2,
    fotos: ['https://live.staticflickr.com/7591/17188965676_1e60a6272d_b.jpg'],
    credito: `Berries.com (${CC})`,
  },
  {
    nome: 'Mimo Rosé',
    descricao: 'Mini rosas num vasinho branco, prontas para presentear. Pequeno no tamanho, enorme no carinho.',
    preco: 89,
    ocasioes: ['Só porque sim', 'Agradecimento', 'Maternidade'],
    quantidade: 3,
    dias: 7,
    diasAtras: 0,
    fotos: ['https://live.staticflickr.com/65535/40713705043_4707770d9e_b.jpg'],
    credito: `John Beans (${CC})`,
  },
  {
    nome: 'Dia de Sol',
    descricao: 'Girassóis graúdos num vaso de cerâmica. Para quem precisa de um dia mais feliz.',
    preco: 139,
    ocasioes: ['Aniversário', 'Agradecimento', 'Só porque sim'],
    quantidade: null,
    dias: 6,
    diasAtras: 3,
    fotos: ['https://live.staticflickr.com/65535/50366454337_7d676d8dd1_b.jpg'],
    credito: `kinglear55 (${CC})`,
  },
  {
    nome: 'Tulipas de Domingo',
    descricao: 'Tulipas cor-de-rosa num jarro branco. Delicadas, elegantes e cheias de luz.',
    preco: 159,
    ocasioes: ['Maternidade', 'Só porque sim'],
    quantidade: 2,
    dias: 0,
    diasAtras: 5,
    fotos: ['https://live.staticflickr.com/7714/16594701943_c3f0f4bc38_b.jpg'],
    credito: `Berries.com (${CC})`,
  },
  {
    nome: 'Festa em Flor',
    descricao: 'Alstroemérias coloridas em vaso. Duram até duas semanas e combinam com balão e chocolate.',
    preco: 149,
    tipo: 'encomenda',
    ocasioes: ['Aniversário'],
    quantidade: null,
    dias: null,
    diasAtras: 6,
    fotos: ['https://live.staticflickr.com/3922/18942293399_c88b6121e2_b.jpg'],
    credito: `ProFlowers.com (${CC})`,
  },
  {
    nome: 'Noiva Clássica',
    descricao: 'Buquê de noiva branco, com rosas, lisianthus e folhagem. Montado sob medida para o seu grande dia — combine a paleta com a Simone.',
    preco: null,
    tipo: 'encomenda',
    ocasioes: ['Casamento'],
    quantidade: null,
    dias: null,
    diasAtras: 8,
    fotos: ['https://live.staticflickr.com/4076/4758168832_ba70469829_b.jpg'],
    credito: `jenny downing (${CC})`,
  },
  {
    nome: 'Paixão Vermelha',
    descricao: 'Tulipas vermelhas com lírios brancos em vaso de vidro.',
    preco: 199,
    ocasioes: ['Amor'],
    quantidade: 0,
    dias: 3,
    diasAtras: 4,
    fotos: ['https://live.staticflickr.com/8600/16582300969_3a65e75929_b.jpg'],
    credito: `ProFlowers.com (${CC})`,
  },
];

const GALERIA = [
  { nome: 'Campo em Flor', preco: 180, ocasioes: ['Casamento'], diasAtras: 9, fotos: ['https://live.staticflickr.com/1942/44073173915_1f20b1334f_b.jpg'], credito: `Gareth1953 (${CC})` },
  { nome: 'Pôr do Sol', preco: 159, ocasioes: ['Aniversário'], diasAtras: 11, fotos: ['https://live.staticflickr.com/5015/5526964611_76ef13025c_b.jpg'], credito: `Muffet (${CC})` },
  { nome: 'Bem-me-quer', preco: 210, ocasioes: ['Casamento'], diasAtras: 13, fotos: ['https://live.staticflickr.com/2651/4094981066_a9be933c6a_b.jpg'], credito: `amrufm (${CC})` },
  { nome: 'Nuvem Azul', preco: 240, ocasioes: ['Casamento'], diasAtras: 15, fotos: ['https://live.staticflickr.com/3146/2523744308_43b2e02c5f_b.jpg'], credito: `EvinDC (${CC})` },
  { nome: 'Doce Manhã', preco: 129, ocasioes: ['Amor'], diasAtras: 18, fotos: ['https://live.staticflickr.com/5295/5410336214_098d376b54_b.jpg'], credito: `cchiao (${CC})` },
];

function hojeMais(dias) {
  if (dias === null || dias === undefined) return null;
  const d = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function pedir(metodo, caminho, token, corpo) {
  const res = await fetch(BASE + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${metodo} ${caminho}: ${res.status} ${json.erro || ''}`);
  return json;
}

async function subirFoto(url, token) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url}: ${res.status}`);
  const base64 = Buffer.from(await res.arrayBuffer()).toString('base64');
  return (await pedir('POST', '/api/foto', token, { imagem: `data:image/jpeg;base64,${base64}` })).foto;
}

const { token } = await pedir('POST', '/api/login', null, { senha: SENHA });
const atuais = await pedir('GET', '/api/catalogo?admin=1', token);
for (const p of atuais.produtos.filter((p) => p.exemplo)) {
  await pedir('DELETE', `/api/catalogo?id=${p.id}`, token);
}

// Galeria primeiro e vitrine do mais antigo para o mais novo: o painel lista o mais recente no topo.
const fila = [
  ...GALERIA.map((p) => ({ ...p, status: 'arquivado', dias: -1 })),
  ...[...VITRINE].sort((a, b) => b.diasAtras - a.diasAtras),
];
for (const { dias, fotos, ...p } of fila) {
  const nomes = [];
  for (const url of fotos) nomes.push(await subirFoto(url, token));
  await pedir('POST', '/api/catalogo', token, { ...p, fotos: nomes, validade: hojeMais(dias), exemplo: true });
  console.log(`✓ ${p.nome}`);
}
console.log(`\n${VITRINE.length} na vitrine e ${GALERIA.length} na galeria em ${BASE}`);
