import { expect, type Page, test } from "@playwright/test";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Pulido post-#25 (QA 24-oct), en iPad y escritorio (en celular la ficha ocupa la pantalla):
//  - D1: al cambiar de pestaña con clic, la lista queda en pantalla y solo el panel derecho muestra la carga.
// Antes se frenaba la pestaña con un LOCK ACCESS EXCLUSIVE sobre core.audit_events, pero desde las
// lecturas auditadas (NÚCLEO-H) toda lectura agrega su fila de auditoría: el lock frenaba también la
// lista, la ficha y los contadores, y la prueba vencía a los 3 minutos. Ahora se retiene en la red
// solo la respuesta de la pestaña Actividad (el patrón de navegacion-pendiente.spec.ts).

/** Retiene las respuestas de la pestaña Actividad hasta liberar: frena el panel, no la lista. */
async function retenerActividad(page: Page) {
  let soltar = () => undefined as void;
  const retenida = new Promise<void>((r) => (soltar = r));
  await page.route(/\/actividad(\?|$)/, async (ruta) => {
    await retenida;
    await ruta.continue();
  });
  return async () => {
    soltar();
    await page.unrouteAll({ behavior: "ignoreErrors" });
  };
}

const MODULOS = [
  { ruta: "/cuentas", lista: "Lista de cuentas" },
  { ruta: "/instalaciones", lista: /^Lista de / },
  { ruta: "/personas", lista: "Lista de personas" },
] as const;

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

test.describe("la lista queda a la vista mientras la ficha carga", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  for (const m of MODULOS) {
    test(`${m.ruta}: Actividad en carga, la lista sigue visible y solo el panel muestra el esqueleto`, async ({
      page,
    }, info) => {
      test.skip(info.project.name === "telefono", "Se prueba a 1024 y 1280 px");
      await entrar(page);
      await page.goto(m.ruta);
      const lista = page.getByRole("region", { name: m.lista });
      // El primer enlace de la lista es la acción "Nueva" (cabecera del patrón); abrimos una ficha
      // real: el primer enlace visible cuyo href apunta a un registro (`<ruta>/<uuid>`), evitando
      // el esqueleto de página que el layout deja en el DOM (oculto por CSS, ver más abajo).
      await lista.locator(`a[href^="${m.ruta}/"]:not([href$="/nueva"]):visible`).first().click();
      await page.waitForURL(new RegExp(`${m.ruta}/[0-9a-f-]{36}`));
      const urlFicha = page.url();
      // Pre-compila la pestaña Actividad antes de retenerla: en dev la primera visita la compila.
      await page.goto(`${urlFicha}/actividad`);
      await expect(page.getByText("Últimos 30 días").first()).toBeVisible();
      await page.goto(urlFicha);
      const ficha = page.getByRole("region", { name: "Detalle" });
      await expect(ficha.getByRole("link", { name: /^Actividad/ }).first()).toBeVisible();
      const liberar = await retenerActividad(page);
      try {
        await ficha
          .getByRole("link", { name: /^Actividad/ })
          .first()
          .click();
        await page.waitForURL(/\/actividad/);
        await page.waitForTimeout(700); // el momento en que QA vio la pantalla vacía
        await expect(lista, "la lista no desaparece").toBeVisible();
        await expect(lista.getByRole("link").first()).toBeVisible();
        await expect(ficha.getByLabel("Cargando"), "la carga es solo del panel").toBeVisible();
        // Desde #29 el layout deja un esqueleto de página en el DOM, oculto por CSS: solo cuenta lo visible.
        await expect(page.getByLabel("Cargando").locator("visible=true")).toHaveCount(1);
      } finally {
        await liberar();
      }
      await expect(ficha.getByText("Últimos 30 días")).toBeVisible();
      await expect(lista).toBeVisible();
    });
  }
});
