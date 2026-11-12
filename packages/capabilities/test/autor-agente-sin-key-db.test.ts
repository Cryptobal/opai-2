// Agentes sin key (agente interno y apps OAuth como Claude, CAR-247): su id de actor no es un uuid
// (`agente-interno:<persona>`, `oauth:<cliente>`). Las columnas de autor de tipo uuid guardan la
// persona por la que actúan; antes la escritura fallaba entera. La auditoría conserva el actor real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "../../db/src/catalogo-comercial";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("autor de escrituras de agentes sin key en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let cuentaId = "";
  const usuario = randomUUID();
  const medidor = { registrar: async () => undefined };
  const ctx = (actorId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "agent", id: actorId, viaUserId: usuario, interno: true },
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["comercial"],
      medidor,
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial]);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `autor-${randomUUID().slice(0, 8)}`, nombre: "Autor", vertical: "seguridad" },
      })
    ).id;
    await sembrarComercial(e.admin.$extends({}), tenantId);
    cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Ficticia" } })).id;
  });
  afterAll(async () => e?.cerrar());

  it.each(["oauth:cliente-de-prueba", `agente-interno:${usuario}`])(
    "%s crea un negocio y su historial guarda a la persona",
    async (actorId) => {
      const r = await mod.executeCapability(ctx(actorId), "comercial.negocios.create", {
        cuentaId,
        titulo: `Negocio ${actorId}`,
      });
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      const negocioId = (r as { data: { id: string } }).data.id;
      const h = await e.admin.historialEtapa.findFirstOrThrow({ where: { negocioId } });
      expect(h).toMatchObject({ actorTipo: "agent", actorId: usuario });
      const contexto = await mod.executeCapability(ctx(actorId), "comercial.contexto.agregar", {
        negocioId,
        tipo: "reunion",
        resumen: "Piden cobertura nocturna",
        fuente: "Reunión con gerencia",
        fechaFuente: "2026-11-10",
      });
      expect(contexto).toMatchObject({ ok: true });
      const auditoria = await e.admin.auditEvent.findFirstOrThrow({
        where: { tenantId, capability: "comercial.negocios.create" },
        orderBy: { seq: "desc" },
      });
      expect(auditoria.actorId).toBe(actorId);
    },
  );
});
