import { execFileSync } from "node:child_process";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { capturar, EN_PREVIEW } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// CAR-267 · Factores guardados en la hoja «Ceder factura»: se guarda un factor escrito a mano, queda en la lista y
// elegirlo llena el formulario. No cede nada. En local usa la factura aceptada ficticia de `seed-ventas-e2e.ts`; en
// `preview-e2e`, la de la empresa ficticia `qa-e2e` (`packages/db/scripts/qa-e2e/factura-aceptada.sql`).
test.setTimeout(240_000);
test.skip(!E2E_PASSWORD, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

const EMITIDA = EN_PREVIEW
  ? "00000000-0000-7000-8000-000000267002"
  : "00000000-0000-7000-8000-000000002553";
const NUMERO: Record<string, string> = { telefono: "1", ipad: "2", desktop: "3" };
// Un par de factores ficticios por proyecto (RUT con dígito verificador válido): los proyectos corren en paralelo.
const FACTORES: Record<string, [string, string]> = {
  telefono: ["76.000.101-5", "76.000.201-1"],
  ipad: ["76.000.102-3", "76.000.202-K"],
  desktop: ["76.000.103-1", "76.000.203-8"],
};

/** Captura de la pantalla visible: con la hoja abierta, la captura de página completa la redibuja a medias. */
async function capturarVisible(page: Page, info: TestInfo, nombre: string) {
  const carpeta = EN_PREVIEW ? "test-results/capturas" : "e2e/__screenshots__";
  await page.screenshot({ path: `${carpeta}/${nombre}-${info.project.name}.png` });
}

test.describe("@preview finanzas: factores para ceder", () => {
  test("guardar un factor lo deja en la lista y elegirlo llena la cesión", async ({
    page,
  }, info) => {
    const proyecto = info.project.name;
    // Cada corrida cambia un dato, así siempre hay algo que guardar aunque el factor ya exista de una corrida anterior.
    const corrida = Date.now().toString(36);
    if (!EN_PREVIEW)
      execFileSync(
        "pnpm",
        [
          "--filter",
          "@opai/auth",
          "exec",
          "tsx",
          "scripts/seed-ventas-e2e.ts",
          NUMERO[proyecto] ?? "1",
        ],
        {
          cwd: new URL("../../..", import.meta.url),
          env: process.env,
          stdio: "inherit",
        },
      );
    const [rutA, rutB] = FACTORES[proyecto] ?? FACTORES["telefono"]!;
    const nombreA = `Factor Uno ${proyecto} (ficticio)`;
    const nombreB = `Factor Dos ${proyecto} (ficticio)`;

    await entrar(page);
    await page.goto(`/finanzas/ventas/${EMITIDA}`);
    const ceder = page.getByRole("button", { name: "Ceder", exact: true });
    await expect(ceder).toBeVisible({ timeout: 60_000 });
    await hidratado(ceder);
    await ceder.click();
    const hoja = page.getByRole("dialog", { name: "Ceder factura" });
    await expect(hoja).toBeVisible();
    const guardar = hoja.getByRole("button", { name: /^(Guardar|Actualizar) factor$/ });
    await expect(guardar).toBeDisabled();

    // Factor A, escrito a mano y guardado.
    await hoja.getByLabel("RUT del factor").fill(rutA);
    await hoja.getByLabel("Nombre del factor").fill(nombreA);
    await hoja.getByLabel("Correo del factor").fill(`uno-${corrida}@factor.test`);
    await hoja.getByLabel("Dirección del factor").fill("Av. Ficticia 101");
    await expect(guardar).toBeEnabled();
    await guardar.click();
    await expect(page.getByText("Factor guardado").first()).toBeVisible({ timeout: 30_000 });
    const lista = hoja.getByRole("button", { name: "Elegir un factor guardado" });
    await expect(lista).toBeVisible();
    // Ya guardado y sin cambios: no hay nada que guardar.
    await expect(hoja.getByRole("button", { name: "Actualizar factor" })).toBeDisabled();

    // Factor B, sin correo ni dirección.
    await hoja.getByLabel("RUT del factor").fill(rutB);
    await hoja.getByLabel("Nombre del factor").fill(nombreB);
    await hoja.getByLabel("Correo del factor").fill("");
    await hoja.getByLabel("Dirección del factor").fill(`Calle Ficticia ${corrida}`);
    await guardar.click();
    await expect(lista).toContainText(nombreB, { timeout: 30_000 });

    // Elegir A de la lista llena los cuatro campos.
    await lista.click();
    await expect(page.getByRole("option").first()).toBeVisible();
    await capturarVisible(page, info, "ceder-factores-lista");
    await page.getByRole("option", { name: new RegExp(nombreA.replace(/[()]/g, "\\$&")) }).click();
    await expect(hoja.getByLabel("RUT del factor")).toHaveValue(rutA);
    await expect(hoja.getByLabel("Nombre del factor")).toHaveValue(nombreA);
    await expect(hoja.getByLabel("Correo del factor")).toHaveValue(`uno-${corrida}@factor.test`);
    await expect(hoja.getByLabel("Dirección del factor")).toHaveValue("Av. Ficticia 101");

    // Cambiar un dato de un factor guardado ofrece actualizarlo.
    await hoja.getByLabel("Correo del factor").fill("otro@factor.test");
    await expect(hoja.getByRole("button", { name: "Actualizar factor" })).toBeEnabled();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await capturarVisible(page, info, "ceder-factores-hoja");
  });

  test("el catálogo de factores aparece en los ajustes de Finanzas", async ({ page }, info) => {
    await entrar(page);
    await page.goto("/configuracion/modulo/finanzas?seccion=ajustes");
    const ajuste = page.getByText("Factores para ceder facturas").first();
    await expect(ajuste).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
    await ajuste.scrollIntoViewIfNeeded();
    await capturar(page, info, "ceder-factores-ajuste");
  });
});
