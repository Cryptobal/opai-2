import { expect, test } from "@playwright/test";
import { verificarVistaHtmlCpq } from "./cpq-vista-ayuda";

// Fixture totalmente en memoria: no login, servidor, datos reales ni solicitudes externas.
// Sin @preview: este test de sincronización no necesita encender una preview.
test("espera el contenido ficticio aunque el iframe vacío ya sea visible", async ({ page }) => {
  await page.route("**/*", (ruta) => ruta.abort());
  await page.setContent('<iframe title="Vista previa del HTML subido" sandbox="" style="width:100%;height:600px;background:#e8eaed"></iframe>');
  const documento = page.frameLocator("iframe").getByRole("document");
  await expect(page.getByTitle("Vista previa del HTML subido")).toBeVisible();
  await expect(documento).toHaveCount(0);
  await page.evaluate(() => {
    setTimeout(() => {
      document.querySelector("iframe")!.srcdoc = '<div role="document"><h1>Cliente ficticio QA</h1><p>Servicio de seguridad</p></div>';
    }, 250);
  });
  await verificarVistaHtmlCpq(page, ["Cliente ficticio QA", "Servicio de seguridad"]);
});
