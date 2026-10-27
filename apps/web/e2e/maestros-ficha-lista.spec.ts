import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";

import { expect, test } from "@playwright/test";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// Pulido post-#25 (QA 24-oct), en iPad y escritorio (en celular la ficha ocupa la pantalla):
//  - D1: al cambiar de pestaña con clic, la lista queda en pantalla y solo el panel derecho muestra la carga.
const baseDatos = process.env["DATABASE_URL"] ?? "";
// El bloqueo de la tabla solo se hace contra una base local o efímera, nunca contra Neon.
const baseLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(baseDatos);

/** Retiene la auditoría (la lee solo la pestaña Actividad): frena el contenido del panel, no la lista. */
async function retenerAuditoria() {
  const psql: ChildProcessWithoutNullStreams = spawn("psql", [baseDatos, "-q", "-X", "-A", "-t"]);
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
  test.skip(!baseLocal, "Necesita DATABASE_URL de una base local o efímera");

  for (const m of MODULOS) {
    test(`${m.ruta}: Actividad en carga, la lista sigue visible y solo el panel muestra el esqueleto`, async ({
      page,
    }, info) => {
      test.skip(info.project.name === "telefono", "Se prueba a 1024 y 1280 px");
      await entrar(page);
      await page.goto(m.ruta);
      const lista = page.getByRole("region", { name: m.lista });
      await lista.getByRole("link").first().click();
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
