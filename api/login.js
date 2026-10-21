import { conferirSenha, criarSessao, sessaoValida } from '../lib/auth.js';
import { corpo, enviar } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return enviar(res, 200, { ok: sessaoValida(req) });
  if (req.method !== 'POST') return enviar(res, 405, { erro: 'Método não suportado.' });
  if (!conferirSenha(corpo(req).senha)) {
    await new Promise((r) => setTimeout(r, 800));
    return enviar(res, 401, { erro: 'Senha incorreta.' });
  }
  enviar(res, 200, { token: criarSessao() });
}
