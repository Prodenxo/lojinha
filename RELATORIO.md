# Relatório — Lojinha do Leonardo Mohammed

Atualizado em 12/10/2026. Cobre tudo o que foi feito: conexão com o fornecedor, banco, backend, cadastro de produtos, frontend, checkout e deploy.

- Loja: https://mohammed-lojinhafrontend.bhtdat.easypanel.host
- Admin: `/admin` (produtos) e `/admin/pedidos` (pedidos)
- Código: https://github.com/Prodenxo/lojinha (privado)

## 1. Situação atual

| Parte | Estado | Como foi verificado |
|---|---|---|
| Conexão com a API do fornecedor | Funcionando | Chamadas reais: catálogo, saldo e pedidos |
| Banco MySQL (Easypanel) | Funcionando | Tabela criada e 85 produtos importados em produção |
| Backend | No ar | Rotas de produtos e admin testadas em produção |
| Vitrine e detalhe do produto | No ar | Testadas em produção e localmente |
| Logos, destaque e promoção | Enviados ao GitHub | Vitrine testada com backend simulado; colunas novas do banco ainda não rodaram em produção |
| Esgotados ocultos e sincronização a cada 30 min | Enviados ao GitHub | Só checagem de sintaxe; não rodou contra o banco |
| Checkout com InfinitePay | Enviado ao GitHub, **não testado de ponta a ponta** | Build e lint passam; falta a InfiniteTag para gerar um pagamento real |
| Entrega automática pelo fornecedor | **Não feita** | Falta a documentação de `POST /orders` |

## 2. Arquitetura

```
Navegador ──> Frontend Next.js ──(/api/*)──> Backend Express ──> MySQL
                                                │
                                                ├──> API do fornecedor (ggsoma.store)
                                                └──> InfinitePay (pagamento)
```

- O navegador só fala com o frontend, que repassa `/api/*` ao backend pela rede interna do Easypanel. O backend não tem domínio público.
- A chave do fornecedor fica só no backend.
- A vitrine lê do MySQL, não direto do fornecedor: dá para editar produtos e a loja não cai junto com ele.

Serviços no Easypanel (projeto `mohammed`): `lojinha` (MySQL), `lojinhabackend` e `lojinhafrontend`. O backend escuta na porta 80 lá.

## 3. API do fornecedor

- Base: `https://ggsoma.store/api/partner/v1`, com `Authorization: Bearer <chave>`.

| Rota | Resultado |
|---|---|
| `GET /catalog` | 404 — a rota do resumo da documentação não existe |
| `GET /catalog/products` | Rota real do catálogo |
| `GET /usage` | Saldo (US$ 0,30 no último teste) |
| `GET /orders` | Lista paginada, vazia |
| `POST /orders` | Não usada. Um teste com corpo vazio mostrou que exige `externalOrderId`; o restante é desconhecido |

O fornecedor não envia fotos nem descrição, e os emojis que envia não são usados.

## 4. Banco de dados

Tabela `products`: dados da vitrine (`name`, `description`, `category`, `images`), `cost_usd`, `price_brl`, `price_locked`, `promo_price_brl`, `featured`, `stock`, `active`, e `partner_id` (nulo em produto manual).

Tabela `orders`: `code` (código aleatório do pedido), produto, `amount_cents`, e-mail e WhatsApp do cliente, `status` (`pending`, `paid`, `delivered`, `cancelled`), dados do pagamento (`transaction_nsu`, `invoice_slug`, `capture_method`, `receipt_url`) e `delivery` (o que o cliente recebe).

O backend cria as tabelas e as colunas novas sozinho ao subir.

## 5. Backend

Rotas públicas:

| Rota | O que faz |
|---|---|
| `GET /health` | Verifica o banco |
| `GET /api/products`, `/api/products/:slug`, `/api/categories` | Vitrine (só ativos e com estoque na listagem) |
| `POST /api/orders` | Cria o pedido e devolve o link de pagamento |
| `GET /api/orders/:code` | Situação do pedido; a entrega só aparece depois de liberada |
| `POST /api/orders/:code/confirm` | Confirma o pagamento quando o cliente volta da InfinitePay |
| `POST /api/webhooks/infinitepay` | Aviso de pagamento aprovado |

Rotas de admin (cabeçalho `x-admin-token`): CRUD de produtos, `POST /api/admin/sync`, `GET /api/admin/partner/usage`, `GET /api/admin/orders` e `PUT /api/admin/orders/:id/deliver`.

