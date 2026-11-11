import { execFileSync } from "node:child_process";

import { expect, type Page, test } from "@playwright/test";

import { urlPropietario } from "./fixtures-puestos-car8";
import { ocultarIndicadorDev } from "./indicador-dev";
import { E2E_PASSWORD } from "./sesion";

// CAR-286: un owner sin segundo factor (entra solo con contraseña) agrega una passkey en Mi cuenta ›
// Seguridad, entra con ella sin contraseña, la contraseña sola ya no basta (pide la passkey), la
// renombra y la quita confirmando con la contraseña (con aviso de que queda sin segundo factor). La
// passkey es un autenticador virtual de Chromium (WebAuthn por CDP) con verificación del usuario.
const OWNER = "mfa-pendiente-e2e@opai.cl";
const CAPTURAS = "e2e/__screenshots__";

test.use({ actionTimeout: 30_000 });
test.setTimeout(240_000);

function psql(sql: string, vars: Record<string, string> = {}): string {
  const args = Object.entries(vars).flatMap(([k, v]) => ["-v", `${k}=${v}`]);
  return execFileSync("psql", [urlPropietario, "-q", "-X", "-A", "-t", ...args], {
    encoding: "utf8",
    input: sql,
  }).trim();
}

async function autenticadorVirtual(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

async function capturar(page: Page, nombre: string) {
  for (const [ancho, alto] of [
    [375, 812],
    [1280, 860],
  ] as const) {
    await page.setViewportSize({ width: ancho, height: alto });
    await page.screenshot({ path: `${CAPTURAS}/${nombre}-${ancho}.png`, fullPage: true });
  }
}

async function conPassword(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(OWNER);
  await page.getByLabel("Contraseña", { exact: true }).fill(E2E_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

const salir = (page: Page) => page.context().clearCookies();

/** Abre una hoja o diálogo con reintento: en `next dev` el primer clic puede llegar antes de hidratar. */
async function abrir(page: Page, boton: string, dentro: ReturnType<Page["getByRole"]>) {
  await expect(async () => {
    if (!(await dentro.isVisible())) await page.getByRole("button", { name: boton }).click();
    await expect(dentro).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
}

test.describe("passkeys y métodos de acceso (CAR-286)", () => {
  test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  test.skip(!urlPropietario, "Necesita el rol propietario de una base local o efímera");
  test.skip(({ browserName }) => browserName !== "chromium", "WebAuthn virtual solo en Chromium");
  test.skip(({ viewport }) => (viewport?.width ?? 0) !== 1280, "El flujo se prueba una vez");

  test("agregar, entrar sin contraseña, segundo paso, renombrar y quitar", async ({ page }) => {
    psql(
      `DELETE FROM core.passkeys WHERE user_id = (SELECT id FROM core.users WHERE email = :'e');`,
      { e: OWNER },
    );
    await ocultarIndicadorDev(page);
    await autenticadorVirtual(page);

    // 1. Sin segundo factor: entra solo con contraseña y Mi cuenta avisa el riesgo.
    await conPassword(page);
    await page.waitForURL((u) => u.pathname === "/" || u.pathname === "/elegir-empresa");
    await page.goto("/mi-cuenta");
    await expect(page.getByText("Tu cuenta entra solo con contraseña")).toBeVisible();
    await capturar(page, "seguridad-sin-segundo-factor");

    // 2. Agrega una passkey (Face ID / huella simulados).
    const nombre = page.getByRole("textbox", { name: "Nombre" });
    await abrir(page, "Agregar passkey", nombre);
    await nombre.fill("Llave de prueba");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Llave de prueba")).toBeVisible();
    await expect(page.getByText("Tu cuenta tiene un segundo factor")).toBeVisible();
    await capturar(page, "seguridad-con-passkey");

    // 3. Entra con la passkey, sin contraseña.
    await salir(page);
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Entrar con passkey" })).toBeVisible();
    await capturar(page, "login-con-passkey");
    // El autenticador virtual responde solo: el autocompletado condicional del correo puede entrar
    // antes del clic. Cualquiera de los dos caminos es «entrar con passkey sin contraseña».
    await page
      .getByRole("button", { name: "Entrar con passkey" })
      .click({ timeout: 5_000 })
      .catch(() => undefined);
    await page.waitForURL((u) => u.pathname === "/" || u.pathname === "/elegir-empresa");

    // 4. Con contraseña, la passkey es el segundo paso.
    await salir(page);
    await conPassword(page);
    await page.waitForURL((u) => u.pathname === "/mfa");
    await expect(page.getByRole("button", { name: "Usar mi passkey" })).toBeVisible();
    await expect(page.getByLabel(/Código/)).toHaveCount(0);
    await capturar(page, "mfa-solo-passkey");
    await page.getByRole("button", { name: "Usar mi passkey" }).click();
    await page.waitForURL((u) => u.pathname !== "/mfa");

    // 5. Renombra y quita confirmando con la contraseña; avisa que queda sin segundo factor.
    await page.goto("/mi-cuenta");
    await abrir(page, "Renombrar", page.getByRole("textbox", { name: "Nombre" }));
    await page.getByRole("textbox", { name: "Nombre" }).fill("iPhone de trabajo");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("iPhone de trabajo")).toBeVisible();
    await abrir(page, "Quitar", page.getByText("Tu cuenta quedará solo con contraseña"));
    await page.getByRole("radio", { name: "Contraseña" }).click();
    await page.locator("#q-password").fill(E2E_PASSWORD ?? "");
    await capturar(page, "seguridad-quitar");
    await page.getByRole("dialog").getByRole("button", { name: "Quitar" }).click();
    await expect(page.getByText("Aún no tienes passkeys.")).toBeVisible();
    await expect(page.getByText("Tu cuenta entra solo con contraseña")).toBeVisible();
    const rastro = psql(
      `SELECT string_agg(capability, ',' ORDER BY seq) FROM core.auditoria_global
        WHERE ambito = 'seguridad' AND capability LIKE 'seguridad.passkey.%'
          AND entity_id = (SELECT id::text FROM core.users WHERE email = :'e');`,
      { e: OWNER },
    );
    expect(rastro).toMatch(
      /seguridad\.passkey\.alta.*seguridad\.passkey\.renombrada.*seguridad\.passkey\.baja/,
    );
  });
});
