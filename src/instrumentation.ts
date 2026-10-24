export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.E2E_MSW !== "1") {
    return;
  }

  const { listen } = await import("../e2e/mocks/server");
  listen();
}
