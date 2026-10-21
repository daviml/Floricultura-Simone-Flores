# Simone Flores · vitrine viva

Site + app instalável (PWA) da floricultura **Simone Flores**. Não tem APK nem loja de apps: abre no navegador e o
próprio navegador oferece "Instalar" / "Adicionar à tela inicial".

- **Site público** (`/`): vitrine que muda sempre, "Monte o seu buquê", galeria do ateliê, pedido pronto no WhatsApp.
- **Painel da Simone** (`/admin`): ela tira a foto, dá nome e preço e publica. Também gera a arte do Story.

Só usa **GitHub + Vercel**. Não tem banco de dados: o catálogo e as fotos ficam no branch `catalogo` deste repositório,
gravados pelas funções da Vercel com um token do GitHub.

## Como funciona o catálogo rotativo

Cada criação tem:

| Campo | Para quê |
|---|---|
| Fica na vitrine até | Passou da data, sai sozinha da vitrine e vai para a galeria "Do nosso ateliê" |
| Quantidade | `Vendi 1` desconta; zerou → aparece como **Esgotado** com o botão "Quero um parecido" |
| Pronta entrega / Sob encomenda | Muda o texto do botão e o selo |
| Destaque | Vai para o topo e para a foto grande do início do site |

Os selos ("Novo", "Último dia", "Última unidade", "Até 24/10") são calculados sozinhos e criam urgência.
Qualquer peça da galeria pode voltar para a vitrine com um toque.

## Rodar no PC

```bash
npm run dev
# http://localhost:3000        site
# http://localhost:3000/admin  painel (senha local: simone)
```

Sem `GITHUB_TOKEN`, tudo é salvo na pasta `.data/` (ignorada pelo git).

## Produtos de exemplo

```bash
node scripts/exemplos.js                                    # local
node scripts/exemplos.js https://seusite.vercel.app SENHA   # site publicado
```

Cria 9 criações na vitrine e 5 na galeria com fotos reais de buquês (Flickr, licença CC BY 2.0, crédito do autor
em cada produto). Aparecem com o selo **Exemplo** no painel e "Foto ilustrativa" no site. Rodar de novo substitui
os exemplos. No painel, **Remover exemplos** apaga todos de uma vez — fazer isso antes de divulgar o site.

## Publicar (uma vez só)

1. **Token do GitHub** — GitHub → Settings → Developer settings → *Fine-grained tokens* → Generate.
   - Repository access: *Only select repositories* → `Floricultura-Simone-Flores`
   - Permissions → Repository → **Contents: Read and write**
   - Validade: o máximo possível (anote para renovar antes de vencer).
2. **Vercel** — *Add New → Project* → importar o repositório. Framework: **Other**. Não precisa de build.
3. Em *Settings → Environment Variables* criar:

   | Nome | Valor |
   |---|---|
   | `ADMIN_PASSWORD` | senha do painel da Simone |
   | `GITHUB_TOKEN` | o token do passo 1 |
   | `GITHUB_REPO` | `daviml/Floricultura-Simone-Flores` |
   | `SESSION_SECRET` | um texto aleatório longo (opcional, recomendado) |

4. *Deployments → Redeploy*. Pronto: o primeiro produto publicado cria o branch `catalogo` sozinho.

O `vercel.json` desliga deploy do branch `catalogo`, então publicar produto **não** gera build novo — a mudança aparece
no site em até ~20 segundos (cache da CDN).

## Instalar o app no celular da Simone

- **Android (Chrome):** abrir `seusite.vercel.app/admin` → menu ⋮ → *Instalar app*.
- **iPhone (Safari):** abrir o link → Compartilhar → *Adicionar à Tela de Início*.

O ícone abre direto no painel. Clientes podem instalar o site (`/`) do mesmo jeito.

## Estrutura

```
api/        funções da Vercel (catalogo, foto, login, config)
lib/        regras do catálogo, armazenamento no GitHub, login
public/     site, painel, css, js, ícones, service worker
dev-server.js  servidor local que imita a Vercel
```
