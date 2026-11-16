import { expect, test, type Page } from "@playwright/test";

import { leerPdf } from "../../../modules/cpq/persistencia/pdf/prueba-pdf";
import { crearNegocio, irANuevaCotizacion } from "./negocios-ayuda";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-575: un solo motor de documento. El PDF de la propuesta lleva el membrete, el índice y las secciones activas del
// armador, en orden y numeradas; una sección activa sin nada que mostrar (detalle sin puestos) se omite. Con `qa-e2e`:
// solo crea un negocio de prueba y mira.
test.use({ actionTimeout: 30_000 });
test.setTimeout(240_000);

/** Guarda los PDF que la pantalla genera (`blob:`), para leer su texto desde la prueba. */
async function capturarPdfs(page: Page) {
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
}

test.describe("@preview cpq: secciones de la propuesta en el PDF", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");

  test("el PDF trae las secciones activas, numeradas y en el orden del armador", async ({ page }, info) => {
    await capturarPdfs(page);
    await entrar(page);
    await crearNegocio(page, `Secciones ${info.project.name} ${Date.now()}`);
    await irANuevaCotizacion(page);
    await page.getByLabel("Título", { exact: true }).fill("Propuesta con secciones");
    await page.getByRole("button", { name: "Revisar cotización" }).click();
    await page.getByRole("button", { name: "Confirmar creación" }).click();
    await page.waitForURL(/\/cotizaciones\/(?!nueva)[^/?#]+$/);
    const armar = page.getByRole("button", { name: "Armar propuesta técnica" });
    await expect(async () => {
      if (!(await armar.isVisible())) await page.getByRole("button", { name: /Documento y envío/ }).click();
      await expect(armar).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    await armar.click();
    const propuesta = page.getByRole("region", { name: "Propuesta técnica" });
    await expect(propuesta.getByText(/Plantilla (base OPAI|HTML)/)).toBeVisible({ timeout: 60_000 });
    const lista = page.getByRole("list", { name: "Bloques de la propuesta" });
    await expect(lista).toBeVisible({ timeout: 60_000 });
    const activas = (await lista.getByRole("listitem").allTextContents()).map((t) => t.replace(/^\d+\.\s*/, "").trim());
    expect(activas.length).toBeGreaterThanOrEqual(3);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __pdfs: string[] }).__pdfs.length), { timeout: 60_000 }).toBeGreaterThan(0);
    const base64 = await page.evaluate(() => (window as unknown as { __pdfs: string[] }).__pdfs.at(-1) ?? "");
    const texto = (await leerPdf(Buffer.from(base64, "base64"))).paginas.join(" ");
    expect(texto).toContain("PROPUESTA TÉCNICA");
    expect(texto).toContain("Índice");
    expect(texto.indexOf("1. Resumen económico")).toBeGreaterThan(0);
    expect(texto.indexOf("2. Su ejecutivo comercial")).toBeGreaterThan(texto.indexOf("1. Resumen económico"));
    expect(activas).toContain("Detalle del servicio");
    expect(texto).not.toContain("Detalle del servicio");
    await lista.scrollIntoViewIfNeeded();
    await capturar(page, info, "cpq-propuesta-secciones");
  });
});
