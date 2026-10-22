// Armazenamento do catálogo.
// Em produção grava tudo num branch separado do próprio repositório no GitHub
// (por padrão "catalogo"), então não existe banco de dados: só GitHub + Vercel.
// Na Vercel sem GITHUB_TOKEN, lê o catálogo do repositório público (só leitura: dá para mostrar, não para publicar).
// No PC, sem GITHUB_TOKEN, usa a pasta .data/ do projeto.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.GITHUB_TOKEN;
const REPO =
  process.env.GITHUB_REPO ||
  (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
    ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
    : 'daviml/Floricultura-Simone-Flores');
const BRANCH = process.env.DATA_BRANCH || 'catalogo';
const LOCAL_DIR = path.join(process.cwd(), '.data');

export const usandoGitHub = Boolean(TOKEN && REPO);
const soLeitura = !usandoGitHub && Boolean(process.env.VERCEL);
export const modo = usandoGitHub ? 'github' : soLeitura ? 'leitura' : 'local';

const AVISO_LEITURA = 'O painel está em modo demonstração: para publicar, falta configurar o GITHUB_TOKEN na Vercel.';

async function rawLer(arquivo) {
  const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${arquivo}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub: ${res.status} ao ler ${arquivo}`);
  return { sha: null, conteudo: Buffer.from(await res.arrayBuffer()) };
}

// ---------- GitHub ----------

async function gh(method, url, body, accept = 'application/vnd.github+json') {
  const res = await fetch(`https://api.github.com/repos/${REPO}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'simone-flores-app',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

let branchPronto = false;
async function garantirBranch() {
  if (branchPronto) return;
  const ref = await gh('GET', `/git/ref/heads/${BRANCH}`);
  if (ref.ok) {
    branchPronto = true;
    return;
  }
  if (ref.status !== 404) throw new Error(`GitHub: ${ref.status} ao ler branch`);
  const repo = await (await gh('GET', '')).json();
  const base = await (await gh('GET', `/git/ref/heads/${repo.default_branch}`)).json();
  const criado = await gh('POST', '/git/refs', { ref: `refs/heads/${BRANCH}`, sha: base.object.sha });
  if (!criado.ok && criado.status !== 422) throw new Error(`GitHub: ${criado.status} ao criar branch`);
  branchPronto = true;
}

async function ghLer(arquivo) {
  const res = await gh('GET', `/contents/${arquivo}?ref=${BRANCH}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub: ${res.status} ao ler ${arquivo}`);
  const json = await res.json();
  return { sha: json.sha, conteudo: Buffer.from(json.content, 'base64') };
}

async function ghLerBinario(arquivo) {
  const res = await gh('GET', `/contents/${arquivo}?ref=${BRANCH}`, null, 'application/vnd.github.raw');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub: ${res.status} ao ler ${arquivo}`);
  return Buffer.from(await res.arrayBuffer());
}

async function ghGravar(arquivo, buffer, sha, mensagem) {
  await garantirBranch();
  const res = await gh('PUT', `/contents/${arquivo}`, {
    message: mensagem,
    content: buffer.toString('base64'),
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  });
  if (res.status === 409 || res.status === 422) {
    const erro = new Error('conflito');
    erro.conflito = true;
    throw erro;
  }
  if (!res.ok) throw new Error(`GitHub: ${res.status} ao gravar ${arquivo}`);
}

async function ghApagar(arquivo, mensagem) {
  const atual = await ghLer(arquivo);
  if (!atual) return;
  await gh('DELETE', `/contents/${arquivo}`, { message: mensagem, sha: atual.sha, branch: BRANCH });
}

// ---------- Local ----------

async function localLer(arquivo) {
  try {
    return { sha: null, conteudo: await fs.readFile(path.join(LOCAL_DIR, arquivo)) };
  } catch {
    return null;
  }
}

async function localGravar(arquivo, buffer) {
  if (soLeitura) throw new Error(AVISO_LEITURA);
  const destino = path.join(LOCAL_DIR, arquivo);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, buffer);
}

// ---------- API usada pelas rotas ----------

export async function lerJSON(arquivo, padrao) {
  const atual = usandoGitHub ? await ghLer(arquivo) : soLeitura ? await rawLer(arquivo) : await localLer(arquivo);
  if (!atual) return { dados: structuredClone(padrao), sha: null };
  return { dados: JSON.parse(atual.conteudo.toString('utf8')), sha: atual.sha };
}

// Lê, aplica a alteração e grava. Repete se outra gravação aconteceu no meio.
export async function alterarJSON(arquivo, padrao, alterar, mensagem) {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const { dados, sha } = await lerJSON(arquivo, padrao);
    const resultado = await alterar(dados);
    const buffer = Buffer.from(JSON.stringify(dados, null, 2) + '\n', 'utf8');
    try {
      if (usandoGitHub) await ghGravar(arquivo, buffer, sha, mensagem);
      else await localGravar(arquivo, buffer);
      return resultado;
    } catch (erro) {
      if (!erro.conflito) throw erro;
    }
  }
  throw new Error('Não foi possível salvar agora, tente de novo.');
}

export async function gravarBinario(arquivo, buffer, mensagem) {
  if (usandoGitHub) await ghGravar(arquivo, buffer, null, mensagem);
  else await localGravar(arquivo, buffer);
}

export async function lerBinario(arquivo) {
  if (usandoGitHub) return ghLerBinario(arquivo);
  const atual = soLeitura ? await rawLer(arquivo) : await localLer(arquivo);
  return atual ? atual.conteudo : null;
}

export async function apagar(arquivo, mensagem) {
  if (usandoGitHub) return ghApagar(arquivo, mensagem);
  if (soLeitura) throw new Error(AVISO_LEITURA);
  await fs.rm(path.join(LOCAL_DIR, arquivo), { force: true });
}
