# Relatório — Lojinha do Leonardo Mohammed

Atualizado em 12/10/2026. Cobre tudo o que foi feito até aqui: conexão com o fornecedor, backend, banco, frontend, cadastro de produtos e deploy.

## 1. Situação atual

| Parte | Estado | Como foi verificado |
|---|---|---|
| Conexão com a API do fornecedor | Funcionando | Chamadas reais com a chave: catálogo (85 itens), saldo e pedidos |
| Backend (Node + Express) | Escrito, sobe e responde | Testado sem banco: `/health`, autenticação do admin, cliente do fornecedor |
| Banco MySQL | Schema escrito, **não executado** | Não há MySQL nem Docker nesta máquina |
| Sincronização e cadastro (SQL) | Escritos, **não executados** | Dependem do MySQL |
| Frontend (Next.js) | Funcionando | Build e lint sem erros; vitrine e detalhe testados com os 85 produtos reais |
| Tela de admin | Escrita, compila | Não testada de ponta a ponta (depende do banco) |
| Checkout / pagamento | **Não feito** | Não estava no trecho do PRD que recebi |
| Deploy no Easypanel | Dockerfiles prontos, **não publicado** | — |

O PRD chegou incompleto: recebi o título, o item de listagem em grade, o item de detalhe do produto e a seção 5 (infraestrutura). As seções 1 a 4 não chegaram inteiras, então o que está fora disso foi decidido por mim e está listado na seção 9.

## 2. Arquitetura

```
Navegador ──> Frontend Next.js (porta 3000)
                 │  páginas buscam dados no servidor
                 │  /api/* é repassado ao backend
                 ▼
              Backend Express (porta 4000) ──> MySQL
                 │
                 ▼
              API do fornecedor (ggsoma.store)
```

- O navegador só fala com o frontend. A chave do fornecedor fica apenas no backend.
- A vitrine lê do MySQL, não direto do fornecedor. Assim dá para editar nome, descrição, fotos e preço, e a loja continua no ar se o fornecedor cair.

```
Lojinha/
├─ backend/            API Express + MySQL
│  ├─ schema.sql       tabela products
│  ├─ src/server.js    sobe o servidor e aplica o schema
│  ├─ src/db.js        pool de conexão MySQL
│  ├─ src/partner.js   cliente da API do fornecedor
│  ├─ src/sync.js      importação do catálogo + cálculo de preço
│  ├─ src/products.js  rotas públicas e de admin
│  └─ Dockerfile
├─ frontend/           Next.js 16 + Tailwind 4
│  ├─ app/page.tsx                 vitrine em grade
│  ├─ app/produto/[slug]/page.tsx  detalhe do produto
│  ├─ app/admin/page.tsx           cadastro de produtos
│  ├─ app/api/[...path]/route.ts   repasse para o backend
│  └─ Dockerfile
├─ docker-compose.yml  MySQL local para desenvolvimento
└─ RELATORIO.md
```

## 3. Conexão com a API do fornecedor

- Base: `https://ggsoma.store/api/partner/v1`
- Autenticação: cabeçalho `Authorization: Bearer <chave>`

| Rota | Resultado do teste |
|---|---|
| `GET /catalog` | **404** — a rota do resumo da documentação não existe |
| `GET /catalog/products` | 200 — é a rota real do catálogo, 85 produtos |
| `GET /usage` | 200 — saldo US$ 0,30, nenhum pedido feito |
| `GET /orders` | 200 — lista vazia, paginada (`page`, `limit`, `total`) |
| `POST /orders` | **Não chamado** — gasta saldo real |

Em um dos testes o `/usage` devolveu 502 (instabilidade do lado deles). O backend trata isso e responde 502 com mensagem clara.

Campos de cada produto que o sistema usa: `id`, `slug`, `name`, `provider.name` (vira categoria), `emoji.normal`, `deliveryType` (`LINK`, `READY_ACCOUNT`, `COUPON`), `durationDays`, `yourPrice` (custo em USD) e `stock.inStock` / `stock.count`. O fornecedor não envia fotos nem descrição.

Do catálogo de hoje: 85 produtos, 29 sem estoque e 1 com preço zero (Canva Business Plan 1 Month), que entra oculto.

## 4. Banco de dados (MySQL)

Uma tabela, `products`, definida em `backend/schema.sql`:

| Coluna | Uso |
|---|---|
| `id` | Chave interna |
| `partner_id` | ID no fornecedor; nulo para produto cadastrado à mão |
| `slug` | Endereço da página do produto |
| `name`, `description`, `category`, `emoji`, `images` | Conteúdo da vitrine (`images` é uma lista de URLs em JSON) |
| `delivery_type`, `duration_days` | Tipo de entrega e duração |
| `cost_usd` | Custo no fornecedor |
| `price_brl` | Preço de venda |
| `price_locked` | 1 = preço fixado à mão, a sincronização não mexe |
| `stock`, `active` | Estoque e visibilidade na loja |
| `synced_at`, `created_at`, `updated_at` | Datas |

O backend aplica o schema sozinho ao subir (`CREATE TABLE IF NOT EXISTS`).

## 5. Backend

Rotas públicas:

| Rota | O que faz |
|---|---|
| `GET /health` | Verifica a conexão com o banco |
| `GET /api/products` | Produtos ativos; aceita `?category=` e `?q=` |
| `GET /api/products/:slug` | Um produto |
| `GET /api/categories` | Categorias com contagem |

