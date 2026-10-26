import { expect, type Page, test } from "@playwright/test";

/**
 * Navegación con señal de pendiente (ADR-045, arreglo de #44). Durante una navegación lenta el shell
 * marca el ítem del riel y el título de destino al instante y muestra la barra de progreso de la
 * cabecera, en vez de dejar la página anterior sin ninguna señal. Y un clic hecho apenas carga la
 * página (durante la hidratación) no se pierde: navega igual.
 */
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  const gard = page.getByRole("button", { name: /Gard Security/ });
  await Promise.race([
    gard.waitFor({ state: "visible" }),
    page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform"),
  ]).catch(() => undefined);
  if (await gard.isVisible().catch(() => false)) await gard.click();
  await page.waitForURL((u) => u.pathname === "/" || u.pathname === "/platform");
}

test("la cabecera y el riel marcan el destino durante una navegación lenta", async ({
  page,
}, testInfo) => {
  await entrar(page);
  await page.goto("/cuentas", { waitUntil: "load" });
  await page.waitForTimeout(500); // deja asentar la hidratación (el clic durante ella es otro test)

  // Latencia artificial en la navegación a Personas: la ventana de "pendiente" dura lo suficiente.
  await page.route(/\/personas(\?|$)/, async (ruta) => {
    await new Promise((r) => setTimeout(r, 1500));
    await ruta.continue();
  });

  const menu = page.getByRole("navigation", { name: "Principal" });
  await menu.getByRole("link", { name: /^Personas$/ }).first().click();

  // Señal de pendiente inmediata (antes de que llegue el contenido): barra de progreso en la cabecera.
  await expect(page.getByRole("progressbar", { name: "Cargando la página" }).first()).toBeVisible({
    timeout: 1000,
  });

  // El ítem del riel/menú marca Personas de inmediato (estado optimista), aún sin contenido nuevo.
  await expect(
    menu.getByRole("link", { name: /^Personas$/ }).first(),
  ).toHaveAttribute("aria-current", "page", { timeout: 1000 });

  // En iPad y escritorio el título de la cabecera es el del destino, no el anterior.
  if (testInfo.project.name !== "telefono") {
    await expect(page.getByRole("heading", { level: 1, name: "Personas" })).toBeVisible({
      timeout: 1000,
    });
  }

  // Y al final llega el contenido del destino.
  await expect(page.getByRole("region", { name: "Lista de personas" })).toBeVisible();
});

test("un clic apenas carga la página (durante la hidratación) navega igual", async ({ page }) => {
  await entrar(page);
  await page.goto("/cuentas", { waitUntil: "load" });
  // Sin espera: se hace clic de inmediato, mientras la página aún hidrata (clics perdidos de #44).
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: /^Personas$/ })
    .first()
    .click();
  await expect(page.getByRole("region", { name: "Lista de personas" })).toBeVisible();
  await expect(page).toHaveURL(/\/personas/);
});
