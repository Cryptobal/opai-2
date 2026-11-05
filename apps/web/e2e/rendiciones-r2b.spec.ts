import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

import { hidratado } from "./hidratacion";
import { entrar } from "./sesion";

// CAR-197 · pantallas de quien rinde (ERP y portal Supervisor): lista con pestañas, compra de dos pasos
// con total corriente, aviso de boleta repetida, guardar borrador y enviar con confirmación, y
// kilometraje con el desglose del servidor. La empresa de prueba se deja sin exigir respaldo (el
// almacenamiento de archivos no existe en e2e) y con kilometraje por consumo.
const SQL = `
INSERT INTO core.tenant_modules (id, tenant_id, modulo_id, estado, activado_en, updated_at)
SELECT gen_random_uuid(), t.id, 'rendiciones', 'activo', now(), now() FROM core.tenants t WHERE t.slug = 'gard'
ON CONFLICT DO NOTHING;
UPDATE core.instalaciones SET lat = -33.36, lng = -70.74 WHERE nombre = 'Planta Quilicura';
UPDATE core.instalaciones SET lat = -33.44, lng = -70.76 WHERE nombre = 'CD Pudahuel';
INSERT INTO core.ajustes (id, tenant_id, ambito, sujeto_id, modulo, clave, valor, updated_at)
SELECT gen_random_uuid(), t.id, 'tenant', t.id, 'rendiciones', a.clave, a.valor::jsonb, now()
FROM core.tenants t, (VALUES ('exigir_respaldo','false'),('km_metodo','"consumo"'),('km_rendimiento_km_l','10'),
  ('km_precio_litro_clp','1500'),('km_recargo_desgaste_pct','10'),
  ('aprobador_defecto_id', to_jsonb((SELECT id::text FROM core.users WHERE email = 'mfa-pendiente-e2e@opai.cl'))::text)) AS a(clave, valor)
WHERE t.slug = 'gard'
ON CONFLICT (tenant_id, ambito, sujeto_id, modulo, clave) DO UPDATE SET valor = EXCLUDED.valor;`;

test.beforeAll(() => {
  const url = process.env["DATABASE_URL_MIGRATE"];
  if (!url) throw new Error("Falta DATABASE_URL_MIGRATE");
  execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-c", SQL], { stdio: "inherit" });
});

// El aviso «uncached data during prerendering» es del servidor de desarrollo (también sale en `/`): no es de esta pantalla.
function vigilarConsola(page: Page): string[] {
  const errores: string[] = [];
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("pageerror", (e) => errores.push(e.message));
  return errores;
}