Variáveis do backend: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PARTNER_API_URL`, `PARTNER_API_KEY`, `ADMIN_TOKEN`, `USD_BRL_RATE`, `MARKUP_PERCENT`, `SYNC_INTERVAL_MINUTES`, `INFINITEPAY_HANDLE`, `PUBLIC_URL`.

## 6. Produtos

- **Importação:** automática ao subir o backend e a cada 30 minutos (`SYNC_INTERVAL_MINUTES`), ou pelo botão "Sincronizar fornecedor". Atualiza custo, estoque, duração e tipo de entrega; preserva nome, descrição, fotos, categoria, destaque e promoção.
- **Cadastro manual:** botão "Novo produto" no admin.
- **Preço:** `custo em USD × USD_BRL_RATE × (1 + MARKUP_PERCENT / 100)`. Com 5,50 e 100%, US$ 0,95 vira R$ 10,45. Mudar o preço no admin trava o valor (🔒) contra a sincronização.
- **Destaque:** estrela ao lado do produto no admin; aparece na seção "★ Destaques" no topo da loja.
- **Promoção:** campo "Preço promocional"; a loja mostra o preço normal riscado. Só vale se for menor que o normal.
- **Esgotados:** somem da vitrine e voltam quando o estoque é reposto.

## 7. Frontend

- **Vitrine (`/`):** destaques, busca, filtro por categoria e grade de cards.
- **Cards:** foto cadastrada no admin; sem foto, a logo da marca sobre a cor dela. As 55 logos ficam em `frontend/public/logos`.
- **Detalhe (`/produto/<slug>`):** preço, duração, tipo de entrega, descrição e formulário de compra.
- **Pedido (`/pedido/<código>`):** situação do pedido, atualizada sozinha a cada 5 segundos, e a entrega quando liberada.
- **Admin:** `/admin` e `/admin/pedidos`.

Variáveis do frontend: `API_URL` (endereço interno do backend) e `WHATSAPP_NUMBER` (opcional; mostra um link de dúvidas na página do produto).

## 8. Checkout (InfinitePay)

Fluxo:

1. Na página do produto, o cliente informa e-mail e WhatsApp e clica em "Comprar agora".
2. O backend grava o pedido e pede um link de pagamento à InfinitePay.
3. O cliente paga por Pix ou cartão na página da InfinitePay e volta para `/pedido/<código>`.
4. O backend confere o pagamento direto na InfinitePay (no retorno do cliente e no webhook) e marca o pedido como pago. O valor pago precisa cobrir o valor do pedido.
5. O pedido pago aparece em `/admin/pedidos`. Você cola a conta, o link ou o código e clica em "Entregar ao cliente".
6. A entrega aparece na página do pedido do cliente.

O que falta para funcionar:

- Ativar o **Checkout Integrado** na conta InfinitePay (a API recusa a conta enquanto isso estiver desligado).
- Definir no backend `INFINITEPAY_HANDLE` (sua InfiniteTag, sem o `$`) e `PUBLIC_URL` (endereço da loja).

A InfinitePay não usa chave de API, só a InfiniteTag. O formato da resposta de criação do link não está na documentação dela; o código espera o campo `url` e pode precisar de ajuste no primeiro teste real.

## 9. Decisões tomadas sem definição no PRD

| Decisão | Motivo |
|---|---|
| Node + Express + `mysql2`, sem ORM | Poucas tabelas |
| Câmbio 5,50 e margem de 100% | Valores de partida, trocáveis no ambiente |
| Página de detalhe em vez de modal | Dá link direto para compartilhar |
| Compra sem cadastro, com e-mail e WhatsApp | Menos atrito; o link do pedido serve de comprovante |
| Uma unidade por pedido | Simplicidade na primeira versão |
| Entrega manual pelo admin | A rota de pedidos do fornecedor não está documentada |

## 10. Pendências e riscos

- **`ADMIN_TOKEN`:** em produção ainda estava `troque-este-token` no último teste. Trocar; quem souber esse valor edita produtos e vê os pedidos.
- **Chave do fornecedor:** foi exposta em conversa; vale gerar outra.
- **Checkout sem teste real:** fazer uma compra de valor baixo antes de divulgar.
- **Sem e-mail ao cliente:** ele só vê a entrega na página do pedido. Se fechar a página sem guardar o endereço, precisa falar com você.
- **Entrega automática:** depende da documentação de `POST /orders` do fornecedor e de saldo lá.
- **Saldo no fornecedor:** US$ 0,30, insuficiente para comprar qualquer produto.
- **Natureza dos produtos:** contas e assinaturas de terceiros revendidas costumam violar os termos dessas empresas e podem ser canceladas; quem responde ao cliente é você. Vale ter política de garantia e reembolso.
- **Logos:** são marcas de terceiros, usadas para identificar o produto.
- **Produto inexistente** mostra "não encontrado" com status HTTP 200 em vez de 404.