Rotas de admin (exigem o cabeçalho `x-admin-token`):

| Rota | O que faz |
|---|---|
| `GET /api/admin/products` | Todos os produtos, inclusive ocultos, com custo |
| `POST /api/admin/products` | Cadastra produto manual |
| `PUT /api/admin/products/:id` | Edita |
| `DELETE /api/admin/products/:id` | Exclui |
| `POST /api/admin/sync` | Importa o catálogo do fornecedor |
| `GET /api/admin/partner/usage` | Saldo no fornecedor |

Variáveis em `backend/.env` (modelo em `.env.example`): `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PARTNER_API_URL`, `PARTNER_API_KEY`, `ADMIN_TOKEN`, `USD_BRL_RATE`, `MARKUP_PERCENT`, `FRONTEND_ORIGIN`.

## 6. Cadastro de produtos

Há dois caminhos, ambos na tela `/admin` do frontend (entra com o `ADMIN_TOKEN`).

**Importação do fornecedor** — botão "Sincronizar fornecedor" (ou `npm run sync` no backend):

- Produto novo é criado com nome, categoria, custo, estoque e preço calculado.
- Produto já existente só tem custo, estoque, duração e tipo de entrega atualizados. Nome, descrição, fotos e visibilidade editados no admin são preservados.
- Produto que sumiu do fornecedor fica com estoque zero.

**Cadastro manual** — botão "Novo produto": nome, categoria, emoji, preço, estoque, descrição, fotos (uma URL por linha) e visibilidade.

**Preço:** `preço em R$ = custo em USD × USD_BRL_RATE × (1 + MARKUP_PERCENT / 100)`. Com os valores atuais (5,50 e 100%), um custo de US$ 0,90 vira R$ 9,90. Editar o preço no admin trava o valor (🔒) e a sincronização deixa de recalculá-lo.

## 7. Frontend

- **Vitrine (`/`)**: grade de cards (2 colunas no celular, 4 no desktop), busca por nome e filtro por categoria. Sem estoque aparece como "Esgotado" e vai para o fim.
- **Detalhe (`/produto/<slug>`)**: fotos, preço, duração, tipo de entrega, categoria e descrição. Optei por página em vez de modal, porque dá link direto para compartilhar.
- **Botão de compra**: abre o WhatsApp com a mensagem pronta se `WHATSAPP_NUMBER` estiver definido; sem isso mostra "Compra online em breve".
- **Fotos**: como o fornecedor não envia imagens, o card sem foto mostra um bloco colorido com a categoria. Cadastrando a URL no admin, a foto entra no lugar.
- **Visual**: tema escuro em verde e dourado. Não tive acesso à "Lojinha do Rolex", então o estilo é uma aproximação pelo nome.

Variáveis do frontend (`frontend/.env.example`): `API_URL` e `WHATSAPP_NUMBER`.

## 8. Como rodar

Localmente (precisa de um MySQL; o `docker-compose.yml` sobe um se houver Docker):

```
docker compose up -d            # MySQL local
cd backend  && npm install && npm run dev     # http://localhost:4000
npm run sync                                  # importa o catálogo
cd frontend && npm install && npm run dev     # http://localhost:3000
```

No Easypanel:

1. Serviço MySQL: criar banco e usuário.
2. Serviço backend: apontar para a pasta `backend/` (usa o `Dockerfile`), porta 4000, com as variáveis da seção 5. Não precisa de domínio público.
3. Serviço frontend: pasta `frontend/`, porta 3000, com `API_URL` = endereço interno do backend e `WHATSAPP_NUMBER`.
4. Abrir `/admin`, entrar com o token e clicar em "Sincronizar fornecedor".

## 9. Decisões que tomei sem o PRD completo

| Decisão | Motivo |
|---|---|
| Backend em Node + Express + `mysql2`, sem ORM | Poucas tabelas; menos peças para manter |
| Vitrine lê do MySQL, não do fornecedor | Permite editar e não depende do fornecedor no ar |
| Câmbio 5,50 e margem de 100% | Valores de partida, trocáveis no `.env` |
| Página de detalhe em vez de modal | O PRD permitia os dois |
| Compra pelo WhatsApp | Não recebi a parte de pagamento |
| Admin protegido por um token único | Suficiente para um dono só |

## 10. Pendências e riscos

- **Chave do fornecedor exposta**: ela foi colada na conversa. Recomendo gerar outra no painel do fornecedor e trocar em `backend/.env`.
- **`ADMIN_TOKEN`** está com o valor de exemplo `troque-este-token`; trocar antes de publicar.
- **Banco nunca foi executado**: o primeiro teste com MySQL real pode revelar ajustes no SQL.
- **Checkout**: falta definir meio de pagamento (Pix?), criação do pedido no fornecedor (`POST /orders`) e entrega ao cliente.
- **Saldo no fornecedor**: US$ 0,30, insuficiente para a maioria dos produtos.
- **Natureza dos produtos**: são contas e assinaturas de terceiros revendidas (Netflix, Spotify, ChatGPT etc.). Esse tipo de revenda costuma violar os termos dessas empresas e as contas podem ser canceladas; no Brasil, quem vende responde perante o cliente. Vale ter uma política de garantia e reembolso antes de vender.
- **Produto inexistente** mostra a tela de "não encontrado", mas com status HTTP 200 em vez de 404.
