import { expect, type Locator, test } from "@playwright/test";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Pulido post-#25 (QA 24-oct): el filtro de Actividad y las hojas (`?subir`, `?excepcion`) de la ficha de
// Personas conservan la búsqueda de la lista (`?q=`).

test.use({ actionTimeout: 30_000 });
test.setTimeout(120_000);

test.describe("Personas · la búsqueda de la lista no se pierde", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("Actividad (filtro), Documentos (?subir) y Laboral (?excepcion) conservan ?q=", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Se prueba a 1280 px");
    await entrar(page);
    await page.goto("/personas?q=a");
    const lista = page.getByRole("region", { name: "Lista de personas" });
    await lista.locator('a[href^="/personas/"]:not([href*="vencimientos"])').first().click();
    await page.waitForURL(/\/personas\/[0-9a-f-]{36}\?q=a/);
    const id = new URL(page.url()).pathname.split("/")[2];
    const ficha = page.getByRole("region", { name: "Detalle" });
    // Con la hoja abierta (?subir, ?excepcion) Radix oculta el resto de la página a los roles: se usa CSS.
    const columna = page.locator('section[aria-label="Lista de personas"]');
    const buscador = columna.locator("input").first();
    const filas = columna.locator('a[href^="/personas/"]:not([href*="vencimientos"])');
    /** Espera al enlace visible y habilitado, lo pulsa y espera la URL esperada; reintenta si la página aún se hidrataba. */
    const pulsar = (enlace: Locator, url: (u: URL) => boolean) =>
      expect(async () => {
        await expect(enlace).toBeVisible();
        await expect(enlace).toBeEnabled();
        await enlace.click();
        await page.waitForURL((u) => url(u), { timeout: 5_000 });
      }).toPass({ timeout: 30_000 });
    /** En pantalla: el campo de búsqueda sigue con «a» y la lista sigue filtrada por ella. */
    const busquedaVisible = async (donde: string) => {
      await page.reload();
      await expect(buscador, `${donde}: el campo conserva la búsqueda`).toHaveValue("a");
      // La lista se re-renderiza al terminar de filtrar: se espera a que TODAS las filas coincidan.
      await expect
        .poll(
          async () => {
            const textos = await filas.allInnerTexts();
            return textos.length > 0 && textos.every((t) => /a/i.test(t));
          },
          { message: `${donde}: la lista tiene filas y todas coinciden con la búsqueda` },
        )
        .toBe(true);
    };

    await page.goto(`/personas/${id}/actividad?q=a`);
    await pulsar(
      ficha.getByRole("link", { name: "Agentes" }),
      (u) => u.searchParams.get("actor") === "agente",
    );
    expect(new URL(page.url()).searchParams.get("q")).toBe("a");
    await busquedaVisible("Actividad · Agentes");
    await pulsar(ficha.getByRole("link", { name: "Todo" }), (u) => !u.searchParams.has("actor"));
    expect(new URL(page.url()).searchParams.get("q")).toBe("a");
    await busquedaVisible("Actividad · Todo");

    for (const [tab, enlace, param] of [
      ["documentos", "Subir documento", "subir"],
      ["laboral", "Definir excepción para esta persona", "excepcion"],
    ] as const) {
      await page.goto(`/personas/${id}/${tab}?q=a`);
      await pulsar(
        page.getByRole("link", { name: enlace }).first(),
        (u) => u.searchParams.get(param) === "1",
      );
      expect(new URL(page.url()).searchParams.get("q"), `${param} conserva q`).toBe("a");
      await busquedaVisible(`?${param}`);
    }
  });
});
