// GET  /api/catalogo           → site público (vitrine + galeria + dados da loja)
// GET  /api/catalogo?admin=1   → painel (todos os produtos)
// POST /api/catalogo           → cria produto
// PUT  /api/catalogo?id=...    → altera produto (campos parciais)
// DELETE /api/catalogo?id=...  → exclui produto e fotos

import { alterarJSON, apagar, lerJSON, usandoGitHub } from '../lib/store.js';
import {
  ARQ_CONFIG,
  ARQ_PRODUTOS,
  CONFIG_PADRAO,
  OCASIOES,
  PRODUTOS_PADRAO,
  normalizarProduto,
  novoId,
  visaoPublica,
} from '../lib/catalogo.js';
import { corpo, enviar, exigirAdmin, rota } from '../lib/http.js';

export default function handler(req, res) {
  return rota(res, async () => {
    const id = req.query.id;

    if (req.method === 'GET') {
      const [{ dados }, { dados: config }] = await Promise.all([
        lerJSON(ARQ_PRODUTOS, PRODUTOS_PADRAO),
        lerJSON(ARQ_CONFIG, CONFIG_PADRAO),
      ]);
      const loja = { ...CONFIG_PADRAO, ...config };
      if (req.query.admin) {
        if (!exigirAdmin(req, res)) return;
        return enviar(res, 200, { produtos: dados.produtos, config: loja, ocasioes: OCASIOES, usandoGitHub });
      }
      return enviar(
        res,
        200,
        { ...visaoPublica(dados.produtos), config: loja, ocasioes: OCASIOES },
        'public, s-maxage=20, stale-while-revalidate=300',
      );
    }

    if (!exigirAdmin(req, res)) return;
    const entrada = corpo(req);
    const agora = new Date().toISOString();

    if (req.method === 'POST') {
      const produto = await alterarJSON(
        ARQ_PRODUTOS,
        PRODUTOS_PADRAO,
        (dados) => {
          // Exemplos podem "ter sido publicados" há alguns dias, para a vitrine de demonstração parecer real.
          const quando = entrada.exemplo && entrada.diasAtras > 0 ? new Date(Date.now() - entrada.diasAtras * 86400000).toISOString() : agora;
          const p = { id: novoId(), ...normalizarProduto(entrada), criadoEm: quando, atualizadoEm: quando, publicadoEm: quando };
          dados.produtos.unshift(p);
          return p;
        },
        `Nova criação: ${entrada.nome || 'sem nome'}`,
      );
      return enviar(res, 201, produto);
    }

    if (!id) return enviar(res, 400, { erro: 'Produto não informado.' });

    if (req.method === 'PUT') {
      const produto = await alterarJSON(
        ARQ_PRODUTOS,
        PRODUTOS_PADRAO,
        (dados) => {
          const i = dados.produtos.findIndex((p) => p.id === id);
          if (i < 0) return null;
          const anterior = dados.produtos[i];
          const p = normalizarProduto({ ...anterior, ...entrada }, anterior);
          p.atualizadoEm = agora;
          if (anterior.status !== 'ativo' && p.status === 'ativo') p.publicadoEm = agora;
          dados.produtos[i] = p;
          return p;
        },
        `Atualiza: ${entrada.nome || id}`,
      );
      return produto ? enviar(res, 200, produto) : enviar(res, 404, { erro: 'Produto não encontrado.' });
    }

    if (req.method === 'DELETE') {
      const removido = await alterarJSON(
        ARQ_PRODUTOS,
        PRODUTOS_PADRAO,
        (dados) => {
          const i = dados.produtos.findIndex((p) => p.id === id);
          if (i < 0) return null;
          const [p] = dados.produtos.splice(i, 1);
          const emUso = new Set(dados.produtos.flatMap((o) => o.fotos));
          return { p, orfas: p.fotos.filter((f) => !f.includes('/') && !emUso.has(f)) };
        },
        `Exclui: ${id}`,
      );
      if (!removido) return enviar(res, 404, { erro: 'Produto não encontrado.' });
      await Promise.allSettled(removido.orfas.map((f) => apagar(`fotos/${f}`, `Remove foto ${f}`)));
      return enviar(res, 200, { ok: true });
    }

    enviar(res, 405, { erro: 'Método não suportado.' });
  });
}
