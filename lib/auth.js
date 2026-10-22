import crypto from 'node:crypto';

const DIAS = 30;

function senhaConfigurada() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  // Senha padrão só no PC ou na demonstração sem GITHUB_TOKEN, onde nada pode ser alterado.
  if (!process.env.VERCEL || !process.env.GITHUB_TOKEN) return 'simone';
  return null;
}

function segredo() {
  return process.env.SESSION_SECRET || `sf:${senhaConfigurada()}`;
}

function assinar(texto) {
  return crypto.createHmac('sha256', segredo()).update(texto).digest('base64url');
}

function iguais(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function conferirSenha(senha) {
  const certa = senhaConfigurada();
  return Boolean(certa) && iguais(senha || '', certa);
}

export function criarSessao() {
  const exp = Date.now() + DIAS * 24 * 60 * 60 * 1000;
  const corpo = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  return `${corpo}.${assinar(corpo)}`;
}

export function sessaoValida(req) {
  if (!senhaConfigurada()) return false;
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [corpo, assinatura] = token.split('.');
  if (!corpo || !assinatura || !iguais(assinatura, assinar(corpo))) return false;
  try {
    return JSON.parse(Buffer.from(corpo, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}
