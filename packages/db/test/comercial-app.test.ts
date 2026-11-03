// Brief 07 · PR 1 — triggers de Comercial ejecutados por la aplicación (opai_app, sin BYPASSRLS).
// Tras force_rls el dueño NOBYPASSRLS no ve filas, así que los triggers que leen otras tablas
// deben ser SECURITY INVOKER: leen con la RLS de quien escribe. En CI el dueño es superusuario y
// no lo detectaría; por eso se prueba con forTenant y se verifica `prosecdef` en el catálogo.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "../src/catalogo-comercial";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("Comercial · triggers con opai_app", () => {
  let e: Entorno;
  let idA = "";
  let cuentaA1 = "";
  let instalA1 = "";
  let instalA2 = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const slug = `com-app-${randomUUID().slice(0, 8)}`;
    idA = (await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } })).id;
    cuentaA1 = (await e.admin.cuenta.create({ data: { tenantId: idA, nombre: "A1" } })).id;
    const cuentaA2 = (await e.admin.cuenta.create({ data: { tenantId: idA, nombre: "A2" } })).id;
    const instal = (cuentaId: string, nombre: string) =>
      e.admin.instalacion.create({ data: { tenantId: idA, cuentaId, nombre } });
    instalA1 = (await instal(cuentaA1, "Planta A1")).id;
    instalA2 = (await instal(cuentaA2, "Planta A2")).id;
    await sembrarComercial(e.admin.$extends({}), idA);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  async function nuevoNegocio(titulo: string) {
    const a = e.forTenant(idA);
    const embudo = await a.embudo.findFirstOrThrow({ where: { porDefecto: true } });
    const abierta = await a.etapa.findFirstOrThrow({
      where: { embudoId: embudo.id, tipo: "abierta" },
      orderBy: { orden: "asc" },
    });
    const negocio = await a.negocio.create({
      data: { tenantId: idA, cuentaId: cuentaA1, embudoId: embudo.id, etapaId: abierta.id, titulo },
    });
    return { a, embudo, negocio };
  }

  it("las funciones de trigger de comercial son SECURITY INVOKER", async () => {
    const filas = await e.admin.$queryRaw<{ nombre: string; definer: boolean }[]>`
      SELECT p.proname AS nombre, p.prosecdef AS definer
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'comercial'`;
    expect(filas.length).toBeGreaterThanOrEqual(2);
    // Única excepción deliberada: resuelve el token público del seguimiento sin sesión (migración CAR-67).
    expect(filas.filter((f) => f.definer && f.nombre !== "seguimiento_resolver_token").map((f) => f.nombre)).toEqual([]);
  });

  it("el estado se deriva de la etapa también al escribir como la aplicación", async () => {
    const { a, embudo, negocio } = await nuevoNegocio("Derivado");
    expect(negocio.estado).toBe("abierto");
    const ganada = await a.etapa.findFirstOrThrow({
      where: { embudoId: embudo.id, tipo: "ganada" },
    });
    const perdida = await a.etapa.findFirstOrThrow({
      where: { embudoId: embudo.id, tipo: "perdida" },
    });
    expect(
      (await a.negocio.update({ where: { id: negocio.id }, data: { etapaId: ganada.id } })).estado,
    ).toBe("ganado");
    expect(
      (await a.negocio.update({ where: { id: negocio.id }, data: { etapaId: perdida.id } })).estado,
    ).toBe("perdido");
  });

  it("misma cuenta: acepta la instalación de la cuenta y rechaza la de otra cuenta", async () => {
    const { a, negocio } = await nuevoNegocio("Vínculos");
    await a.negocioInstalacion.create({
      data: { tenantId: idA, negocioId: negocio.id, instalacionId: instalA1, tipo: "nueva" },
    });
    await expect(
      a.negocioInstalacion.create({
        data: { tenantId: idA, negocioId: negocio.id, instalacionId: instalA2, tipo: "nueva" },
      }),
    ).rejects.toThrow(/Foreign key|cuenta del negocio/);
  });
});
