import { expect, type Page, test } from "@playwright/test";

// Pulido post-#25 (QA 24-oct): el filtro de Actividad y las hojas (`?subir`, `?excepcion`) de la ficha de
// Personas conservan la búsqueda de la lista (`?q=`).
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");
}

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
    const buscador = lista.getByRole("searchbox");
    const filas = lista.locator('a[href^="/personas/"]:not([href*="vencimientos"])');
    /** En pantalla: el campo de búsqueda sigue con «a» y la lista sigue filtrada por ella. */
    const busquedaVisible = async (donde: string) => {
      await page.reload();
      await expect(buscador, `${donde}: el campo conserva la búsqueda`).toHaveValue("a");
      const total = await filas.count();
      expect(total, `${donde}: la lista tiene filas`).toBeGreaterThan(0);
      for (let i = 0; i < total; i++) await expect(filas.nth(i)).toContainText(/a/i);
    };

    await page.goto(`/personas/${id}/actividad?q=a`);
    await ficha.getByRole("link", { name: "Agentes" }).click();
    await expect(page).toHaveURL(/actor=agente/);
    expect(new URL(page.url()).searchParams.get("q")).toBe("a");
    await busquedaVisible("Actividad · Agentes");
    await ficha.getByRole("link", { name: "Todo" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("actor")).toBeNull();
    expect(new URL(page.url()).searchParams.get("q")).toBe("a");
    await busquedaVisible("Actividad · Todo");

    for (const [tab, enlace, param] of [
      ["documentos", "Subir documento", "subir"],
      ["laboral", "Definir excepción para esta persona", "excepcion"],
    ] as const) {
      await page.goto(`/personas/${id}/${tab}?q=a`);
      await page.getByRole("link", { name: enlace }).first().click();
      await expect.poll(() => new URL(page.url()).searchParams.get(param)).toBe("1");
      expect(new URL(page.url()).searchParams.get("q"), `${param} conserva q`).toBe("a");
      await busquedaVisible(`?${param}`);
    }
  });
});
