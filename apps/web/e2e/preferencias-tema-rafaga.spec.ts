import { expect, type Page, test } from "@playwright/test";
import { entrar } from "./sesion";
import { ocultarIndicadorDev } from "./indicador-dev";

// Ráfaga de tema (B1, H2 del #135): la cola serial de `usePreferencias` hace que gane el último clic
// (sin que una respuesta vieja pise la elección nueva) y, si el último guardado falla, revierte al
// último tema confirmado por el servidor con una Alerta. Los controles ya no se deshabilitan mientras
// guardan, así que los clics seguidos sí se registran.

async function irAPreferencias(page: Page) {
  await ocultarIndicadorDev(page);
  await entrar(page);
  await page.goto("/configuracion/preferencias");
  const tema = page.getByRole("radiogroup", { name: "Tema" });
  // Hidratado: los radios del tema dejan de estar deshabilitados.
  await expect(tema.getByRole("radio", { name: "Claro", exact: true })).toBeEnabled();
  return tema;
}

test("ráfaga de tema: gana el último clic y el servidor lo guarda", async ({ page }) => {
  const tema = await irAPreferencias(page);
  // Tres clics seguidos terminando en Oscuro; el DS aplica el tema al instante (data-theme en <html>).
  await tema.getByRole("radio", { name: "Claro", exact: true }).click();
  await tema.getByRole("radio", { name: /^Sistema/ }).click();
  await tema.getByRole("radio", { name: "Oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // Tras asentarse los guardados y recargar, el radio marcado viene del valor del servidor: se guardó
  // el último (Oscuro), no un clic anterior.
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(
    page.getByRole("radiogroup", { name: "Tema" }).getByRole("radio", { name: "Oscuro", exact: true }),
  ).toBeChecked();
});

test("ráfaga de tema: si el último guardado falla, revierte al confirmado y avisa", async ({ page }) => {
  const tema = await irAPreferencias(page);
  // Deja Claro confirmado por el servidor (Oscuro→Claro garantiza un cambio aunque el inicial varíe).
  await tema.getByRole("radio", { name: "Oscuro", exact: true }).click();
  await tema.getByRole("radio", { name: "Claro", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  // El próximo guardado del tema falla (corte de red del POST de la acción).
  let fallar = true;
  await page.route("**/*", async (ruta) => {
    const p = ruta.request();
    if (fallar && p.method() === "POST" && (p.postData() ?? "").includes("preferencias_tema")) {
      await ruta.abort("failed");
      return;
    }
    await ruta.continue();
  });
  await tema.getByRole("radio", { name: "Oscuro", exact: true }).click();
  await expect(page.getByText("No pudimos guardar el tema; volvimos a Claro.")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  fallar = false;
});
