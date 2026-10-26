import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";

import { expect, type Page, test } from "@playwright/test";

// Pulido post-#25 (QA 24-oct), en iPad y escritorio (en celular la ficha ocupa la pantalla):
//  - D1: al cambiar de pestaña con clic, la lista queda en pantalla y solo el panel derecho muestra la carga.
const email = process.env["E2E_EMAIL"] ?? "carlos.irigoyen@opai.cl";
const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
// El lock ACCESS EXCLUSIVE sobre audit_events exige UPDATE/DELETE/TRUNCATE o MAINTAIN; desde el
// Brief 07d opai_app ya no tiene UPDATE/DELETE sobre la auditoría (append-only, §6), así que el
// lock se toma con el rol propietario (DATABASE_URL_MIGRATE), nunca con el rol de la app (DATABASE_URL).
const baseLock = process.env["DATABASE_URL_MIGRATE"] ?? "";
// El bloqueo de la tabla solo se hace contra una base local o efímera, nunca contra Neon.
const baseLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(baseLock);

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/platform");
}

/** Retiene la auditoría (la lee solo la pestaña Actividad): frena el contenido del panel, no la lista. */
async function retenerAuditoria() {
  const psql: ChildProcessWithoutNullStreams = spawn("psql", [baseLock, "-q", "-X", "-A", "-t"]);
  let salida = "";
  psql.stdout.on("data", (d: Buffer) => (salida += d.toString()));
  psql.on("error", () => undefined); // sin psql, la espera de abajo vence y el test falla con su mensaje
  psql.stdin.write(
    "BEGIN;\nLOCK TABLE core.audit_events IN ACCESS EXCLUSIVE MODE;\nSELECT 'retenida';\n",
  );
  const liberar = () => {
    psql.stdin.end("ROLLBACK;\n");
  };
  try {
    await expect.poll(() => salida, { timeout: 15_000 }).toContain("retenida");
  } catch (error) {
    liberar(); // si vence la espera, no deja la tabla retenida
    throw error;
  }
  return liberar;
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
  test.skip(!baseLocal, "Necesita DATABASE_URL_MIGRATE (rol propietario) de una base local o efímera");

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
      const ficha = page.getByRole("region", { name: "Detalle" });
      await expect(ficha.getByRole("link", { name: /^Actividad/ }).first()).toBeVisible();
      const liberar = await retenerAuditoria();
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
        liberar();
      }
      await expect(ficha.getByText("Últimos 30 días")).toBeVisible();
      await expect(lista).toBeVisible();
    });
  }
});
