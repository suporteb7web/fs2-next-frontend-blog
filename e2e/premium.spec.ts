import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { AUTH_COOKIE_NAME } from "../src/lib/auth";
import { appAlert, field } from "./locators";
import { mockCheckoutUrl, mockEmailPrefix } from "./mocks/data";

const password = "secret1";

test.describe.configure({ timeout: 60_000 });

// O redirect do checkout é uma navegação de documento que o route() do Playwright não intercepta.
// O host do Stripe aponta para um endereço fechado: a URL é verificada e o HTML não chega.
test.use({
  launchOptions: {
    args: [
      "--host-resolver-rules=MAP checkout.stripe.com 127.0.0.1, MAP *.stripe.com 127.0.0.1, MAP stripe.com 127.0.0.1",
    ],
  },
});

test("visitante entra e o checkout abre sem carregar o Stripe", async ({ page }) => {
  const email = uniqueEmail();
  await register(page, "Visitante premium", email);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/");
  await expectLoggedOut(page);

  await page.getByRole("banner").getByRole("link", { name: "Premium", exact: true }).click();
  await expectGuestOffer(page);

  await page.getByRole("link", { name: "Entrar para continuar" }).click();
  await expect(page).toHaveURL((url) => {
    return url.pathname === "/login" && url.searchParams.get("next") === "/premium";
  });
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expectMemberOffer(page);
  await expectCheckoutOpensWithoutLoadingStripe(page);
  await expectStillCandidate(page);
});

test("visitante cria a conta e o checkout abre sem carregar o Stripe", async ({ page }) => {
  await page.goto("/");
  await expectLoggedOut(page);
  await page.getByRole("banner").getByRole("link", { name: "Premium", exact: true }).click();
  await expectGuestOffer(page);

  await page.getByRole("link", { name: "Entrar para continuar" }).click();
  await page.getByRole("link", { name: "Cadastre-se" }).click();
  await expect(page).toHaveURL((url) => {
    return url.pathname === "/cadastro" && url.searchParams.get("next") === "/premium";
  });

  await register(page, "Nova conta premium", uniqueEmail(), "/premium");
  await expectMemberOffer(page);
  await expectCheckoutOpensWithoutLoadingStripe(page);
  await expectStillCandidate(page);
});

test("conta premium vê o acesso permanente e não abre outro checkout", async ({ page }) => {
  const stripe = stripeRequests(page);

  await register(page, "Membro premium", uniqueEmail(mockEmailPrefix.premium));
  await expect(page.getByRole("banner").getByText("Premium", { exact: true })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Premium", exact: true })).toHaveCount(0);

  await page.goto("/premium");
  await expect(page).toHaveURL("/premium");
  await expect(page).toHaveTitle("Premium");
  await expect(page.getByRole("heading", { name: "Premium" })).toBeVisible();
  await expect(page.getByText("Sua conta já é premium. O acesso não expira.")).toBeVisible();
  await expect(page.getByText("O pagamento é único e o acesso não expira.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tornar-se premium" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Entrar para continuar" })).toHaveCount(0);
  expect(stripe).toEqual([]);
});

test("a volta do pagamento não torna a conta premium", async ({ page }) => {
  const stripe = stripeRequests(page);

  await page.goto("/premium/sucesso");
  await expectPaymentReview(page);
  await expectLoggedOut(page);

  await register(page, "Pagamento em análise", uniqueEmail());
  await page.goto("/premium/sucesso");
  await expectPaymentReview(page);
  await expect(page.getByRole("banner").getByRole("link", { name: "Premium", exact: true })).toBeVisible();

  await page.getByRole("banner").getByRole("link", { name: "Premium", exact: true }).click();
  await expectMemberOffer(page);
  expect(stripe).toEqual([]);
});

test("falha ao iniciar o pagamento e permanece na página", async ({ page }) => {
  const stripe = stripeRequests(page);

  await register(page, "Falha no checkout", uniqueEmail(mockEmailPrefix.checkoutError));
  await page.goto("/premium");
  await expectMemberOffer(page);

  await page.getByRole("button", { name: "Tornar-se premium" }).click();
  await expect(appAlert(page)).toHaveText("Não foi possível iniciar o pagamento. Tente de novo.");
  await expect(page).toHaveURL("/premium");
  await expect(page.getByRole("button", { name: "Tornar-se premium" })).toBeEnabled();
  await expect(page.getByRole("banner").getByRole("link", { name: "Premium", exact: true })).toBeVisible();
  expect(stripe).toEqual([]);
});

test("não navega quando a URL de pagamento é inválida", async ({ page }) => {
  const stripe = stripeRequests(page);

  await register(page, "URL inválida", uniqueEmail(mockEmailPrefix.checkoutInvalidUrl));
  await page.goto("/premium");
  await page.getByRole("button", { name: "Tornar-se premium" }).click();

  await expect(appAlert(page)).toHaveText("Não foi possível iniciar o pagamento. Tente de novo.");
  await expect(page).toHaveURL("/premium");
  await expect(page.getByRole("button", { name: "Tornar-se premium" })).toBeEnabled();
  expect(stripe).toEqual([]);
});

test("avisa quando a conta já é premium ao iniciar o pagamento", async ({ page }) => {
  const stripe = stripeRequests(page);

  await register(page, "Conflito de premium", uniqueEmail(mockEmailPrefix.checkoutConflict));
  await page.goto("/premium");
  await expectMemberOffer(page);

  await page.getByRole("button", { name: "Tornar-se premium" }).click();
  await expect(appAlert(page)).toHaveText("Sua conta já é premium.");
  await expect(page).toHaveURL("/premium");
  await expect(page.getByRole("button", { name: "Tornar-se premium" })).toBeEnabled();
  await expect(page.getByText("Sua conta já é premium. O acesso não expira.")).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "Premium", exact: true })).toBeVisible();
  expect(stripe).toEqual([]);
});

