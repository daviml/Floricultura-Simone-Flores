// PUT /api/config → salva os dados da loja (WhatsApp, horários, tamanhos, complementos...)

import { alterarJSON } from '../lib/store.js';
import { ARQ_CONFIG, CONFIG_PADRAO, normalizarConfig } from '../lib/catalogo.js';
import { corpo, enviar, exigirAdmin, rota } from '../lib/http.js';

export default function handler(req, res) {
  return rota(res, async () => {
    if (req.method !== 'PUT') return enviar(res, 405, { erro: 'Método não suportado.' });
    if (!exigirAdmin(req, res)) return;
    const entrada = corpo(req);
    const config = await alterarJSON(
      ARQ_CONFIG,
      CONFIG_PADRAO,
      (atual) => {
        const nova = normalizarConfig({ ...atual, ...entrada });
        for (const k of Object.keys(atual)) delete atual[k];
        Object.assign(atual, nova);
        return nova;
      },
      'Atualiza dados da loja',
    );
    enviar(res, 200, config);
  });
}
