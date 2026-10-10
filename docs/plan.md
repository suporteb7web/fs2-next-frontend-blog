# Plano: telas × endpoints

Base: `http://localhost:3000`. Prefixo das rotas de domínio: `/api`.

Este arquivo liga cada tela e funcionalidade do [braindump](./braindump.md) aos endpoints do [OpenAPI](./openapi.yaml). Serve para quebrar o frontend em tasks.

## Sessão (vale para todas as telas)

Não existe endpoint de logout. A sessão é o token devolvido no cadastro e no login.

| Ação | Endpoint | Auth |
| --- | --- | --- |
| Saber quem está logado ao recarregar a página | `GET /api/me` | Bearer |
| Encerrar sessão (botão Sair) | nenhum — descartar o token no cliente | — |

O header `Authorization: Bearer <token>` é obrigatório nas rotas protegidas. Token ausente, malformado ou inválido responde `401`.

Login gera um token novo e invalida o anterior. Cadastro já devolve token: o usuário entra autenticado, sem passar pelo login.

Imagens (avatar e foto do post) vêm como path público (`/uploads/...`). A URL completa é `http://localhost:3000` + esse path.

---

## Header

Presente em todas as telas. O estado logado/deslogado decide quais botões aparecem.

| Funcionalidade | Endpoint | Auth | Uso |
| --- | --- | --- | --- |
| Botão Login / Cadastro (deslogado) | nenhum | — | Só navegação para as telas de login e cadastro |
| Botão Criar post (logado) | nenhum | — | Só navegação para a tela de criar post |
| Botão Sair (logado) | nenhum | — | Descartar o token no cliente |
| Restaurar nome/avatar depois do reload | `GET /api/me` | Bearer | `200`: `{ id, name, email, avatar }`. `401`: tratar como deslogado |

`GET /api/me` não é obrigatório se o cliente já guarda `user` junto com o token. É o endpoint certo quando só o token está persistido.

---

## Página inicial

Lista pública de posts. Não exige login.

| Funcionalidade | Endpoint | Auth | Uso |
| --- | --- | --- | --- |
| Listar posts | `GET /api/posts?page={n}` | não | `200`: `{ data, meta }` |

Query: `page` ≥ 1, default `1`. `limit` é fixo em **10** e não é parâmetro.

Cada item de `data`: `id`, `title`, `content`, `image`, `createdAt`, `likesCount`, `author` (`id`, `name`). Não traz `likedByMe` nem `replies`.

`meta`: `page`, `limit`, `total`, `totalPages`. Página vazia devolve `data: []` com `meta` coerente, não `404`. Ordem: `createdAt` decrescente.

| Erro | Quando |
| --- | --- |
| `400` | `page` inválido |
| `500` | falha inesperada |

---

## Post individual

Consulta pública de um post pelo id. Like e resposta só aparecem para quem está logado.

| Funcionalidade | Endpoint | Auth | Uso |
| --- | --- | --- | --- |
| Mostrar o post e as respostas | `GET /api/posts/{id}` | opcional | `200`: post + `likesCount` + `likedByMe` + `replies` |
| Dar like | `POST /api/posts/{id}/likes` | Bearer | sem body. `204` vazio |
| Tirar like | `DELETE /api/posts/{id}/likes` | Bearer | sem body. `204` vazio |
| Responder | `POST /api/posts/{id}/replies` | Bearer | body `{ content }`. `201`: reply criada |

### Consulta

Sem header, `likedByMe` é `false`. Com `Authorization` presente, o token precisa ser válido; senão a resposta é `401` (não cai no modo anônimo). `likedByMe` é `true` só com token válido e like daquele usuário.

`replies` vem inteira, sem paginação, `createdAt` crescente. Cada reply: `id`, `content`, `createdAt`, `author` (`id`, `name`).

| Erro | Quando |
| --- | --- |
| `400` | `id` inválido |
| `401` | header presente com token inválido |
| `404` | post inexistente |

### Like e deslike

Idempotentes: curtir de novo ou descurtir sem like anterior continua `204`. O autor pode curtir o próprio post. Depois do `204`, atualizar `likesCount` e `likedByMe` no cliente ou refazer o `GET`.

| Erro | Quando |
| --- | --- |
| `400` | `id` inválido |
| `401` | sem token válido |
| `404` | post inexistente |

### Responder

Body só com `content` (trim, mínimo 1 caractere). Campo extra é `400`. Não há thread: a reply pertence ao post.

