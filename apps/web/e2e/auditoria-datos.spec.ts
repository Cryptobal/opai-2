import { test } from "@playwright/test";

import { prepararDatos } from "./auditoria/datos";
import { pasarProteccionDeVercel } from "./preview";
import { E2E_PASSWORD, entrar } from "./sesion";

// Paso previo de la auditoría de diseño (CAR-372): crea en la vista previa una cuenta, una instalación
// y una persona con RUT de la empresa ficticia `qa-e2e`, para que la auditoría abra fichas y entre a
// Guardia y Terreno. Corre solo en el workflow `auditoria-diseno` (`--grep @datos-auditoria`), que se
// niega a correr sin la rama de Neon propia de la vista previa. Nunca Gard ni datos reales.

test("@datos-auditoria prepara datos ficticios de qa-e2e", async ({ page }, info) => {
  test.skip(!process.env["AUDITORIA_DISENO"], "Solo en el workflow auditoria-diseno");
  test.skip(info.project.name !== "desktop" || !E2E_PASSWORD, "Una sola corrida, con sesión");
  test.setTimeout(10 * 60_000);
  await pasarProteccionDeVercel(page);
  await entrar(page);
  const notas = await prepararDatos(page);
  for (const n of notas) console.log(`datos de auditoría: ${n}`);
  // La auditoría entra de inmediato con el mismo usuario: se espera al siguiente código TOTP.
  await page.waitForTimeout(32_000);
});