async function elegir(page: Page, etiqueta: string | RegExp, opcion: string | RegExp) {
  const sel = page.getByRole("button", { name: etiqueta });
  await expect(async () => {
    await sel.click();
    await page.getByRole("option", { name: opcion }).first().click({ timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
}

async function gasto(page: Page, p: { folio: string; monto: string; proveedor: string }) {
  const continuar = page.getByRole("button", { name: "Continuar" });
  await hidratado(continuar);
  await continuar.click();
  await page.getByLabel("Monto (CLP)").fill(p.monto);
  await page.getByLabel(/Folio de la/).fill(p.folio);
  await page.getByLabel("Proveedor").fill(p.proveedor);
  await page.getByLabel("Descripción").fill("Insumos de prueba");
}

for (const portal of [
  { nombre: "ERP", base: "/rendiciones" },
  { nombre: "Supervisor", base: "/supervisor/rendiciones" },
]) {
  test.describe(portal.nombre, () => {
    test("mis rendiciones, compra con total corriente, duplicado, borrador y envío", async ({ page }, info) => {
      const errores = vigilarConsola(page);
      const sello = `${info.project.name}-${portal.nombre}-${Date.now()}`;
      await entrar(page);
      await page.goto(portal.base);
      await expect(page.getByRole("link", { name: /Enviadas/ }).first()).toBeVisible();
      for (const t of ["Borradores", "Devueltas", "Aprobadas", "Pagadas"])
        await expect(page.getByRole("link", { name: new RegExp(t) }).first()).toBeVisible();
      await info.attach("lista", { body: await page.screenshot(), contentType: "image/png" });

      await page.getByRole("link", { name: "Nueva rendición" }).first().click();
      await page.waitForURL(`**${portal.base}/nueva`);
      await page.getByRole("link", { name: /Compra con boleta/ }).click();
      await page.waitForURL(`**${portal.base}/nueva/compra`);
      await expect(page.getByText("Paso 1 de 2")).toBeVisible();
      await page.getByText("Factura", { exact: true }).click();
      await gasto(page, { folio: `F-${sello}`.slice(0, 38), monto: "12500", proveedor: `Ferretería ${sello}`.slice(0, 100) });
      await expect(page.getByText("Paso 2 de 2")).toBeVisible();
      await info.attach("paso-2", { body: await page.screenshot(), contentType: "image/png" });
      await page.getByRole("button", { name: "Agregar gasto" }).click();
      await expect(page.getByText(/\$\s?12\.500/).first()).toBeVisible();

      await page.getByRole("button", { name: "Agregar otro gasto" }).click();
      await gasto(page, { folio: "B-2", monto: "7500", proveedor: "Librería Norte" });
      await page.getByRole("button", { name: "Agregar gasto" }).click();
      await expect(page.getByText(/\$\s?20\.000/).first()).toBeVisible();

      await page.getByLabel("Motivo de la rendición").fill(`Compras ${sello}`);
      await info.attach("resumen", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
      await page.getByRole("button", { name: "Guardar borrador" }).first().click();
      await page.waitForURL(`**${portal.base}`);
      await expect(page.getByText(`Compras ${sello}`).filter({ visible: true }).first()).toBeVisible();

      // Duplicado: misma factura (proveedor, folio y monto) en otra rendición → aviso que no bloquea.
      await page.goto(`${portal.base}/nueva/compra`);
      await gasto(page, { folio: `F-${sello}`.slice(0, 38), monto: "12500", proveedor: `Ferretería ${sello}`.slice(0, 100) });
      await expect(page.getByText(/ya fue rendida en REN-\d+/)).toBeVisible({ timeout: 15_000 });

      // Borrador → editar y enviar con confirmación.
      await page.goto(portal.base);
      // En tabla la fila entera es el enlace (cubre el texto): se abre por su enlace.
      await page.locator("tr, li").filter({ hasText: sello }).filter({ visible: true }).getByRole("link").first().click();
      await page.getByRole("link", { name: "Editar y enviar" }).click();
      await elegir(page, "Quién aprueba", /./);
      await page.getByRole("button", { name: "Enviar a aprobación" }).first().click();
      await expect(page.getByRole("dialog")).toContainText(/\$\s?20\.000/);
      await page.getByRole("dialog").getByRole("button", { name: "Confirmar y enviar" }).click();
      await page.waitForURL(`**${portal.base}/enviadas`);
      await expect(page.getByText(`Compras ${sello}`).filter({ visible: true }).first()).toBeVisible();
      expect(errores.filter((e) => !/Failed to load resource|favicon|uncached data during prerendering/.test(e))).toEqual([]);
    });

    test("kilometraje: desglose del servidor, el monto no se escribe", async ({ page }, info) => {
      const errores = vigilarConsola(page);
      await entrar(page);
      await page.goto(`${portal.base}/nueva/kilometraje`);
      await elegir(page, "Origen", "Planta Quilicura");
      await elegir(page, "Destino", "CD Pudahuel");
      await expect(page.getByText("Total a rendir")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByLabel(/monto/i)).toHaveCount(0);
      await page.getByLabel("Peaje (opcional)").fill("2000");
      await page.getByRole("switch", { name: /Ida y vuelta/ }).click();
      await expect(page.getByText(/Peaje/).first()).toBeVisible();
      await info.attach("km", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
      expect(errores.filter((e) => !/Failed to load resource|favicon|uncached data during prerendering/.test(e))).toEqual([]);
    });

    test("estado vacío de una pestaña sin rendiciones", async ({ page }) => {
      await entrar(page);
      await page.goto(`${portal.base}/pagadas`);
      await expect(page.getByText(/No tienes rendiciones pagadas|Aún no has rendido gastos/)).toBeVisible();
    });
  });
}
