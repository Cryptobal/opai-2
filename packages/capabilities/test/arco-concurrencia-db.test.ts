import { randomUUID } from "node:crypto";
import { z } from "zod";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PERMISOS_CORE } from "@opai/domain";
import { enTransaccion, type TenantTx } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Capacidades from "../src";
import { dondeSolicitud } from "../src/core/cumplimiento/solicitudes-alcance";

describe.skipIf(!urlPropietario)(
  "ARCO: no hay TOCTOU entre relaciones de alcance y revelación",
  () => {
    let e: Entorno;
    let mod: typeof Capacidades;
    let tenantId = "",
      cuentaB = "",
      instalacionId = "",
      contactoId = "",
      solicitudId = "";
    const responsable = randomUUID();
    beforeAll(async () => {
      e = await prepararEntorno();
      mod = await import("../src");
      mod.limpiarRegistro();
      mod.registrarCapacidades(mod.capacidadesDelNucleo);
      tenantId = (
        await e.admin.tenant.create({
          data: { slug: `arco-carrera-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
        })
      ).id;
      const cuentaA = (await e.admin.cuenta.create({ data: { tenantId, nombre: "A" } })).id;
      cuentaB = (await e.admin.cuenta.create({ data: { tenantId, nombre: "B" } })).id;
      instalacionId = (
        await e.admin.instalacion.create({ data: { tenantId, cuentaId: cuentaA, nombre: "A" } })
      ).id;
      contactoId = (
        await e.admin.contacto.create({
          data: { tenantId, cuentaId: cuentaA, nombres: "Ficticio", apellidos: "Prueba" },
        })
      ).id;
      solicitudId = (
        await e.admin.solicitudArco.create({
          data: { tenantId, titularTipo: "contacto", titularId: contactoId, tipo: "acceso" },
        })
      ).id;
    });
    afterAll(async () => {
      await e?.cerrar();
    });

    it("bloquea cambios/borrados entre selección de contactos y consulta ARCO, también con actor agente", async () => {
      let autorizar = () => {},
        liberar = () => {};
      const autorizada = new Promise<void>((resolve) => {
        autorizar = resolve;
      });
      const continuar = new Promise<void>((resolve) => {
        liberar = resolve;
      });
      const cap = mod.defineCapability({
        id: "core.prueba_arco_carrera",
        descripcion: "Prueba con barrera entre la autorización de titulares y la revelación ARCO.",
        interna: true, // Solo se registra en esta prueba para insertar una barrera determinista.
        permiso: PERMISOS_CORE.cumplimientoRead,
        input: z.object({}),
        output: z.object({ id: z.string() }),
        efecto: "lectura",
        dryRun: false,
        auditarLectura: (s) => [s.id],
        async handler(ctx) {
          const where = await dondeSolicitud(ctx);
          autorizar();
          await continuar;
          const s = await ctx.db.solicitudArco.findFirstOrThrow({
            where: { id: solicitudId, ...where },
          });
          return { id: s.id };
        },
      });
      mod.registrarCapacidades([cap]);
      const contexto = () =>
        mod.crearContexto({
          tenantId,
          rol: "supervisor",
          alcance: { instalaciones: [instalacionId] },
          actor: { tipo: "agent", id: "agente-prueba", viaUserId: responsable },
          principal: { tipo: "usuario", id: responsable },
          scopes: ["core"],
          permisosRol: [PERMISOS_CORE.cumplimientoRead],
          medidor: { registrar: async () => undefined },
        });
      const lectura = mod.executeCapability(contexto(), cap.id, {});
      try {
        await Promise.race([
          autorizada,
          lectura.then(() => {
            throw new Error("Lectura terminó antes de la barrera");
          }),
        ]);
        const cambios: ((tx: TenantTx) => Promise<number>)[] = [
          (tx) =>
            tx.$executeRaw`UPDATE core.contactos SET cuenta_id = ${cuentaB}::uuid WHERE id = ${contactoId}::uuid`,
          (tx) => tx.$executeRaw`DELETE FROM core.contactos WHERE id = ${contactoId}::uuid`,
          (tx) =>
            tx.$executeRaw`UPDATE core.instalaciones SET cuenta_id = ${cuentaB}::uuid WHERE id = ${instalacionId}::uuid`,
        ];
        for (const cambiar of cambios) {
          await expect(
            enTransaccion(tenantId, async (tx) => {
              await tx.$executeRaw`SET LOCAL lock_timeout = '100ms'`;
              await cambiar(tx);
            }),
          ).rejects.toMatchObject({
            code: "P2010",
            meta: { driverAdapterError: { cause: { code: "55P03" } } },
          });
        }
      } finally {
        liberar();
      }
      expect(await lectura).toMatchObject({ ok: true, data: { id: solicitudId } });
      const audit = await e.admin.auditEvent.findFirstOrThrow({
        where: { tenantId, capability: cap.id },
      });
      expect(audit).toMatchObject({
        actorType: "agent",
        actorId: "agente-prueba",
        viaUserId: responsable,
        payload: { ids: [solicitudId] },
      });
      // Terminado el acceso, la relación puede cambiar; la siguiente lectura ya no revela la fila.
      await e.admin.contacto.update({ where: { id: contactoId }, data: { cuentaId: cuentaB } });
      expect(
        await mod.executeCapability(contexto(), "core.cumplimiento.solicitud_obtener", {
          id: solicitudId,
        }),
      ).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND" },
      });
    });
  },
);
