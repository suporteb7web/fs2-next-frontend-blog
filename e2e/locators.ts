import type { Locator, Page } from "@playwright/test";

// `next start` keeps the previous route mounted in a hidden Activity, and the
// route announcer is another role="alert". These locators match what is shown.
export function appAlert(page: Page): Locator {
  return page.locator(".alert");
}

export function field(page: Page, label: string): Locator {
  return page.getByLabel(label).visible();
}

export function visibleText(page: Page, text: string, exact = true): Locator {
  return page.getByText(text, { exact }).visible();
}
