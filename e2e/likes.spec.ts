import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { likesLabel } from "../src/lib/format";
import { appAlert, field, visibleText } from "./locators";

test.describe.configure({ timeout: 60_000 });

test("curte um post e a curtida segue na página e na home", async ({ page, browser }) => {
  const post = {
    title: `Post curtido ${randomUUID()}`,
    content: `Conteúdo curtido ${randomUUID()}`,
  };

  await register(page, "Autora da curtida");
  const id = await publish(page, post);
  await expectLikeState(page, { liked: false, count: 0 });

  const reader = await browser.newContext();
  const guest = await browser.newContext();
  try {
    const readerPage = await reader.newPage();
    await register(readerPage, "Leitor que curte");
    await openFromHome(readerPage, post, 0);
    await expectLikeState(readerPage, { liked: false, count: 0 });

    await readerPage.getByRole("button", { name: "Curtir", exact: true }).click();
    await expect(readerPage).toHaveURL(`/posts/${id}`);
    await expectLikeState(readerPage, { liked: true, count: 1 });

    await readerPage.reload();
    await expectLikeState(readerPage, { liked: true, count: 1 });

    await readerPage.getByRole("link", { name: "Voltar" }).click();
    await expect(readerPage).toHaveURL("/");
    await expectLikeCount(postCard(readerPage, post.title), 1);
    await readerPage.reload();
    await expectLikeCount(postCard(readerPage, post.title), 1);

    await page.reload();
    await expectLikeState(page, { liked: false, count: 1 });
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(page).toHaveURL("/");
    await expectLikeCount(postCard(page, post.title), 1);

    const guestPage = await guest.newPage();
    await guestPage.goto("/");
    await expectLikeCount(postCard(guestPage, post.title), 1);
    await guestPage.goto(`/posts/${id}`);
    await expectLikeCount(guestPage.getByRole("article"), 1);
    await expect(guestPage.getByRole("button", { name: "Curtir", exact: true })).toHaveCount(0);
    await expect(guestPage.getByRole("button", { name: "Descurtir", exact: true })).toHaveCount(0);
  } finally {
    await reader.close();
    await guest.close();
  }
});

test("descurte um post e a contagem volta na página e na home", async ({ page, browser }) => {
  const post = {
    title: `Post descurtido ${randomUUID()}`,
    content: `Conteúdo descurtido ${randomUUID()}`,
  };

  await register(page, "Autora da descurtida");
  const id = await publish(page, post);

  const reader = await browser.newContext();
  try {
    const readerPage = await reader.newPage();
    await register(readerPage, "Leitor que descurte");
    await openFromHome(readerPage, post, 0);

    await readerPage.getByRole("button", { name: "Curtir", exact: true }).click();
    await expect(readerPage).toHaveURL(`/posts/${id}`);
    await expectLikeState(readerPage, { liked: true, count: 1 });

    await page.reload();
    await expectLikeState(page, { liked: false, count: 1 });

    await readerPage.getByRole("button", { name: "Descurtir", exact: true }).click();
    await expectLikeState(readerPage, { liked: false, count: 0 });
    await readerPage.reload();
    await expectLikeState(readerPage, { liked: false, count: 0 });

    await readerPage.getByRole("link", { name: "Voltar" }).click();
    await expect(readerPage).toHaveURL("/");
    await expectLikeCount(postCard(readerPage, post.title), 0);
    await readerPage.reload();
    await expectLikeCount(postCard(readerPage, post.title), 0);

    await page.reload();
    await expectLikeState(page, { liked: false, count: 0 });
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(page).toHaveURL("/");
    await expectLikeCount(postCard(page, post.title), 0);
  } finally {
    await reader.close();
  }
});

async function register(page: Page, name: string) {
  const email = `e2e-${randomUUID()}@example.com`;

  await page.goto("/cadastro");
  await field(page, "Nome").fill(name);
  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill("secret1");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Criar post" })).toBeVisible();
}

async function publish(page: Page, post: { title: string; content: string }): Promise<number> {
  await page.getByRole("link", { name: "Criar post" }).click();
  await expect(page).toHaveURL("/posts/novo");
  await field(page, "Título").fill(post.title);
  await field(page, "Conteúdo").fill(post.content);
  await page.getByRole("button", { name: "Publicar" }).click();

  await expect(page).toHaveURL(/\/posts\/[1-9]\d*$/);
  await expect(page.getByRole("heading", { level: 1, name: post.title, exact: true })).toBeVisible();
  await expect(visibleText(page, post.content)).toBeVisible();

  const id = Number(new URL(page.url()).pathname.split("/").pop());
  expect(id).toBeGreaterThan(0);
  return id;
}

async function openFromHome(page: Page, post: { title: string; content: string }, count: number) {
  await page.goto("/");
  const card = postCard(page, post.title);
  await expectLikeCount(card, count);
  await card.getByRole("link", { name: post.title, exact: true }).click();
  await expect(page).toHaveURL(/\/posts\/[1-9]\d*$/);
  await expect(page.getByRole("heading", { level: 1, name: post.title, exact: true })).toBeVisible();
  await expect(visibleText(page, post.content)).toBeVisible();
}

function postCard(page: Page, title: string): Locator {
  return page.getByRole("article").filter({
    has: page.getByRole("heading", { level: 2, name: title, exact: true }),
  });
}

async function expectLikeState(page: Page, state: { liked: boolean; count: number }) {
  await expectLikeCount(page.getByRole("article"), state.count);
  const button = page.getByRole("button", { name: state.liked ? "Descurtir" : "Curtir", exact: true });
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await expect(button).toHaveAttribute("aria-pressed", String(state.liked));
  await expect(appAlert(page)).toHaveCount(0);
}

async function expectLikeCount(scope: Locator, count: number) {
  await expect(scope.getByText(likesLabel(count))).toBeVisible();
}
