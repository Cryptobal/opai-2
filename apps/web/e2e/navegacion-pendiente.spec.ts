import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { entrar as iniciarSesion } from "./sesion";

/**
 * Navegación con señal de pendiente (ADR-045, arreglo de #44). Durante una navegación lenta el shell
 * marca el ítem del riel y el título de destino al instante (sin parpadeo ni barra de progreso,
 * decisión 1 de ADR-045), en vez de dejar la página anterior sin ninguna señal, y al asentarse la
 * hidratación la navegación completa el destino. Un clic hecho durante la hidratación, en cambio,
 * todavía entra en la carrera prefetch↔navegación de Cache Components y se cuelga: queda como
 * `test.fixme` al final, con la razón.
 */
async function entrar(page: Page) {
  await iniciarSesion(page);
  const gard = page.getByRole("button", { name: /Gard Security/ });
  if (new URL(page.url()).pathname === "/elegir-empresa") await gard.click();
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
  // En iPad y escritorio el área «Personas» del riel puede venir plegada (solo se abre sola la del
  // destino actual, y otras specs pueden haberla plegado): se abre antes del clic, como un usuario.
  const area = menu.getByRole("button", { name: "Personas", exact: true });
  if ((await area.count()) && (await area.getAttribute("aria-expanded")) !== "true") {
    await hidratado(area);
    await area.click();
  }
  // El clic durante la hidratación se cuelga (carrera prefetch↔navegación): se espera a que el enlace
  // hidrate. En CI, más lenta, los 500 ms de arriba no bastan.
  const destino = menu.getByRole("link", { name: /^Personas$/ }).first();
  await hidratado(destino);
  await destino.click();

  // Señal de pendiente inmediata (antes de que llegue el contenido): el ítem del riel/menú marca
  // Personas de inmediato (estado optimista), aún sin contenido nuevo.
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

// PENDIENTE (ADR-045 decisión 1, precarga activa). Historial: con la precarga por intención (cursor,
// toque o foco) de las entradas del menú un clic durante la hidratación entraba en carrera con el
// prefetch completo en vuelo de Cache Components y la navegación se colgaba (el riel y el título
// marcaban el destino, pero el contenido se quedaba en la página anterior). El `cache()` de
// `marcaGenerado` no lo resolvía. En el B1 5.º ajuste `LinkMenu` dejó de forzar `prefetch` completo por
// intención (renderizaba en el servidor el hueco dinámico —sesión de Better Auth— de páginas del menú
// que nadie abría, los P2028 del QA en vivo del #136): queda la precarga POR DEFECTO de Next (solo el
// shell estático del Suspense), así que la precarga NO se desactiva. La navegación en estado estable
// cumple (test anterior); el clic durante la hidratación queda pendiente, sin verificar aquí.
test.fixme("un clic apenas carga la página (durante la hidratación) navega igual", async ({ page }) => {
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
