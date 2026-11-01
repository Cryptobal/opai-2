// CAR-119 · Brief 10 · PR 10.1 — CPQ: aislamiento por tenant (RLS), integridad entre empresas
// (trigger mismo_tenant), una vigente por negocio, una versión editable por cotización y
// correlativo atómico sin números repetidos bajo concurrencia. Datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "../src/catalogo-comercial";
import { enTransaccion } from "../src/transaccion";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("CPQ (Brief 10 · PR 10.1)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let usuario = "";
  let negocioA = "";
  let negocioA2 = "";
  let negocioB = "";

  async function nuevoNegocio(tenantId: string, titulo: string): Promise<string> {
    const cuenta = await e.admin.cuenta.create({ data: { tenantId, nombre: `Cuenta ${titulo}` } });
    const embudo = await e.admin.embudo.findFirstOrThrow({ where: { tenantId, porDefecto: true } });
    const etapa = await e.admin.etapa.findFirstOrThrow({
      where: { tenantId, embudoId: embudo.id, tipo: "abierta" },
      orderBy: { orden: "asc" },
    });
    return (
      await e.admin.negocio.create({
        data: { tenantId, cuentaId: cuenta.id, embudoId: embudo.id, etapaId: etapa.id, titulo },
      })
    ).id;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevoTenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    idA = (await nuevoTenant(`cpq-a-${sufijo}`)).id;
    idB = (await nuevoTenant(`cpq-b-${sufijo}`)).id;
    await sembrarComercial(e.admin.$extends({}), idA);
    await sembrarComercial(e.admin.$extends({}), idB);
    usuario = (
      await e.admin.user.create({
        data: { email: `cpq-${sufijo}@prueba.cl`, name: "Ana Prueba", emailVerified: true },
      })
    ).id;
    negocioA = await nuevoNegocio(idA, "A1");
    negocioA2 = await nuevoNegocio(idA, "A2");
    negocioB = await nuevoNegocio(idB, "B1");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const cotizacion = (tenantId: string, negocioId: string, codigo: string, vigente = false) =>
    e.admin.cpqCotizacion.create({
      data: {
        tenantId,
        negocioId,
        codigo,
        titulo: `Cotización ${codigo}`,
        vigente,
        creadoPorId: usuario,
      },
    });

  it("RLS: cada tenant ve solo sus cotizaciones y no escribe en otro", async () => {
    const a = await cotizacion(idA, negocioA, `CPQ-2026-${sufijo}-1`);
    await e.admin.cpqVersion.create({
      data: { tenantId: idA, cotizacionId: a.id, numero: 1, creadoPorId: usuario },
    });
    const desdeB = e.forTenant(idB);
    expect(await desdeB.cpqCotizacion.count()).toBe(0);
    expect(await desdeB.cpqVersion.count()).toBe(0);
    expect(await e.forTenant(idA).cpqCotizacion.count()).toBe(1);
    // Insertar para otro tenant desde la sesión de B lo rechaza WITH CHECK.
    await expect(
      desdeB.cpqCotizacion.create({
        data: {
          tenantId: idA,
          negocioId: negocioA,
          codigo: `X-${sufijo}`,
          titulo: "Cruzada",
          creadoPorId: usuario,
        },
      }),
    ).rejects.toThrow();
    // Y no puede actualizar ni borrar lo de A: RLS filtra las filas.
    expect((await desdeB.cpqCotizacion.updateMany({ data: { titulo: "Robada" } })).count).toBe(0);
    expect((await desdeB.cpqCotizacion.deleteMany({})).count).toBe(0);
  });

  it("una cotización no puede colgar de un negocio de otra empresa (mismo_tenant)", async () => {
    await expect(cotizacion(idA, negocioB, `CPQ-2026-${sufijo}-2`)).rejects.toThrow(
      /Foreign key|otra empresa/,
    );
  });

  it("una sola cotización vigente por negocio; las alternativas no lo son", async () => {
    await cotizacion(idA, negocioA2, `CPQ-2026-${sufijo}-3`, true);
    await expect(cotizacion(idA, negocioA2, `CPQ-2026-${sufijo}-4`, true)).rejects.toThrow();
    await cotizacion(idA, negocioA2, `CPQ-2026-${sufijo}-5`, false);
  });

  it("una sola versión editable por cotización; al enviar la anterior nace la siguiente", async () => {
    const c = await cotizacion(idA, negocioA2, `CPQ-2026-${sufijo}-6`);
    const v1 = await e.admin.cpqVersion.create({
      data: { tenantId: idA, cotizacionId: c.id, numero: 1, creadoPorId: usuario },
    });
    await expect(
      e.admin.cpqVersion.create({
        data: { tenantId: idA, cotizacionId: c.id, numero: 2, creadoPorId: usuario },
      }),
    ).rejects.toThrow();
    await e.admin.cpqVersion.update({ where: { id: v1.id }, data: { estado: "enviada" } });
    await e.admin.cpqVersion.create({
      data: { tenantId: idA, cotizacionId: c.id, numero: 2, creadoPorId: usuario },
    });
    await expect(
      e.admin.cpqVersion.update({ where: { id: v1.id }, data: { estado: "inventado" } }),
    ).rejects.toThrow();
  });

  it("la sección Común (sin instalación) y las líneas heredan el tenant de su versión", async () => {
    const c = await cotizacion(idA, negocioA2, `CPQ-2026-${sufijo}-7`);
    const v = await e.admin.cpqVersion.create({
      data: { tenantId: idA, cotizacionId: c.id, numero: 1, creadoPorId: usuario },
    });
    const s = await e.admin.cpqSeccion.create({
      data: { tenantId: idA, versionId: v.id, nombre: "Común" },
    });
    await e.admin.cpqLinea.create({
      data: { tenantId: idA, seccionId: s.id, tipo: "puesto", nombre: "Guardia 24/7" },
    });
    await expect(
      e.admin.cpqLinea.create({
        data: { tenantId: idB, seccionId: s.id, tipo: "item", nombre: "Cruzada" },
      }),
    ).rejects.toThrow(/Foreign key|otra empresa/);
  });

  it("el correlativo no repite números con 20 altas simultáneas y aísla tenants", async () => {
    const alta = (tenantId: string) =>
      enTransaccion(tenantId, (tx) =>
        tx.cpqCorrelativo.upsert({
          where: { tenantId_anio: { tenantId, anio: 2099 } },
          create: { tenantId, anio: 2099, ultimo: 1 },
          update: { ultimo: { increment: 1 } },
        }),
      );
    const r = await Promise.all(Array.from({ length: 20 }, () => alta(idA)));
    const numeros = r.map((x) => x.ultimo).sort((x, y) => x - y);
    expect(numeros).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect((await alta(idB)).ultimo).toBe(1);
  });
});