test("sessão inválida não oferece o pagamento", async ({ page }) => {
  const stripe = stripeRequests(page);

  await page.goto("/premium");
  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: "f".repeat(64),
      url: new URL(page.url()).origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.reload();

  await expect(page).toHaveURL("/premium");
  await expect(page.getByRole("heading", { name: "Premium" })).toBeVisible();
  await expect(appAlert(page)).toHaveText(
    "Não foi possível carregar a conta com a sessão atual.",
  );
  await expect(page.getByRole("button", { name: "Tornar-se premium" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Entrar para continuar" })).toHaveCount(0);
  await expect(page.getByText("O pagamento é único e o acesso não expira.")).toHaveCount(0);
  await expectLoggedOut(page);
  expect(stripe).toEqual([]);
});

async function expectCheckoutOpensWithoutLoadingStripe(page: Page) {
  const stripeResponses: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("stripe.com")) stripeResponses.push(response.url());
  });

  const documentRequest = page.waitForRequest((request) => {
    return (
      request.method() === "GET" &&
      request.url() === mockCheckoutUrl &&
      request.isNavigationRequest() &&
      request.resourceType() === "document" &&
      request.frame() === page.mainFrame()
    );
  });

  await page.getByRole("button", { name: "Tornar-se premium" }).click({ noWaitAfter: true });
  const request = await documentRequest;

  await expect.poll(() => request.failure()?.errorText ?? "").toMatch(/ERR_/);
  expect(await request.response()).toBeNull();
  expect(stripeResponses).toEqual([]);
  await expect(page.locator("[data-checkout-variant]")).toHaveCount(0);
  await expect(page).not.toHaveTitle("Stripe Checkout");
}

async function expectGuestOffer(page: Page) {
  await expect(page).toHaveURL("/premium");
  await expect(page).toHaveTitle("Premium");
  await expect(page.getByRole("heading", { name: "Premium" })).toBeVisible();
  await expect(page.getByText("O pagamento é único e o acesso não expira.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar para continuar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tornar-se premium" })).toHaveCount(0);
  await expectLoggedOut(page);
}

async function expectMemberOffer(page: Page) {
  await expect(page).toHaveURL("/premium");
  await expect(page).toHaveTitle("Premium");
  await expect(page.getByRole("heading", { name: "Premium" })).toBeVisible();
  await expect(page.getByText("O pagamento é único e o acesso não expira.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tornar-se premium" })).toBeEnabled();
  await expect(page.getByRole("link", { name: "Entrar para continuar" })).toHaveCount(0);
  await expect(page.getByText("Sua conta já é premium. O acesso não expira.")).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "Premium", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar post" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
}

async function expectStillCandidate(page: Page) {
  await page.goto("/premium");
  await expectMemberOffer(page);
}

async function expectPaymentReview(page: Page) {
  await expect(page).toHaveURL("/premium/sucesso");
  await expect(page).toHaveTitle("Pagamento em análise");
  await expect(page.getByRole("heading", { name: "Pagamento em análise" })).toBeVisible();
  await expect(
    page.getByText("O pagamento está sendo analisado. Você já pode fechar esta página."),
  ).toBeVisible();
}

async function expectLoggedOut(page: Page) {
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cadastro" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toHaveCount(0);
}

function stripeRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("stripe.com")) urls.push(request.url());
  });
  return urls;
}

function uniqueEmail(prefix = "e2e-"): string {
  return `${prefix}${randomUUID()}@example.com`;
}

async function register(page: Page, name: string, email: string, next?: string) {
  if (next) {
    await expect(page).toHaveURL((url) => {
      return url.pathname === "/cadastro" && url.searchParams.get("next") === next;
    });
  } else if (!page.url().includes("/cadastro")) {
    await page.goto("/cadastro");
  }

  await field(page, "Nome").fill(name);
  await field(page, "E-mail").fill(email);
  await field(page, "Senha").fill(password);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page).toHaveURL(next ?? "/");
  await expect(page.getByRole("link", { name: "Criar post" })).toBeVisible();
}
