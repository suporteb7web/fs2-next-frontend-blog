import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { AUTH_COOKIE_NAME } from "../src/lib/auth";
import { appAlert, field } from "./locators";
import { seedUsers } from "./mocks/data";

const existingUser = seedUsers.find((user) => user.email === "ada@example.com");

if (!existingUser) {
  throw new Error("A usuária ada@example.com precisa existir no mock.");
}

test("cadastra, sai e entra de novo autenticado", async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.com`;
  const password = "secret1";

  await page.goto("/cadastro");
  await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
  await expectLoggedOut(page);

  await field(page, "Nome").fill("Autora E2E");
  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill(password);
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await expect(page).toHaveURL("/");
  await expectLoggedIn(page);
  const registeredToken = await expectSessionToken(page);

  await page.goto("/login");
  await expect(page).toHaveURL("/");

  await page.goto("/posts/novo");
  await expect(page).toHaveURL("/posts/novo");
  await expect(page.getByRole("heading", { name: "Novo post" })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/");
  await expectLoggedOut(page);

  await page.goto("/posts/novo");
  await expect(page).toHaveURL((url) => {
    return url.pathname === "/login" && url.searchParams.get("next") === "/posts/novo";
  });

  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL("/posts/novo");
  await expect(page.getByRole("heading", { name: "Novo post" })).toBeVisible();
  await expectLoggedIn(page);
  const loginToken = await expectSessionToken(page);
  expect(loginToken).not.toBe(registeredToken);
});

test("entra com uma conta que já existe e fica logado", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expectLoggedOut(page);

  await field(page, "E-mail").fill(existingUser.email);
  await field(page, "Senha").fill(existingUser.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL("/");
  await expectLoggedIn(page);
  await expectSessionToken(page);

  await page.goto("/posts/novo");
  await expect(page).toHaveURL("/posts/novo");
  await expect(page.getByRole("heading", { name: "Novo post" })).toBeVisible();
});

test("não autentica com senha incorreta", async ({ page }) => {
  await page.goto("/login");
  await field(page, "E-mail").fill(existingUser.email);
  await field(page, "Senha").fill("errada1");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(appAlert(page)).toHaveText("E-mail ou senha inválidos.");
  await expect(page).toHaveURL("/login");
  await expectLoggedOut(page);
});

test("não autentica com e-mail já cadastrado", async ({ page }) => {
  await page.goto("/cadastro");
  await field(page, "Nome").fill("Outra Ada");
  await field(page, "E-mail").fill(existingUser.email);
  await field(page, "Senha").fill(existingUser.password);
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await expect(page.getByText("Este e-mail já está cadastrado.")).toBeVisible();
  await expect(page).toHaveURL("/cadastro");
  await expectLoggedOut(page);
});

async function expectLoggedIn(page: Page) {
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar post" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Cadastro" })).toHaveCount(0);
}

async function expectLoggedOut(page: Page) {
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cadastro" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toHaveCount(0);
  await expect
    .poll(async () => page.context().cookies())
    .not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: AUTH_COOKIE_NAME })]),
    );
}

async function expectSessionToken(page: Page): Promise<string> {
  let token = "";

  await expect.poll(async () => {
    const cookies = await page.context().cookies();
    const session = cookies.find((cookie) => cookie.name === AUTH_COOKIE_NAME);
    token = session?.httpOnly ? (session.value ?? "") : "";
    return /^[a-f0-9]{64}$/.test(token);
  }).toBe(true);

  return token;
}
