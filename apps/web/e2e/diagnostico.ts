import { type Page, type TestInfo } from "@playwright/test";

/** Si la prueba falla, deja en el log el texto de diálogos y avisos: en CI no se pueden abrir las capturas. */
export async function diagnosticarSiFalla(page: Page, info: TestInfo) {
  if (info.status === info.expectedStatus) return;
  const textos = await page
    .locator('[role="dialog"], [role="alert"], [role="status"], [data-sonner-toast]')
    .allInnerTexts()
    .catch(() => ["(sin acceso a la página)"]);
  console.log(`[diagnóstico] ${info.title} @ ${page.url()}: ${textos.join(" | ").slice(0, 800)}`);
}
