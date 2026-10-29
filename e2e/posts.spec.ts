import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { field, visibleText } from "./locators";
import { mockPublicPostTitle, seedUsers } from "./mocks/data";

const premiumUser = seedUsers.find((user) => user.premium);

if (!premiumUser) {
  throw new Error("O mock precisa de uma conta premium para criar post premium.");
}

test.describe.configure({ timeout: 60_000 });

test("não publica título ou conteúdo inválido", async ({ page }) => {
  const author = await register(page, "Autora inválida");
  const rejectedTitle = `${randomUUID()}${"x".repeat(180)}`;

  await page.getByRole("link", { name: "Criar post" }).click();
  await expect(page).toHaveURL("/posts/novo");
  await expect(page.getByRole("heading", { name: "Novo post" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Post premium" })).toHaveCount(0);

  await submitAndWaitForFields(page);
  await expect(page.getByText("Informe o título.")).toBeVisible();
  await expect(page.getByText("Informe o conteúdo.")).toBeVisible();
  await expect(page).toHaveURL("/posts/novo");

  await field(page, "Título").fill("   ");
  await field(page, "Conteúdo").fill("   ");
  await submitAndWaitForFields(page);
  await expect(page.getByText("Informe o título.")).toBeVisible();
  await expect(page.getByText("Informe o conteúdo.")).toBeVisible();
  await expect(page).toHaveURL("/posts/novo");

  await field(page, "Título").fill(rejectedTitle);
  await field(page, "Conteúdo").fill("Conteúdo que não deve ser publicado.");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("O título pode ter no máximo 200 caracteres.")).toBeVisible();
  await expect(page).toHaveURL("/posts/novo");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Posts" })).toBeVisible();
  await expect(page.getByText(rejectedTitle.slice(0, 36))).toHaveCount(0);
  await expect(page.getByText(author)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: mockPublicPostTitle })).toBeVisible();
});

