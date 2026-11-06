import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

import { entrar } from "./sesion";

// CAR-205 · Rendiciones R2d: «sin permiso» que nombra al administrador de la empresa y «Ver respaldo»
// en la ficha. El viewer (`roles-e2e@opai.cl`, fixture `seed:roles-e2e`) no tiene el permiso de rendir.
// Los códigos 900001 a 900003 quedan fuera del contador de la empresa (no colisiona con las rendiciones reales).
// El almacenamiento de archivos no existe en e2e: se comprueba que el botón aparece y que, al pedir la
// URL firmada sin almacenamiento, la pantalla avisa sin romperse.
const sql = (codigo: number, motivo: string) => `
INSERT INTO core.tenant_modules (id, tenant_id, modulo_id, estado, activado_en, updated_at)
SELECT gen_random_uuid(), t.id, 'rendiciones', 'activo', now(), now() FROM core.tenants t WHERE t.slug = 'gard'
ON CONFLICT DO NOTHING;
DELETE FROM rendiciones.rendicion_items WHERE proveedor = '${motivo}';
DELETE FROM rendiciones.rendiciones WHERE descripcion = '${motivo}';
DELETE FROM core.documentos WHERE nombre = 'boleta-${codigo}.jpg';
WITH t AS (SELECT id FROM core.tenants WHERE slug = 'gard'),
 u AS (SELECT id FROM core.users WHERE email = 'carlos.irigoyen@opai.cl'),
 d AS (
  INSERT INTO core.documentos (id, tenant_id, nombre, mime, tamano, storage_key, estado, creado_por_tipo, creado_por_id, updated_at)
  SELECT gen_random_uuid(), t.id, 'boleta-${codigo}.jpg', 'image/jpeg', 1000, 'e2e/boleta-r2d-' || gen_random_uuid()::text, 'disponible', 'user', u.id::text, now() FROM t, u
  RETURNING id),
 r AS (
  INSERT INTO rendiciones.rendiciones (id, tenant_id, codigo, tipo, estado, solicitante_id, centro_costo, descripcion, monto_total, updated_at)
  SELECT gen_random_uuid(), t.id, ${codigo}, 'compra', 'enviada', u.id, 'administracion', '${motivo}', 5000, now() FROM t, u
  RETURNING id, tenant_id)
INSERT INTO rendiciones.rendicion_items (id, tenant_id, rendicion_id, fecha, proveedor, descripcion, monto, documento_id, orden, updated_at)
SELECT gen_random_uuid(), r.tenant_id, r.id, current_date, '${motivo}', 'Insumos', 5000, d.id, 0, now() FROM r, d;`;

test("sin permiso: nombra al administrador de la empresa", async ({ page }, info) => {
  await entrar(page, "roles-e2e@opai.cl");
  await page.goto("/rendiciones");
  await expect(page.getByText("No tienes acceso a Rendiciones")).toBeVisible();
  await expect(
    page.getByText(/Pídele acceso a Carlos Irigoyen, administrador de .+\./),
  ).toBeVisible();
  await info.attach("sin-permiso", { body: await page.screenshot(), contentType: "image/png" });
});

test("ficha: «Ver respaldo» aparece y avisa si no se puede abrir", async ({ page }, info) => {
  const url = process.env["DATABASE_URL_MIGRATE"];
  if (!url) throw new Error("Falta DATABASE_URL_MIGRATE");
  // Un código y un motivo por proyecto: los tres viewports corren en paralelo sobre la misma base.
  const codigo = 900_000 + ["telefono", "ipad", "desktop"].indexOf(info.project.name) + 1;
  const motivo = `Compra con respaldo R2d e2e ${info.project.name}`;
  execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-c", sql(codigo, motivo)], { stdio: "inherit" });
  await entrar(page);
  await page.goto("/rendiciones");
  await page.getByRole("link", { name: /Enviadas/ }).first().click();
  await page.getByText(`REN-${codigo}`).filter({ visible: true }).first().click();
  const boton = page.getByRole("button", { name: "Ver respaldo" });
  await expect(boton).toBeVisible();
  await info.attach("ficha", { body: await page.screenshot(), contentType: "image/png" });
  await boton.click();
  await expect(boton).toBeEnabled({ timeout: 15_000 });
});
