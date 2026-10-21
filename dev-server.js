// Servidor local que imita a Vercel: arquivos de public/ + funções de api/.
// Uso: npm run dev  →  http://localhost:3000  (painel em /admin, senha local "simone")

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PORTA = Number(process.env.PORT) || 3000;
const RAIZ = path.resolve('public');
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function adaptar(req, res, url) {
  req.query = Object.fromEntries(url.searchParams);
  res.status = (s) => ((res.statusCode = s), res);
  res.json = (d) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(d));
  };
  res.send = (d) => res.end(d);
}

async function lerCorpo(req) {
  const partes = [];
  for await (const p of req) partes.push(p);
  const texto = Buffer.concat(partes).toString('utf8');
  try {
    return texto ? JSON.parse(texto) : {};
  } catch {
    return texto;
  }
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (url.pathname.startsWith('/api/')) {
        const nome = url.pathname.slice(5).replace(/[^a-z-]/g, '');
        const mod = await import(pathToFileURL(path.resolve('api', `${nome}.js`)).href);
        adaptar(req, res, url);
        req.body = await lerCorpo(req);
        return await mod.default(req, res);
      }
      let arquivo = path.join(RAIZ, decodeURIComponent(url.pathname));
      if (!arquivo.startsWith(RAIZ)) throw new Error('fora');
      const stat = await fs.stat(arquivo).catch(() => null);
      if (stat?.isDirectory()) arquivo = path.join(arquivo, 'index.html');
      else if (!stat) arquivo += '.html';
      const dados = await fs.readFile(arquivo);
      res.setHeader('Content-Type', TIPOS[path.extname(arquivo)] || 'application/octet-stream');
      res.end(dados);
    } catch (erro) {
      if (erro.code !== 'ENOENT') console.error(erro);
      res.statusCode = 404;
      res.end('Não encontrado');
    }
  })
  .listen(PORTA, () => console.log(`Simone Flores rodando em http://localhost:${PORTA}`));
