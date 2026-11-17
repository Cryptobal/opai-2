import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { consumidorRendicionesAvisos } from "../../../modules/rendiciones/consumidor-avisos";
import { manifest } from "../../../modules/rendiciones/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(omitirSuiteDb())("Rendiciones · avisos (CAR-598)", () => {
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
    mod.limpiarConsumidores();
    mod.registrarConsumidores([consumidorRendicionesAvisos]);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `rend-av-${randomUUID().slice(0, 8)}`, nombre: "Rend", vertical: "seguridad" },
      })
    ).id;
    const cuenta = await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente", rut: "76999000-1" } });
    instId = (await e.admin.instalacion.create({ data: { tenantId, cuentaId: cuenta.id, nombre: "Planta", estado: "activa" } })).id;
    for (const [id, rol] of [
      [rinde, "supervisor"],
      [aprueba, "gerente"],
    ] as const) {
      await e.admin.user.create({ data: { id, name: rol, email: `${id.slice(0, 8)}@rend-avisos.test` } });
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
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@rend.test`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: uid === aprueba ? "gerente" : "supervisor",
      modulosActivos: ["rendiciones"],
      medidor: { registrar: async () => undefined },
      servicios: { correo: { nombre: "memoria", enviar: async () => undefined } },
    });

  it("al enviar, avisa al aprobador una sola vez (campana y correo)", async () => {
    const c = await mod.executeCapability(
      ctx(rinde),
      "rendiciones.rendiciones.crear",
      {
        descripcion: "Peajes",
        centroCosto: "instalacion",
        instalacionId: instId,
        aprobadorId: aprueba,
        items: [{ fecha: "2026-11-02", proveedor: "Ruta", descripcion: "Peaje", monto: 5000, sinRespaldoMotivo: "Sin boleta" }],
      },
    );
    if (!c.ok) throw new Error(c.error.message);
    const rendicionId = (c.data as { id: string }).id;
    const envio = await mod.executeCapability(ctx(rinde), "rendiciones.rendiciones.enviar", { id: rendicionId });
    if (!envio.ok) throw new Error(envio.error.message);
    await mod.despacharPendientes(ctx(rinde));
    const evento = await e.admin.evento.findFirst({
      where: { tenantId, tipo: "rendiciones.rendicion.enviada", entidadId: rendicionId },
    });
    expect(evento).toBeTruthy();
    const notifs = await e.admin.notificacion.findMany({ where: { tenantId, eventoId: evento!.id, usuarioId: aprueba } });
    expect(notifs).toHaveLength(1);
  const envios = await e.admin.envio.findMany({ where: { tenantId, eventoId: evento!.id, canal: "correo" } });
    expect(envios.some((x) => x.estado === "enviado")).toBe(true);
    await mod.despacharPendientes(ctx(rinde));
    expect(await e.admin.notificacion.count({ where: { eventoId: evento!.id, usuarioId: aprueba } })).toBe(1);
  });
});