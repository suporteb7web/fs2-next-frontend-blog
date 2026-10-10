<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Backend

O backend é outro processo. A base das requisições é `BACKEND_URL` (variável só de servidor). O contrato está em `docs/openapi.yaml`.

Toda chamada HTTP sai de `src/lib/api.ts` (axios). Não criar outro cliente, não usar `fetch` direto e não chamar o backend em Client Component. O módulo é `server-only`: usar as funções em Server Components ou, para mutações, dentro de Server Actions.

Rotas com Bearer leem o cookie `token` (`AUTH_COOKIE_NAME`). O valor é o hex da sessão, sem o prefixo `Bearer`. `login` e `register` devolvem `{ token, user }` e não gravam o cookie — a Server Action que autentica grava; sair é apagar esse cookie (a API não tem logout). Sem o cookie, rota protegida lança `ApiError` 401 (`UNAUTHORIZED`) e não chama o backend.

`getPost` é a exceção: envia o Bearer só se o cookie existir. Sem cookie, a consulta é anônima. Com cookie inválido o backend responde 401; não repetir a chamada sem o header.

Falhas da API são `ApiError` (`status`, `code`, `message` e, na validação, `details`). Uploads (`updateAvatar`, `updatePostImage`) recebem um `File` e vão em `multipart/form-data`, campo `image`.
