// CAR-741 · CHECK de nomina.registros_mi_dt acepta finiquito y nomina.midt.registrar persiste.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("nomina.registros_mi_dt · finiquito (CAR-741)", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tenantId = "";
  let vinculoId = "";
  const medidor = { registrar: async () => undefined };

  const ctxOwner = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      modulosActivos: ["nomina", "nomina.cumplimiento_dt"],
      medidor,
    });
  const run = (id: string, input: unknown) => mod.executeCapability(ctxOwner(), id, input);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesNomina]);
    const suf = randomUUID().slice(0, 8);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `midt-fin-${suf}`, nombre: "Mi DT finiquito", vertical: "seguridad" },
      })
    ).id;
    const cargoId = (await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia", activo: true } })).id;
    const personaId = (
      await e.admin.persona.create({
        data: { tenantId, nombres: "Ana", apellidos: "Prueba", rut: `9${suf.slice(0, 7)}-2`, estado: "activa" },
      })
    ).id;
    vinculoId = (
      await e.admin.vinculoLaboral.create({
        data: {
          tenantId,
          personaId,
          cargoId,
          tipo: "indefinido",
          inicio: new Date("2024-01-01"),
          termino: new Date("2026-09-15"),
          estado: "terminado",
          motivoTermino: "necesidades de la empresa",
        },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("registra un finiquito en Mi DT", async () => {
    const lista = await run("nomina.midt.listar", {});
    expect(lista.ok).toBe(true);
    if (!lista.ok) return;
    const items = (lista.data as { items: { movimientoTipo: string; referenciaId: string }[] }).items;
    const fin = items.find((m) => m.movimientoTipo === "finiquito" && m.referenciaId === vinculoId);
    expect(fin).toBeDefined();

    const docId = (
      await e.admin.documento.create({
        data: {
          tenantId,
          nombre: `comprobante-midt-${randomUUID().slice(0, 8)}.pdf`,
          mime: "application/pdf",
          tamano: 100,
          storageKey: `midt-${randomUUID()}`,
          estado: "disponible",
          creadoPorTipo: "system",
          creadoPorId: null,
        },
      })
    ).id;

    const reg = await run("nomina.midt.registrar", {
      movimientoTipo: "finiquito",
      referenciaId: vinculoId,
      registradoEn: "2026-09-20",
      documentoId: docId,
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    const fila = await e.admin.nominaRegistroMiDt.findFirstOrThrow({
      where: { tenantId, movimientoTipo: "finiquito", referenciaId: vinculoId },
    });
    expect(fila.documentoId).toBe(docId);
  });
});