Se quem responde não for o autor do post, o backend enfileira e-mail para o autor. Falha de e-mail não desfaz a reply: a request continua `201`. Responder o próprio post não gera e-mail.

A reply do `201` pode ser anexada à lista local. O `GET` do post também a devolve.

| Erro | Quando |
| --- | --- |
| `400` | `id` ou `content` inválido |
| `401` | sem token válido |
| `404` | post inexistente |

---

## Login

| Funcionalidade | Endpoint | Auth | Uso |
| --- | --- | --- | --- |
| Entrar | `POST /api/auth/login` | não | body `{ email, password }` |

`200`: `{ token, user }`. `user`: `id`, `name`, `email`, `avatar`. Guardar o token para as rotas protegidas. E-mail é normalizado para minúsculas. Senha mínima: 6 caracteres.

E-mail inexistente e senha incorreta devolvem a mesma mensagem.

| Erro | Quando |
| --- | --- |
| `400` | e-mail ou senha inválidos |
| `401` | `Invalid email or password` |
| `500` | falha inesperada |

---

## Cadastro

| Funcionalidade | Endpoint | Auth | Uso |
| --- | --- | --- | --- |
| Criar conta | `POST /api/auth/register` | não | body `{ name, email, password }` |

`201`: mesmo formato do login, `{ token, user }`. O usuário já fica autenticado. `name`: 1–100 caracteres, com trim. E-mail único, em minúsculas. Senha mínima: 6 caracteres.

| Erro | Quando |
| --- | --- |
| `400` | campos inválidos |
| `409` | e-mail já cadastrado (`Email already registered`) |
| `500` | falha inesperada |

---

## Criar um novo post

Tela protegida. Sem token válido, não chama a API: redirecionar para o login. Se chamar mesmo assim, a API responde `401`.

| Funcionalidade | Endpoint | Auth | Uso |
| --- | --- | --- | --- |
| Publicar título e conteúdo | `POST /api/posts` | Bearer | body `{ title, content }`. `201`: post criado |
| Anexar imagem (passo separado) | `PUT /api/posts/{id}/image` | Bearer | `multipart/form-data`, campo `image` |

A criação não aceita arquivo. `image` nasce `null`. A foto entra depois, com o `id` do `201`.

`title`: 1–200 caracteres, com trim. `content`: trim, mínimo 1, sem máximo.

Imagem: `image/jpeg`, `image/png` ou `image/webp`, até 5 MiB. `200` devolve o post com `image` preenchido (`/uploads/posts/...`).

O `201` e o `200` da imagem não incluem `likesCount`, `likedByMe` nem `replies`.

| Erro na criação | Quando |
| --- | --- |
| `400` | título ou conteúdo inválido |
| `401` | sem token válido |

| Erro na imagem | Quando |
| --- | --- |
| `400` | arquivo ausente, tipo inválido, maior que 5 MiB ou imagem ilegível |
| `401` | sem token válido |
| `403` | post de outro autor |
| `404` | post inexistente |

---

## Fora do braindump

A API expõe estas operações e o braindump não descreve tela para elas. Não entram no escopo atual, a menos que uma task nova as inclua.

| Operação | Endpoint | Auth | Observação |
| --- | --- | --- | --- |
| Health check | `GET /health` | não | Fora de `/api`. Não é tela |
| Trocar avatar | `PUT /api/me/avatar` | Bearer | `multipart/form-data`, campo `image`. Mesmas regras de arquivo da imagem do post |
| Editar o próprio post | `PUT /api/posts/{id}` | Bearer | Body parcial: `title`, `content` ou ambos. Não mexe na imagem. Post de outro autor: `403` |
| Excluir o próprio post | `DELETE /api/posts/{id}` | Bearer | `204`. Likes, replies e imagem saem junto. Post de outro autor: `403` |
| Excluir a própria reply | `DELETE /api/posts/{id}/replies/{replyId}` | Bearer | `204`. O autor do post não apaga reply de outra pessoa. Reply de outro autor: `403`. Reply de outro post: `404` |

---

## Ordem sugerida de tasks

1. Sessão: guardar token, `GET /api/me`, botão Sair.
2. Header: links conforme logado ou não.
3. Página inicial: `GET /api/posts` e paginação por `meta`.
4. Post individual: `GET /api/posts/{id}`, com token opcional para `likedByMe`.
5. Login e cadastro: gravar `{ token, user }` e seguir autenticado.
6. Like e deslike no post individual.
7. Responder no post individual.
8. Criar post (rota protegida) e, em seguida, upload da imagem.
