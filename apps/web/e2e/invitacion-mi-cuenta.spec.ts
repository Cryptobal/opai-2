import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";

import { urlPropietario } from "./fixtures-puestos-car8";
import { ocultarIndicadorDev } from "./indicador-dev";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-53: invitación real (invitar desde Configuración → Usuarios, aceptar creando la cuenta y entrar)
// y Mi cuenta. En dev y en CI el correo va a la consola del servidor, así que el enlace no se puede leer:
// la prueba le da a la invitación recién creada un token conocido con el rol propietario de la base
// local (lo mismo que hace `crearInvitacion`: guarda solo el sha256). El resto es el flujo real.

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);
test.beforeEach(({ page }) => ocultarIndicadorDev(page));

/** SQL por stdin con los valores como variables de psql (`:'nombre'`), nunca interpolados. */
function psql(sql: string, vars: Record<string, string> = {}): string {
  const args = Object.entries(vars).flatMap(([k, v]) => ["-v", `${k}=${v}`]);
  return (
    execFileSync("psql", [urlPropietario, "-q", "-X", "-A", "-t", ...args], {
      encoding: "utf8",
      input: sql,
    })
      .trim()
      .split("\n")
      .filter(Boolean)
      .at(-1) ?? ""
  );
}

async function abrirMiCuenta(page: Page) {
  const menu = page.getByRole("button", { name: "Menú de usuario" }).filter({ visible: true });
  const item = page.getByRole("menuitem", { name: "Mi cuenta" });
  await expect(async () => {
    if (!(await item.isVisible())) await menu.click();
    await expect(item).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await item.click();
  await page.waitForURL(/\/mi-cuenta$/);
}

test.describe("invitación y Mi cuenta", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");
  test.skip(!urlPropietario, "Necesita el rol propietario de una base local o efímera");
  test.skip(({ viewport }) => (viewport?.width ?? 0) !== 1024, "El flujo se prueba una vez (iPad)");

  test("invitar → aceptar creando la cuenta → entrar, y el enlace ya no sirve", async ({
    page,
    browser,
  }) => {
    const correo = `invitada-${Date.now()}@opai.test`;
    const clave = `Invitada${randomBytes(4).toString("hex")}9`;
    await entrar(page);
    await page.goto("/configuracion/usuarios?invitar=1");
    const hoja = page.getByRole("dialog", { name: "Invitar usuario" });
    await hoja.getByLabel("Correo").fill(correo);
    await hoja.getByRole("button", { name: "Enviar invitación" }).click();
    await expect(hoja.getByText(`Enviamos la invitación a ${correo}`)).toBeVisible();
    await hoja.getByRole("button", { name: "Listo" }).click();
    await expect(page.getByText(correo).first()).toBeVisible();

    // «Abrir el correo»: token conocido para la invitación pendiente de ese correo.
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    const id = psql(
      `UPDATE core.invitations SET token_hash = :'hash' WHERE email = :'correo'
         AND accepted_at IS NULL AND revocada_en IS NULL RETURNING id;`,
      { hash, correo },
    );
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const enlace = `/invitacion/gard/${token}`;

    const invitada = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await ocultarIndicadorDev(invitada);
    await invitada.goto(enlace);
    await expect(invitada.getByText(/te invitó como/)).toBeVisible();
    await invitada.getByLabel("Nombre y apellido").fill("Invitada E2E");
    await invitada.getByLabel("Contraseña", { exact: true }).fill(clave);
    await invitada.getByRole("button", { name: "Crear cuenta y aceptar" }).click();
    await invitada.waitForURL((u) => !u.pathname.startsWith("/invitacion"));
    await expect(invitada.getByText("Invitada E2E").first()).toBeVisible();
    const aceptada = "SELECT accepted_at IS NOT NULL FROM core.invitations WHERE id = :'id';";
    expect(psql(aceptada, { id })).toBe("t");

    // Entrar de nuevo con la cuenta creada: llega a la empresa que la invitó.
    await invitada.context().clearCookies();
    await invitada.goto("/login");
    await invitada.getByLabel("Correo").fill(correo);
    await invitada.getByLabel("Contraseña", { exact: true }).fill(clave);
    await invitada.getByRole("button", { name: "Entrar", exact: true }).click();
    await invitada.waitForURL((u) => u.pathname === "/");
    await expect(invitada.getByText("Gard Security").first()).toBeVisible();

    // Mi cuenta de la invitada (viewer): el segundo factor es opcional y se puede activar (CAR-286).
    await abrirMiCuenta(invitada);
    await expect(invitada.getByText("Tu cuenta entra solo con contraseña")).toBeVisible();
    await expect(invitada.getByRole("button", { name: "Agregar passkey" })).toBeVisible();
    await invitada.getByRole("link", { name: "Activar", exact: true }).click();
    await invitada.waitForURL(/\/activar-mfa\?next=%2Fmi-cuenta|\/activar-mfa\?next=\/mi-cuenta/);
    await expect(invitada.getByRole("link", { name: "Volver a Mi cuenta" })).toBeVisible();

    // El enlace es de un solo uso: abierto otra vez, ya no sirve.
    await invitada.context().clearCookies();
    await invitada.goto(enlace);
    await expect(invitada.getByText("Esta invitación ya se usó")).toBeVisible();
    await expect(invitada.getByRole("button", { name: "Crear cuenta y aceptar" })).toHaveCount(0);
    await invitada.close();
  });

  test("Mi cuenta de plataforma: Seguridad con la app autenticadora activa", async ({ page }) => {
    await entrar(page);
    await abrirMiCuenta(page);
    await expect(page.getByRole("heading", { name: "Seguridad" })).toBeVisible();
    await expect(page.getByText("Tu cuenta tiene un segundo factor")).toBeVisible();
    await expect(page.getByText("Activa", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Desactivar" })).toBeVisible();
  });
});
