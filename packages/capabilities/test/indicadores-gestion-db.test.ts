import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { dato } from "./maestros-ayuda";

// Indicadores de gestión (CAR-305, ADR-094) contra Postgres real, con RLS sin BYPASSRLS: el indicador
// del núcleo «Tareas cumplidas a tiempo» mide solo las tareas de la empresa actual. Datos ficticios.
describe.skipIf(!urlPropietario)("core.indicadores_gestion contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let ana = "";
  let bea = "";
  const sufijo = randomUUID().slice(0, 8);
  const MEDIR = "core.indicadores_gestion.medir";
  type Salida = {
    desde: string;
    mediciones: { sujetoId: string; valor: number | null; logro: number | null }[];
  };

  const ctx = (tenantId: string, userId: string) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "Prueba", email: `u-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: [],
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const empresa = (slug: string) =>
      e.admin.tenant
        .create({ data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" } })
        .then((t) => t.id);
    a = await empresa(`ind-a-${sufijo}`);
    b = await empresa(`ind-b-${sufijo}`);
    const usuario = (nombre: string) =>
      e.admin.user
        .create({ data: { name: nombre, email: `${nombre}-${sufijo}@prueba.cl`, emailVerified: true } })
        .then((u) => u.id);
    ana = await usuario("ana");
    bea = await usuario("bea");
    for (const [tenantId, userId] of [
      [a, ana],
      [a, bea],
      [b, ana],
    ] as const) {
      await e.admin.membership.create({ data: { tenantId, userId, rol: "owner", portales: ["erp"] } });
    }
    const tarea = async (
      tenantId: string,
      usuarioId: string,
      estado: string,
      vence: string,
      hecha: string | null,
    ) => {
      const t = await e.admin.actividad.create({
        data: {
          tenantId,
          tipo: "tarea",
          titulo: "Tarea de prueba",
          estado,
          prioridad: "media",
          vencimiento: new Date(vence),
          completadaEn: hecha ? new Date(hecha) : null,
        },
      });
      await e.admin.actividadResponsable.create({
        data: { tenantId, actividadId: t.id, usuarioId },
      });
    };
    // Empresa A, noviembre: Ana 1 de 2 a tiempo; Bea 1 de 1.
    await tarea(a, ana, "hecha", "2026-11-10T15:00:00Z", "2026-11-10T14:00:00Z");
    await tarea(a, ana, "hecha", "2026-11-12T15:00:00Z", "2026-11-13T09:00:00Z");
    await tarea(a, ana, "cancelada", "2026-11-14T15:00:00Z", null);
    await tarea(a, bea, "hecha", "2026-11-20T15:00:00Z", "2026-11-19T10:00:00Z");
    // Empresa B, mismo mes y misma usuaria: 0 de 1. No debe mezclarse con la empresa A.
    await tarea(b, ana, "pendiente", "2026-11-03T15:00:00Z", null);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("mide por responsable solo las tareas de la empresa actual", async () => {
    const enA = await dato<Salida>(ctx(a, ana), MEDIR, {
      indicador: "core.tareas_a_tiempo",
      periodo: "2026-11",
    });
    expect(enA.desde).toBe("2026-11-01T03:00:00.000Z");
    const porSujeto = new Map(enA.mediciones.map((m) => [m.sujetoId, m.valor]));
    expect(porSujeto.get(ana)).toBe(50);
    expect(porSujeto.get(bea)).toBe(100);
    expect(enA.mediciones).toHaveLength(2);

    const enB = await dato<Salida>(ctx(b, ana), MEDIR, {
      indicador: "core.tareas_a_tiempo",
      periodo: "2026-11",
    });
    expect(enB.mediciones).toEqual([{ sujetoId: ana, valor: 0, logro: 0 }]);
  });

  it("pedir desde otra empresa a un usuario que no tiene tareas ahí no revela nada", async () => {
    const r = await dato<Salida>(ctx(b, ana), MEDIR, {
      indicador: "core.tareas_a_tiempo",
      periodo: "2026-11",
      sujetos: [bea],
    });
    expect(r.mediciones).toEqual([]);
  });

  it("deja la lectura en la auditoría de la empresa con los ids medidos, sin valores", async () => {
    await dato(ctx(a, ana), MEDIR, { indicador: "core.tareas_a_tiempo", periodo: "2026-11" });
    const evento = await e.admin.auditEvent.findFirst({
      where: { tenantId: a, capability: MEDIR },
      orderBy: { seq: "desc" },
    });
    const payload = JSON.stringify(evento?.payload);
    expect(payload).toContain(ana);
    expect(payload).toContain(bea);
    expect(payload).not.toContain('"valor"');
    const enB = await e.admin.auditEvent.count({ where: { tenantId: b, capability: MEDIR } });
    // Las dos consultas anteriores desde la empresa B quedaron en su propia cadena, no en la de A.
    expect(enB).toBe(2);
  });
});
