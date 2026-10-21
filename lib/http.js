import { sessaoValida } from './auth.js';

export function enviar(res, status, dados, cache = 'no-store') {
  res.setHeader('Cache-Control', cache);
  res.status(status).json(dados);
}

export function exigirAdmin(req, res) {
  if (sessaoValida(req)) return true;
  enviar(res, 401, { erro: 'Faça login de novo.' });
  return false;
}

export function corpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

export async function rota(res, fn) {
  try {
    await fn();
  } catch (erro) {
    console.error(erro);
    enviar(res, 500, { erro: erro.message || 'Algo deu errado.' });
  }
}
