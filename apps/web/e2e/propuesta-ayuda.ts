import { expect, type Page } from "@playwright/test";

import { EN_PREVIEW } from "./preview";

import { leerPdf } from "../../../modules/cpq/persistencia/pdf/prueba-pdf";
import { crearNegocio, irANuevaCotizacion } from "./negocios-ayuda";

type ConPdfs = { __pdfs: string[] };

/** Guarda los PDF que la pantalla genera (`blob:`), para leer su texto desde la prueba. */
export async function capturarPdfs(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as ConPdfs;
    w.__pdfs = [];
    const crear = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (obj: Blob | MediaSource) => {
      if (obj instanceof Blob && obj.type === "application/pdf") {
        void obj
          .arrayBuffer()
          .then((b) => w.__pdfs.push(btoa(String.fromCharCode(...new Uint8Array(b)))));
      }
      return crear(obj);
    };
  });
}

/** Texto del último PDF generado, esperando a que haya al menos `cantidad` generados. */
export async function textoDelUltimoPdf(page: Page, cantidad = 1): Promise<string> {
  const largo = () => page.evaluate(() => (window as unknown as ConPdfs).__pdfs.length);
  await expect.poll(largo, { timeout: 60_000 }).toBeGreaterThanOrEqual(cantidad);
  const base64 = await page.evaluate(() => (window as unknown as ConPdfs).__pdfs.at(-1) ?? "");
  return (await leerPdf(Buffer.from(base64, "base64"))).paginas.join(" ");
}

/** Crea un negocio y una cotización de prueba y abre «Armar propuesta técnica». */
export async function abrirDisenadorDePropuesta(page: Page, negocio: string, titulo: string) {
  await crearNegocio(page, negocio, [], EN_PREVIEW ? "Cliente ficticio QA E2E (cesión)" : undefined);
  await irANuevaCotizacion(page);
  await page.getByLabel("Título", { exact: true }).fill(titulo);
  await page.getByRole("button", { name: "Revisar cotización" }).click();
  await page.getByRole("button", { name: "Confirmar creación" }).click();
  await page.waitForURL(/\/cotizaciones\/(?!nueva)[^/?#]+$/);
  const armar = page.getByRole("button", { name: "Armar propuesta técnica" });
  await expect(async () => {
    if (!(await armar.isVisible()))
      await page.getByRole("button", { name: /Documento y envío/ }).click();
    await expect(armar).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });
  await expect(async () => {
    await armar.click();
    await expect(page).toHaveURL(/\/propuesta-tecnica$/, { timeout: 5_000 });
  }).toPass({ timeout: 60_000 });
}
