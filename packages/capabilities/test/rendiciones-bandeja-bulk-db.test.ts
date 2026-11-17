import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/rendiciones/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Rendiciones · bandeja bulk (CAR-613)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  const rinde = randomUUID();
  const aprueba = randomUUID();
  let instId = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `bulk-${randomUUID().slice(0, 8)}`, nombre: "Bulk", vertical: "seguridad" } })).id;
    const cuenta = await e.admin.cuenta.create({ data: { tenantId, nombre: "C", rut: "76111111-1" } });
    instId = (await e.admin.instalacion.create({ data: { tenantId, cuentaId: cuenta.id, nombre: "P", estado: "activa" } })).id;
    for (const [id, rol] of [[rinde, "supervisor"], [aprueba, "gerente"]] as const) {
      await e.admin.user.create({ data: { id, name: rol, email: `${id.slice(0, 8)}@bulk.test` } });
      await e.admin.membership.create({ data: { tenantId, userId: id, rol, portales: ["erp"] } });
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (uid: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "T", email: "t@test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: uid === aprueba ? "gerente" : "supervisor",
      modulosActivos: ["rendiciones"],
      medidor: { registrar: async () => undefined },
    });

  it("dryRun y aprobación múltiple", async () => {
    const item = { fecha: "2026-11-02", proveedor: "X", descripcion: "Gasto", monto: 1000, sinRespaldoMotivo: "Sin boleta" };
    const cuerpo = { descripcion: "Lote", centroCosto: "instalacion", instalacionId: instId, aprobadorId: aprueba, items: [item] };
    const ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      const c = await mod.executeCapability(ctx(rinde), "rendiciones.rendiciones.crear", cuerpo);
      if (!c.ok) throw new Error(c.error.message);
      const id = (c.data as { id: string }).id;
      await mod.executeCapability(ctx(rinde), "rendiciones.rendiciones.enviar", { id });
      ids.push(id);
    }
    const prev = await mod.executeCapability(ctx(aprueba), "rendiciones.bandeja.aprobar_varias", { ids }, { dryRun: true });
    expect(prev.ok).toBe(true);
    if (!prev.ok) throw new Error("dryRun");
    expect(prev.data.aplicadas).toHaveLength(2);
    const ok = await mod.executeCapability(ctx(aprueba), "rendiciones.bandeja.aprobar_varias", { ids });
    expect(ok.ok).toBe(true);
    const estados = await e.admin.rendicion.findMany({ where: { id: { in: ids } }, select: { estado: true } });
    expect(estados.every((x) => x.estado === "aprobada")).toBe(true);
  });
});