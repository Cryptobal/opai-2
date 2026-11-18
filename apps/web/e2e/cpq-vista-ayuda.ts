import { expect, type Page } from "@playwright/test";

/** Un iframe visible puede seguir en about:blank: esperar el documento y datos resueltos. */
export async function verificarVistaHtmlCpq(page: Page, textos: string[]) {
  const iframe = page.getByTitle("Vista previa del HTML subido", { exact: true });
  await expect(iframe).toBeVisible({ timeout: 60_000 });
  const documento = iframe.contentFrame().getByRole("document");
  await expect(documento).toBeVisible({ timeout: 60_000 });
  for (const texto of textos) await expect(documento).toContainText(texto);
  await expect(documento).not.toContainText(/\{\{|\}\}/);
  await iframe.scrollIntoViewIfNeeded();
  return iframe;
}
