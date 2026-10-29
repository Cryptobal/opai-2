import { expect, type Page, test } from "@playwright/test";
import { ocultarIndicadorDev } from "./indicador-dev";
import { codigoTotp } from "./sesion";

const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
const esperar = expect.configure({ timeout: 30_000 });

// Solo dev (CI levanta `next dev`): el indicador de Next tapa «Guardar» en la hoja del teléfono y el
// «Menú de usuario» al pie de la barra lateral, e intercepta el clic.
test.beforeEach(({ page }) => ocultarIndicadorDev(page));

async function entrar(page: Page, ruta = "/login") {
  if (!password) throw new Error("Falta E2E_PASSWORD o SEED_OWNER_PASSWORD");
  await page.goto(ruta);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => u.pathname !== "/login");
  if (new URL(page.url()).pathname === "/mfa") {
    await page.getByLabel(/Código/).fill(await codigoTotp());
    await page.getByRole("button", { name: "Verificar" }).click();
  }
  await page.waitForURL((u) => !["/login", "/mfa", "/elegir-empresa"].includes(u.pathname));
}

async function abrirMenu(page: Page) {
  const boton = page.getByRole("button", { name: "Menú de usuario" }).filter({ visible: true });
  await expect(async () => {
    if ((await boton.getAttribute("aria-expanded")) !== "true") await boton.click();
    await expect(boton).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass({ timeout: 30_000 });
}

async function elegir(page: Page, nombre: string) {
  await abrirMenu(page);
  await page.getByRole("menuitem", { name: "Portal de inicio", exact: true }).click();
  const hoja = page.getByRole("dialog", { name: "Portal de inicio", exact: true });
  await esperar(hoja.getByLabel("Portal de inicio", { exact: true })).toBeEnabled();
  await hoja.getByLabel("Portal de inicio", { exact: true }).click();
  await page.getByRole("option", { name: nombre, exact: true }).click();
  await hoja.getByRole("button", { name: "Guardar", exact: true }).click();
  await esperar(hoja).not.toBeVisible();
  await esperar(
    page.getByText("Portal de inicio guardado. Lo usaremos la próxima vez que entres."),
  ).toBeVisible();
}

test("elige con DS V2, persiste tras login y respeta next explícito", async ({ page }, info) => {
  test.setTimeout(180_000);
  await entrar(page, "/login?next=%2F");
  try {
    await elegir(page, "Supervisor");
    await page.context().clearCookies();
    await entrar(page);
    await esperar(page).toHaveURL(/\/supervisor$/);
    await abrirMenu(page);
    await page.getByRole("menuitem", { name: "Portal de inicio", exact: true }).click();
    const hoja = page.getByRole("dialog", { name: "Portal de inicio" });
    await esperar(hoja.getByLabel("Portal de inicio", { exact: true })).toContainText("Supervisor");
    // La hoja enfoca inicialmente Cerrar mientras se cargan los datos; Tab llega al selector.
    for (let i = 0; i < 4; i++) {
      if (
        await hoja
          .getByLabel("Portal de inicio", { exact: true })
          .evaluate((e) => e === document.activeElement)
      )
        break;
      await page.keyboard.press("Tab");
    }
    await expect(hoja.getByLabel("Portal de inicio", { exact: true })).toBeFocused();
    await page.screenshot({
      path: `/tmp/opencode/d1-portal-inicio-${info.project.name}.png`,
      fullPage: true,
    });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await page.screenshot({
      path: `/tmp/opencode/d1-portal-inicio-${info.project.name}-oscuro.png`,
      fullPage: true,
    });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.keyboard.press("Escape");
    await page.context().clearCookies();
    await entrar(page, "/login?next=%2Fpersonas");
    await esperar(page).toHaveURL(/\/personas$/);
  } finally {
    await page.goto("/");
    await elegir(page, "Primero permitido");
  }
});

test("el menú oculta la preferencia en Cliente y Plataforma", async ({ page }) => {
  await entrar(page, "/login?next=%2F");
  for (const ruta of ["/cliente", "/platform", "/supervisor", "/trabajador", "/terreno", "/"]) {
    await page.goto(ruta);
    // No aceptar un menú de otro portal después de una redirección o navegación pendiente.
    await esperar(page).toHaveURL((url) => url.pathname === ruta);
    await abrirMenu(page);
    const item = page.getByRole("menuitem", { name: "Portal de inicio", exact: true });
    await expect(item).toHaveCount(["/cliente", "/platform"].includes(ruta) ? 0 : 1);
    await page.keyboard.press("Escape");
  }
});

test("distingue error de carga y permite reintentar", async ({ page }) => {
  await entrar(page, "/login?next=%2F");
  await abrirMenu(page);
  await page.route("**/*", async (route) => {
    if (route.request().headers()["next-action"]) await route.abort();
    else await route.continue();
  });
  await page.getByRole("menuitem", { name: "Portal de inicio", exact: true }).click();
  const hoja = page.getByRole("dialog", { name: "Portal de inicio", exact: true });
  await esperar(hoja.getByText("No pudimos cargar tus portales")).toBeVisible();
  await expect(hoja.getByText("No pudimos guardar")).toHaveCount(0);
  await expect(hoja.getByRole("button", { name: "Guardar", exact: true })).toBeDisabled();
  await page.unroute("**/*");
  await hoja.getByRole("button", { name: "Reintentar" }).click();
  await esperar(hoja.getByLabel("Portal de inicio", { exact: true })).toBeEnabled();
  await expect(hoja.getByText("No pudimos cargar tus portales")).toHaveCount(0);
});
