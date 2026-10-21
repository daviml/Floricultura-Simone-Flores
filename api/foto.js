// GET  /api/foto?f=arquivo.jpg → entrega a foto (cache de 1 ano na CDN, o nome nunca muda)
// POST /api/foto               → recebe { imagem: "data:image/jpeg;base64,..." } já comprimida no celular

import { gravarBinario, lerBinario } from '../lib/store.js';
import { novoId } from '../lib/catalogo.js';
import { corpo, enviar, exigirAdmin, rota } from '../lib/http.js';

const TIPOS = { jpg: 'image/jpeg', webp: 'image/webp', png: 'image/png' };
const LIMITE = 3 * 1024 * 1024;

export default function handler(req, res) {
  return rota(res, async () => {
    if (req.method === 'GET') {
      const f = String(req.query.f || '');
      const m = f.match(/^[a-z0-9]+\.(jpg|webp|png)$/);
      if (!m) return enviar(res, 400, { erro: 'Arquivo inválido.' });
      const buffer = await lerBinario(`fotos/${f}`);
      if (!buffer) return enviar(res, 404, { erro: 'Foto não encontrada.' });
      res.setHeader('Content-Type', TIPOS[m[1]]);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.status(200).send(buffer);
    }

    if (req.method !== 'POST') return enviar(res, 405, { erro: 'Método não suportado.' });
    if (!exigirAdmin(req, res)) return;
    const m = String(corpo(req).imagem || '').match(/^data:image\/(jpeg|webp|png);base64,(.+)$/);
    if (!m) return enviar(res, 400, { erro: 'Imagem inválida.' });
    const buffer = Buffer.from(m[2], 'base64');
    if (buffer.length > LIMITE) return enviar(res, 413, { erro: 'Foto grande demais.' });
    const nome = `${novoId()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
    await gravarBinario(`fotos/${nome}`, buffer, `Foto ${nome}`);
    enviar(res, 201, { foto: nome });
  });
}
