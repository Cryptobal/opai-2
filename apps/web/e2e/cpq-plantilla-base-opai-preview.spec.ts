import { expect, test } from "@playwright/test";

import { leerPdf } from "../../../modules/cpq/persistencia/pdf/prueba-pdf";
import { crearNegocio, irANuevaCotizacion } from "./negocios-ayuda";
import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-584 PR2: plantilla base OPAI nivel agencia (portada + secciones internas en el PDF).
test.use({ actionTimeout: 30_000 });
test.setTimeout(240_000);

test.describe("@preview cpq: plantilla base OPAI (CAR-584)", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("el PDF sin plantilla propia trae portada y páginas internas", async ({ page }, info) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __pdfs: string[] };
      w.__pdfs = [];
      const crear = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (obj: Blob | MediaSource) => {
        if (obj instanceof Blob && obj.type === "application/pdf") {
          void obj.arrayBuffer().then((b) => w.__pdfs.push(btoa(String.fromCharCode(...new Uint8Array(b)))));
        }
        return crear(obj);
      };
    });
    await entrar(page);
    await crearNegocio(page, `Base OPAI ${Date.now()}`, [],
      EN_PREVIEW ? "Cliente ficticio QA E2E (cesión)" : undefined);
    await irANuevaCotizacion(page);
    await page.getByLabel("Título", { exact: true }).fill("Propuesta base OPAI");
    await page.getByRole("button", { name: "Revisar cotización" }).click();
    await page.getByRole("button", { name: "Confirmar creación" }).click();
    await page.waitForURL(/\/cotizaciones\/(?!nueva)[^/?#]+$/);
    await page.getByRole("button", { name: /Documento y envío/ }).click();
    await page.getByRole("button", { name: "Armar propuesta técnica" }).click();
    await expect(page.getByText("Plantilla base OPAI", { exact: false })).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __pdfs: string[] }).__pdfs.length), { timeout: 90_000 }).toBeGreaterThan(0);
    const base64 = await page.evaluate(() => (window as unknown as { __pdfs: string[] }).__pdfs.at(-1) ?? "");
    const pdf = await leerPdf(Buffer.from(base64, "base64"));
    expect(pdf.paginas.length).toBeGreaterThanOrEqual(2);
    const portada = pdf.paginas[0] ?? "";
    const interna = pdf.paginas[1] ?? "";
    expect(portada).toContain("PROPUESTA TÉCNICA");
    expect(portada).toMatch(/Propuesta base OPAI|Preparada para|Cliente/i);
    expect(interna).toMatch(/Índice|Resumen|Comprensión|Metodología/i);
    await capturar(page, info, "cpq-plantilla-base-opai-portada");
    if (pdf.paginas.length > 1) {
      await page.evaluate(() => window.scrollTo(0, 800));
      await capturar(page, info, "cpq-plantilla-base-opai-interna");
    }
  });
});