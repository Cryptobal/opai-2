import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { enTransaccion } from "../src/transaccion";
import { enTransaccionCapturaSii } from "../src/transaccion-captura-sii";
import { remuneracionesPublicarSii } from "../src/remuneraciones-sii";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("remuneraciones SII rol cron (CAR-148)", () => {
  let e: Entorno;
  const tenantId = randomUUID();
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    dateStyle: "short",
  }).format(new Date());
  const anio = Number(hoy.slice(0, 4));

  beforeAll(async () => {
    e = await prepararEntorno();
    await e.admin.tenant.create({
      data: { id: tenantId, slug: `rol-${randomUUID().slice(0, 6)}`, nombre: "Rol SII", vertical: "seguridad" },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("opai_app no puede ejecutar remuneraciones_publicar_sii", async () => {
    await expect(
      enTransaccion(tenantId, (tx) =>
        remuneracionesPublicarSii(tx, {
          clave: "uf",
          valor: 4_125_826,
          vigenteDesde: hoy,
          fuente: `https://www.sii.cl/valores_y_fechas/uf/uf${anio}.htm`,
          consultadaEn: new Date(),
        }),
      ),
    ).rejects.toThrow(/permission denied|42501/i);
  });

  it("opai_cron_sii sí puede ejecutar remuneraciones_publicar_sii", async () => {
    const id = await enTransaccionCapturaSii(tenantId, (tx) =>
      remuneracionesPublicarSii(tx, {
        clave: "uf",
        valor: 4_125_826,
        vigenteDesde: hoy,
        fuente: `https://www.sii.cl/valores_y_fechas/uf/uf${anio}.htm`,
        consultadaEn: new Date(),
      }),
    );
    expect(id).toBeTruthy();
    await e.admin.valorPublicado.deleteMany({ where: { id } });
  });
});
