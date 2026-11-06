import { execFileSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { urlSiembra } from "./fixtures-puestos-car8";
import { hidratado } from "./hidratacion";
import { E2E_PASSWORD as password, entrar } from "./sesion";

// CAR-207: trasladar al titular de un puesto a otro desde la ficha (iPad, una vez). Instalación y
// guardia: `seed:pauta-e2e` (Planta Titular E2E). Los dos puestos se siembran con SQL para no repetir
// el formulario de CAR-206.
const INST = "00000000-0000-7000-8000-0000000b0020";
const GUARDIA = "00000000-0000-7000-8000-0000000b0021";
const SUFIJO = Date.now().toString(36);
const ORIGEN = `Traslado origen ${SUFIJO}`;
const DESTINO = `Traslado destino ${SUFIJO}`;

function sql(q: string): string {
  const conTenant = `SELECT set_config('app.tenant_id', (SELECT id::text FROM core.tenants WHERE slug = 'gard'), false);\n${q}`;
  return execFileSync("psql", [urlSiembra, "-X", "-A", "-t", "-q", "-c", conTenant], { encoding: "utf8" }).trim().split("\n").filter(Boolean).at(-1) ?? "";
}
const insertarPuesto = (nombre: string) =>
  sql(`INSERT INTO core.puestos (id,tenant_id,instalacion_id,cargo_id,patron_id,nombre,dias_trabajo,dias_descanso,hora_inicio,hora_fin,jornada,dotacion,estado,cobertura,cobertura_motivo,colacion_min,colacion_fuera,created_at,updated_at)
    SELECT gen_random_uuid(), i.tenant_id, i.id, (SELECT id FROM core.cargos WHERE tenant_id=i.tenant_id LIMIT 1), (SELECT id FROM core.patrones_turno WHERE tenant_id=i.tenant_id AND nombre='4×4'), '${nombre}',4,4,'08:00','20:00','dia',1,'activo','ppc','sin_asignar',0,false,now(),now()
    FROM core.instalaciones i WHERE i.id='${INST}' RETURNING id;`);

test.describe("puestos · trasladar titular (CAR-207)", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("asigna en un puesto y lo traslada a otro: la ficha de destino lo muestra como titular", async ({ page }, info) => {
    test.skip(info.project.name !== "ipad", "La escritura se prueba una vez (iPad)");
    sql(`DELETE FROM pauta.series WHERE titular_persona_id = '${GUARDIA}'; UPDATE core.vinculos_laborales SET puesto_id = NULL WHERE persona_id = '${GUARDIA}';`);
    const origen = insertarPuesto(ORIGEN);
    const destino = insertarPuesto(DESTINO);
    await entrar(page);
    await page.goto(`/instalaciones/${INST}/puestos?titular=${origen}`);
    const asignar = page.getByRole("button", { name: "Asignar titular" });
    await hidratado(asignar);
    await page.locator("#t-guardia").click();
    await page.getByRole("option", { name: "Titular E2E" }).click();
    await expect(page.getByRole("list", { name: "Primeros 14 días de la serie nueva" })).toBeVisible();
    await asignar.click();
    await expect(page.getByText("Titular asignado")).toBeVisible();

    await page.goto(`/instalaciones/${INST}/puestos?puesto=${origen}`);
    const trasladar = page.getByRole("button", { name: "Trasladar", exact: true });
    await hidratado(trasladar);
    await trasladar.click();
    await page.locator("#tr-destino").click();
    await page.getByRole("option", { name: new RegExp(DESTINO) }).click();
    await page.locator("#tr-motivo").fill("Cambio de turno operativo");
    await expect(page.getByText(/Sigue en la misma instalación/)).toBeVisible();
    await expect(page.getByText(new RegExp(`Su serie en «${ORIGEN}» se cierra`))).toBeVisible();
    const confirmar = page.getByRole("button", { name: "Trasladar", exact: true });
    await hidratado(confirmar);
    await confirmar.click();
    await expect(page.getByText("Guardia trasladado")).toBeVisible();

    await page.goto(`/instalaciones/${INST}/puestos?puesto=${destino}`);
    await expect(page.getByText("Titular E2E").first()).toBeVisible();
    await expect(page.getByText("Sin titular · puesto por cubrir")).toHaveCount(0);
  });
});