test("cria posts públicos e eles seguem listados na home", async ({ page, browser }) => {
  await page.goto("/posts/novo");
  await expect(page).toHaveURL((url) => {
    return url.pathname === "/login" && url.searchParams.get("next") === "/posts/novo";
  });

  const author = await register(page, "Autora pública");
  const first = {
    title: `Post público ${randomUUID()}`,
    content: `Conteúdo público ${randomUUID()}`,
  };
  const second = {
    title: `Outro post público ${randomUUID()}`,
    content: `Outro conteúdo público ${randomUUID()}`,
  };

  const firstId = await publish(page, first);
  const detail = page.getByRole("article");
  await expect(page.getByRole("link", { name: "Editar" })).toBeVisible();
  await expect(detail.getByText("Nenhuma resposta ainda.")).toBeVisible();
  await expect(detail.getByText("0 curtidas")).toBeVisible();
  await expect(detail.getByText(author)).toBeVisible();
  await expect(detail.getByText("Premium", { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Voltar" }).click();
  await expect(page).toHaveURL("/");
  const firstCard = await expectListed(page, first, author);
  await expect(firstCard.getByText("Premium", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: mockPublicPostTitle })).toBeVisible();

  await firstCard.getByRole("link", { name: first.title, exact: true }).click();
  await expect(page).toHaveURL(`/posts/${firstId}`);
  await expect(visibleText(page, first.content)).toBeVisible();

  const secondId = await publish(page, second);
  await page.getByRole("link", { name: "Voltar" }).click();
  await expectListed(page, first, author);
  await expectListed(page, second, author);

  const guest = await browser.newContext();
  try {
    const guestPage = await guest.newPage();
    await guestPage.goto("/");
    await expectListed(guestPage, first, author);
    await expectListed(guestPage, second, author);
    await expect(
      guestPage.getByRole("heading", { level: 2, name: mockPublicPostTitle }),
    ).toBeVisible();

    await guestPage.goto(`/posts/${firstId}`);
    await expect(
      guestPage.getByRole("heading", { level: 1, name: first.title, exact: true }),
    ).toBeVisible();
    await expect(visibleText(guestPage, first.content)).toBeVisible();
    await expect(guestPage.getByRole("link", { name: "Editar" })).toHaveCount(0);

    await guestPage.goto(`/posts/${secondId}`);
    await expect(
      guestPage.getByRole("heading", { level: 1, name: second.title, exact: true }),
    ).toBeVisible();
    await expect(visibleText(guestPage, second.content)).toBeVisible();
  } finally {
    await guest.close();
  }
});

test("cria um post premium e só a conta premium o vê na home", async ({ page, browser }) => {
  await login(page, premiumUser.email, premiumUser.password);

  const publicPost = {
    title: `Post aberto da premium ${randomUUID()}`,
    content: `Conteúdo aberto ${randomUUID()}`,
  };
  const premiumPost = {
    title: `Post exclusivo ${randomUUID()}`,
    content: `Conteúdo exclusivo ${randomUUID()}`,
  };

  await publish(page, publicPost);
  await expect(page.getByRole("article").getByText("Premium", { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Criar post" }).click();
  await expect(page.getByRole("checkbox", { name: "Post premium" })).toBeVisible();
  const premiumId = await publish(page, premiumPost, true);
  await expect(page.getByRole("article").getByText("Premium", { exact: true })).toBeVisible();
  await expect(visibleText(page, premiumPost.content)).toBeVisible();

  await page.goto("/");
  const publicCard = await expectListed(page, publicPost, premiumUser.name);
  await expect(publicCard.getByText("Premium", { exact: true })).toHaveCount(0);
  const premiumCard = await expectListed(page, premiumPost, premiumUser.name);
  await expect(premiumCard.getByText("Premium", { exact: true })).toBeVisible();

  await expectHiddenFromVisitor(browser, publicPost, premiumPost, premiumId, premiumUser.name);
  await expectHiddenFromVisitor(browser, publicPost, premiumPost, premiumId, premiumUser.name, {
    name: "Leitor comum",
  });
});

async function register(page: Page, name: string): Promise<string> {
  const email = `e2e-${randomUUID()}@example.com`;

  await page.goto("/cadastro");
  await field(page, "Nome").fill(name);
  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill("secret1");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Criar post" })).toBeVisible();
  return name;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Criar post" })).toBeVisible();
}

async function publish(
  page: Page,
  post: { title: string; content: string },
  premium = false,
): Promise<number> {
  if (!page.url().endsWith("/posts/novo")) {
    await page.getByRole("link", { name: "Criar post" }).click();
  }
  await expect(page).toHaveURL("/posts/novo");
  await expect(page.getByRole("heading", { name: "Novo post" })).toBeVisible();

  await field(page, "Título").fill(`  ${post.title}  `);
  await field(page, "Conteúdo").fill(`  ${post.content}  `);
  if (premium) {
    await page.getByRole("checkbox", { name: "Post premium" }).check();
  }
  await page.getByRole("button", { name: "Publicar" }).click();

  await expect(page).toHaveURL(/\/posts\/[1-9]\d*$/);
  await expect(page.getByRole("heading", { level: 1, name: post.title, exact: true })).toBeVisible();
  await expect(visibleText(page, post.content)).toBeVisible();

  const id = Number(new URL(page.url()).pathname.split("/").pop());
  expect(id).toBeGreaterThan(0);
  return id;
}

async function submitAndWaitForFields(page: Page) {
  const title = field(page, "Título");
  await title.evaluate((element) => {
    element.setAttribute("data-submitting", "1");
  });
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.locator("[data-submitting='1']")).toHaveCount(0);
}

async function expectListed(
  page: Page,
  post: { title: string; content: string },
  author: string,
) {
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { level: 2, name: post.title }),
  });
  await expect(card).toBeVisible();
  await expect(card).toContainText(post.content);
  await expect(card).toContainText(author);
  await expect(card).toContainText("0 curtidas");
  await expect(card.getByRole("link", { name: post.title, exact: true })).toBeVisible();
  return card;
}

async function expectHiddenFromVisitor(
  browser: Browser,
  visible: { title: string; content: string },
  hidden: { title: string; content: string },
  hiddenId: number,
  author: string,
  account?: { name: string },
) {
  const context = await browser.newContext();
  try {
    const visitor = await context.newPage();
    if (account) {
      await register(visitor, account.name);
    } else {
      await visitor.goto("/");
    }

    await expectListed(visitor, visible, author);
    await expect(visitor.getByRole("heading", { level: 2, name: hidden.title })).toHaveCount(0);

    await visitor.goto(`/posts/${hiddenId}`);
    await expect(visitor.getByRole("link", { name: "Voltar" })).toBeVisible();
    await expect(visitor.getByRole("heading", { name: hidden.title })).toHaveCount(0);
    await expect(visibleText(visitor, hidden.content, false)).toHaveCount(0);
  } finally {
    await context.close();
  }
}
