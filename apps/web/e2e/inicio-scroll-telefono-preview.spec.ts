import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar } from "./preview";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-416: en el teléfono, con el diseño nuevo, Inicio no se desplaza y «Tus accesos» queda cortado
// bajo la barra inferior. La prueba usa la empresa ficticia `qa-e2e` (nunca Gard) y no escribe nada:
// mide si la página se desplaza al cargar y después de abrir y cerrar Menú, Yo y Agente.
test.use({ actionTimeout: 30_000 });
test.setTimeout(240_000);

type Diagnostico = {
  momento: string;
  alto: number;
  ventana: number;
  scrollY: number;
  html: string;
  body: string;
  bloqueo: string | null;
};

async function diagnostico(page: Page, momento: string): Promise<Diagnostico> {
  return page.evaluate((m) => {
    const raiz = document.scrollingElement ?? document.documentElement;
    const css = (el: Element) => {
      const s = getComputedStyle(el);
      return `overflow:${s.overflowY} position:${s.position} height:${s.height}`;
    };
    return {
      momento: m,
      alto: raiz.scrollHeight,
      ventana: window.innerHeight,
      scrollY: window.scrollY,
      html: css(document.documentElement),
      body: css(document.body),
      bloqueo: document.body.getAttribute("data-scroll-locked"),
    };
  }, momento);
}

/** Desplaza como un dedo (rueda en la emulación táctil) y devuelve cuánto bajó la página. */
async function desplazar(page: Page): Promise<number> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(600);
  return page.evaluate(() => window.scrollY);
}

test.describe("@preview inicio: se desplaza en el teléfono (CAR-416)", () => {
  test.skip(!password, "Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");
  test.beforeEach(({ viewport }) => test.skip((viewport?.width ?? 0) > 500, "solo teléfono"));

  test("Inicio baja hasta «Tus accesos» antes y después de abrir Menú, Yo y Agente", async ({
    page,
  }, info) => {
    const medidas: Diagnostico[] = [];
    await entrar(page);
    await page
      .context()
      .addCookies([{ name: "opai_marco", value: "nuevo", url: new URL(page.url()).origin }]);
    await page.goto("/");
    const barra = page.getByRole("navigation", { name: "Principal" }).filter({ visible: true });
    await hidratado(barra.getByRole("button", { name: /Menú/ }));
    await expect(page.getByRole("heading", { name: "Tus accesos" })).toBeVisible();

    medidas.push(await diagnostico(page, "al cargar"));
    const bajoAlCargar = await desplazar(page);
    medidas.push({ ...(await diagnostico(page, "tras desplazar")), scrollY: bajoAlCargar });
    await capturar(page, info, "inicio-desplazado");

    for (const nombre of ["Menú", "Yo", "Agente"]) {
      const boton = barra.getByRole("button", { name: new RegExp(nombre) });
      if ((await boton.count()) === 0) continue;
      await boton.first().click();
      await page.waitForTimeout(500);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      const bajo = await desplazar(page);
      medidas.push({
        ...(await diagnostico(page, `tras abrir y cerrar ${nombre}`)),
        scrollY: bajo,
      });
    }

    await info.attach("diagnostico.json", {
      body: JSON.stringify(medidas, null, 2),
      contentType: "application/json",
    });
    for (const m of medidas.slice(1)) expect(m.scrollY, m.momento).toBeGreaterThan(0);
  });
});
