// Brief 07 · PR 1 — Comercial: aislamiento por tenant, triggers (estado por tipo de etapa, mismo
// tenant, misma cuenta, un principal por negocio, historial append-only) y siembra idempotente.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "../src/catalogo-tenant";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("Comercial (Brief 07 · PR 1)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let cuentaA1 = "";
  let cuentaA2 = "";
  let instalA2 = "";
  let contactoA1a = "";
  let contactoA1b = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevoTenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    idA = (await nuevoTenant(`com-a-${sufijo}`)).id;
    idB = (await nuevoTenant(`com-b-${sufijo}`)).id;
    cuentaA1 = (await e.admin.cuenta.create({ data: { tenantId: idA, nombre: "Cuenta A1" } })).id;
    cuentaA2 = (await e.admin.cuenta.create({ data: { tenantId: idA, nombre: "Cuenta A2" } })).id;
    instalA2 = (
      await e.admin.instalacion.create({
        data: { tenantId: idA, cuentaId: cuentaA2, nombre: "Planta A2" },
      })
    ).id;
    contactoA1a = (
      await e.admin.contacto.create({
        data: { tenantId: idA, cuentaId: cuentaA1, nombres: "Ana", apellidos: "Pérez" },
      })
    ).id;
    contactoA1b = (
      await e.admin.contacto.create({
        data: { tenantId: idA, cuentaId: cuentaA1, nombres: "Beto", apellidos: "Soto" },
      })
    ).id;
    // Siembra idempotente: dos veces no duplica.
    await sembrarComercial(e.admin.$extends({}), idA);
    await sembrarComercial(e.admin.$extends({}), idA);
    await sembrarComercial(e.admin.$extends({}), idB);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("siembra un embudo por defecto con 8 etapas (6 abiertas, 1 ganada, 1 perdida), idempotente", async () => {
    const embudos = await e.admin.embudo.findMany({ where: { tenantId: idA, porDefecto: true } });
    expect(embudos.length).toBe(1);
    const etapas = await e.admin.etapa.findMany({ where: { tenantId: idA, embudoId: embudos[0]!.id } });
    expect(etapas.length).toBe(8);
    expect(etapas.filter((x) => x.tipo === "abierta").length).toBe(6);
    expect(etapas.filter((x) => x.tipo === "ganada").length).toBe(1);
    expect(etapas.filter((x) => x.tipo === "perdida").length).toBe(1);
    expect(etapas.find((x) => x.tipo === "ganada")?.nombre).toBe("Adjudicado");
    // Catálogos base.
    expect(await e.admin.tipoNegocio.count({ where: { tenantId: idA } })).toBeGreaterThanOrEqual(6);
    expect(await e.admin.origenNegocio.count({ where: { tenantId: idA } })).toBeGreaterThanOrEqual(5);
    expect(await e.admin.motivoPerdida.count({ where: { tenantId: idA } })).toBe(7);
  });

  it("el estado del negocio se deriva del tipo de la etapa (trigger)", async () => {
    const embudo = await e.admin.embudo.findFirstOrThrow({ where: { tenantId: idA, porDefecto: true } });
    const abierta = await e.admin.etapa.findFirstOrThrow({
      where: { tenantId: idA, embudoId: embudo.id, tipo: "abierta", orden: 0 },
    });
    const ganada = await e.admin.etapa.findFirstOrThrow({
      where: { tenantId: idA, embudoId: embudo.id, tipo: "ganada" },
    });
    const negocio = await e.admin.negocio.create({
      data: {
        tenantId: idA,
        cuentaId: cuentaA1,
        embudoId: embudo.id,
        etapaId: abierta.id,
        titulo: "Negocio A1",
        estado: "perdido", // el trigger lo corrige a 'abierto'
      },
    });
    expect(negocio.estado).toBe("abierto");
    const movido = await e.admin.negocio.update({
      where: { id: negocio.id },
      data: { etapaId: ganada.id },
    });
    expect(movido.estado).toBe("ganado");
  });

  it("un negocio no puede referir un embudo de otra empresa (trigger mismo_tenant)", async () => {
    const embudoA = await e.admin.embudo.findFirstOrThrow({ where: { tenantId: idA } });
    const embudoB = await e.admin.embudo.findFirstOrThrow({ where: { tenantId: idB } });
    const etapaA = await e.admin.etapa.findFirstOrThrow({ where: { tenantId: idA, embudoId: embudoA.id } });
    await expect(
      e.admin.negocio.create({
        data: {
          tenantId: idA,
          cuentaId: cuentaA1,
          embudoId: embudoB.id,
          etapaId: etapaA.id,
          titulo: "Cruzado",
        },
      }),
      // Prisma envuelve el errcode foreign_key_violation; el trigger lo origina (como en el núcleo).
    ).rejects.toThrow(/Foreign key|otra empresa/);
  });

  it("la instalación de un negocio es de la cuenta del negocio (trigger misma_cuenta)", async () => {
    const embudo = await e.admin.embudo.findFirstOrThrow({ where: { tenantId: idA } });
    const etapa = await e.admin.etapa.findFirstOrThrow({ where: { tenantId: idA, embudoId: embudo.id } });
    const negocio = await e.admin.negocio.create({
      data: { tenantId: idA, cuentaId: cuentaA1, embudoId: embudo.id, etapaId: etapa.id, titulo: "N" },
    });
    // instalA2 es de la cuenta A2, el negocio es de A1: se rechaza.
    await expect(
      e.admin.negocioInstalacion.create({
        data: { tenantId: idA, negocioId: negocio.id, instalacionId: instalA2, tipo: "nueva" },
      }),
    ).rejects.toThrow(/Foreign key|cuenta del negocio/);
  });

  it("un solo contacto principal por negocio (índice parcial)", async () => {
    const embudo = await e.admin.embudo.findFirstOrThrow({ where: { tenantId: idA } });
    const etapa = await e.admin.etapa.findFirstOrThrow({ where: { tenantId: idA, embudoId: embudo.id } });
    const negocio = await e.admin.negocio.create({
      data: { tenantId: idA, cuentaId: cuentaA1, embudoId: embudo.id, etapaId: etapa.id, titulo: "NP" },
    });
    await e.admin.negocioContacto.create({
      data: { tenantId: idA, negocioId: negocio.id, contactoId: contactoA1a, rol: "decisor", esPrincipal: true },
    });
    await expect(
      e.admin.negocioContacto.create({
        data: { tenantId: idA, negocioId: negocio.id, contactoId: contactoA1b, rol: "tecnico", esPrincipal: true },
      }),
    ).rejects.toThrow();
  });

  it("el historial de etapas es append-only", async () => {
    const embudo = await e.admin.embudo.findFirstOrThrow({ where: { tenantId: idA } });
    const etapa = await e.admin.etapa.findFirstOrThrow({ where: { tenantId: idA, embudoId: embudo.id } });
    const negocio = await e.admin.negocio.create({
      data: { tenantId: idA, cuentaId: cuentaA1, embudoId: embudo.id, etapaId: etapa.id, titulo: "NH" },
    });
    const h = await e.admin.historialEtapa.create({
      data: { tenantId: idA, negocioId: negocio.id, aEtapaId: etapa.id, actorTipo: "system" },
    });
    await expect(
      e.admin.historialEtapa.updateMany({ where: { id: h.id }, data: { motivo: "x" } }),
    ).rejects.toThrow(/append-only/);
    await expect(
      e.admin.historialEtapa.deleteMany({ where: { id: h.id } }),
    ).rejects.toThrow(/append-only/);
  });

  it("RLS: cada tenant ve solo su embudo y no escribe en otro", async () => {
    const a = e.forTenant(idA);
    const embudos = await a.embudo.findMany();
    expect(embudos.every((x) => x.tenantId === idA)).toBe(true);
    expect(embudos.length).toBe(1);
    expect(await e.forTenant(idB).negocio.count({ where: { tenantId: idA } })).toBe(0);
  });
});
