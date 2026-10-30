// CAR-36 contra Postgres real: una aprobación de plataforma pedida con una key de la empresa X que
// actúa sobre la empresa Y no deja nada en X (cola, eventos ni auditoría), y un admin de X sin
// `platformRole` no la ve ni la resuelve. Quien tiene `platformRole` sí, y su ejecución queda en la
// auditoría de plataforma (cadena válida) y en la de Y, nunca en la de X. Además: dos bajas de owner
// de plataforma cruzadas y concurrentes nunca dejan a OPAI sin owners (`SELECT … FOR UPDATE`).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)(
  "aprobaciones y auditoría de plataforma fuera de las empresas",
  () => {
    let e: Entorno;
    let mod: typeof ModuloCapacidades;
    const s = randomUUID().slice(0, 8);
    let x = "";
    let y = "";
    let plat = "";
    let admin = "";
    let keyId = "";

    beforeAll(async () => {
      e = await prepararEntorno();
      mod = await import("../src");
      mod.limpiarRegistro();
      mod.registrarCapacidades(mod.capacidadesDelNucleo);
      const tenant = (slug: string) =>
        e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
      x = (await tenant(`car36-x-${s}`)).id;
      y = (await tenant(`car36-y-${s}`)).id;
      const usuario = (nombre: string, platformRole: string | null) =>
        e.admin.user.create({
          data: {
            name: nombre,
            email: `${nombre}-${s}@prueba.cl`,
            emailVerified: true,
            platformRole,
          },
        });
      plat = (await usuario("plat", "owner")).id;
      admin = (await usuario("admin", null)).id;
      for (const [userId, rol] of [
        [plat, "owner"],
        [admin, "admin"],
      ] as const)
        await e.admin.membership.create({ data: { tenantId: x, userId, rol, portales: ["erp"] } });
      keyId = (
        await e.admin.apiKey.create({
          data: {
            tenantId: x,
            userId: plat,
            nombre: "Key plataforma",
            prefijo: `opai_car36_${s}`,
            hash: s,
            scopes: ["*", "platform"],
          },
        })
      ).id;
    });

    afterAll(async () => {
      await e?.cerrar();
    });

    const medidor = { registrar: async () => undefined };
    const persona = (
      id: string,
      nombre: string,
      platformRole: "owner" | null,
      rol: "owner" | "admin",
    ) =>
      mod.crearContexto({
        tenantId: x,
        actor: { tipo: "user", id },
        rol,
        portal: "erp",
        portalesMembresia: ["erp"],
        usuario: { id, nombre, email: `${nombre}@prueba.cl`, platformRole },
        medidor,
      });
    const agente = () =>
      mod.crearContexto({
        tenantId: x,
        actor: { tipo: "agent", id: keyId, viaUserId: plat },
        rol: "owner",
        scopes: ["*", "platform"],
        claveApi: { permisos: null, servicio: false, plataforma: true },
        usuario: { id: plat, nombre: "plat", email: "plat@prueba.cl", platformRole: "owner" },
        agente: {
          apiKeyId: keyId,
          nombre: "Key plataforma",
          presupuestoMensualMicro: null,
          autonomia: {},
        },
        medidor,
      });

    it("un admin de otra empresa no ve nada de plataforma; platformRole la aprueba y audita fuera de X", async () => {
      const correo = `invitado-${s}@empresa-y.cl`;
      const pedido = await mod.executeCapability(agente(), "platform.admins.invite", {
        tenantId: y,
        email: correo,
        rol: "admin",
      });
      expect(pedido).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
      const id = pedido.ok ? "" : String(pedido.error.aprobacionId);

      // Nada en la empresa de la key: ni cola, ni evento que avise a sus admins, ni auditoría.
      expect(await e.admin.aprobacion.count({ where: { tenantId: x } })).toBe(0);
      expect(await e.admin.evento.count({ where: { tenantId: x } })).toBe(0);
      expect(await e.admin.auditEvent.count({ where: { tenantId: x } })).toBe(0);
      expect(await e.admin.aprobacionPlataforma.findUniqueOrThrow({ where: { id } })).toMatchObject(
        {
          origenTenantId: x,
          capability: "platform.admins.invite",
          estado: "pendiente",
        },
      );

      // El admin de X (sin platformRole) no la ve, no la lee, no la resuelve.
      const a = persona(admin, "admin", null, "admin");
      const lista = await mod.executeCapability(a, "core.aprobaciones.list", {});
      expect(lista).toMatchObject({ ok: true, data: [] });
      for (const [cap, input] of [
        ["core.aprobaciones.get", { id }],
        ["core.aprobaciones.aprobar", { id }],
        ["core.aprobaciones.rechazar", { id, motivo: "no corresponde" }],
      ] as const)
        expect(await mod.executeCapability(a, cap, input), cap).toMatchObject({
          ok: false,
          error: { code: "NOT_FOUND" },
        });
      for (const [cap, input] of [
        ["platform.auditoria.list", {}],
        ["platform.aprobaciones.aprobar", { id }],
        ["platform.aprobaciones.rechazar", { id, motivo: "no corresponde" }],
      ] as const)
        expect(await mod.executeCapability(a, cap, input), cap).toMatchObject({
          ok: false,
          error: { code: "FORBIDDEN" },
        });
      const actividad = await mod.executeCapability(a, "core.audit.list", {});
      expect(JSON.stringify(actividad)).not.toContain("platform.");
      expect(JSON.stringify(actividad)).not.toContain(correo);

      // Quien tiene platformRole la ve y la aprueba: se ejecuta como él.
      const p = persona(plat, "plat", "owner", "owner");
      const suya = await mod.executeCapability(p, "core.aprobaciones.list", {
        estado: "pendiente",
      });
      // La cola de plataforma es global (la base de test la comparten otras corridas): contiene esta.
      expect(suya).toMatchObject({ ok: true });
      expect(suya.ok ? suya.data : []).toEqual(
        expect.arrayContaining([expect.objectContaining({ id, ambito: "plataforma" })]),
      );
      expect(await mod.executeCapability(p, "platform.aprobaciones.aprobar", { id })).toMatchObject(
        {
          ok: true,
          data: { estado: "aprobada", resultado: { ok: true } },
        },
      );
      expect(await e.admin.invitation.count({ where: { tenantId: y, email: correo } })).toBe(1);
      // Auditoría: la de Y (su cambio) y la global; en X solo lecturas de su bandeja, sin ids ajenos.
      expect(
        await e.admin.auditEvent.count({
          where: { tenantId: y, capability: "platform.admins.invite" },
        }),
      ).toBe(1);
      // Y sigue viendo en su actividad la invitación de plataforma: el filtro de lo ajeno en SQL
      // real no la esconde por `entity_type` nulo (lógica de tres valores).
      const { sinPlataformaAjena } = await import("../src/agentes/plataforma");
      const visiblesY = await e
        .forTenant(y)
        .auditEvent.findMany({ where: { tenantId: y, ...sinPlataformaAjena() } });
      expect(visiblesY.map((f) => f.capability)).toContain("platform.admins.invite");
      const enX = await e.admin.auditEvent.findMany({ where: { tenantId: x } });
      expect(enX.filter((f) => f.capability.startsWith("platform."))).toEqual([]);
      expect(JSON.stringify(enX)).not.toContain(correo);
      expect(JSON.stringify(enX)).not.toContain(id);
      const dePlataforma = await e.admin.auditoriaGlobal.findMany({
        where: {
          ambito: "plataforma",
          OR: [{ entityId: id }, { payload: { path: ["aprobacionId"], equals: id } }],
        },
        orderBy: { seq: "asc" },
      });
      expect(dePlataforma.map((f) => [f.capability, f.tenantObjetivoId, f.origenTenantId])).toEqual(
        [
          ["platform.admins.invite", y, x], // pedido
          ["platform.admins.invite", y, x], // ejecución (como quien aprueba)
          ["platform.aprobaciones.aprobar", null, x], // decisión
        ],
      );
      // La cadena de plataforma es válida de punta a punta (mismo esquema de hash que audit_events).
      const [rota] = await e.admin.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n FROM (
          SELECT seq, hash, hash_anterior, hash_canon,
            lag(hash, 1, repeat('0', 64)) OVER (PARTITION BY ambito ORDER BY seq) AS previo,
            seq - lag(seq, 1, 0) OVER (PARTITION BY ambito ORDER BY seq) AS salto
          FROM core.auditoria_global) c
        WHERE hash_anterior <> previo OR salto <> 1
          OR hash <> encode(sha256(convert_to(hash_anterior || E'\n' || hash_canon, 'UTF8')), 'hex')`;
      expect(Number(rota?.n)).toBe(0);
      // Y opai_app no puede reescribir la auditoría de plataforma (append-only).
      await expect(
        e.forTenant(x).auditoriaGlobal.deleteMany({ where: { entityId: id } }),
      ).rejects.toThrow();
    });

    it("dos bajas de owner de plataforma cruzadas y concurrentes dejan al menos un owner", async () => {
      // Solo dos owners (los de este test): se aíslan del resto bajando a support a los demás.
      const otros = await e.admin.user.findMany({ where: { platformRole: "owner" } });
      await e.admin.user.updateMany({
        where: { platformRole: "owner" },
        data: { platformRole: "support" },
      });
      try {
        const nuevo = (nombre: string) =>
          e.admin.user.create({
            data: {
              name: nombre,
              email: `${nombre}-${s}@prueba.cl`,
              emailVerified: true,
              platformRole: "owner",
            },
          });
        const uno = await nuevo("uno");
        const dos = await nuevo("dos");
        const ctx = (u: typeof uno) => persona(u.id, u.name, "owner", "owner");
        const quitar = (quien: typeof uno, a: typeof uno) =>
          mod.executeCapability(ctx(quien), "platform.users.set_role", {
            email: a.email,
            platformRole: null,
          });
        // Uno quita a dos y dos quita a uno, a la vez.
        const r = await Promise.all([quitar(uno, dos), quitar(dos, uno)]);
        expect(r.filter((x) => x.ok)).toHaveLength(1);
        // La segunda falla porque quien la pidió ya no es owner (relectura tras el lock).
        expect(r.find((x) => !x.ok)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
        expect(await e.admin.user.count({ where: { platformRole: "owner" } })).toBe(1);
        expect(
          await e.admin.auditoriaGlobal.count({
            where: {
              ambito: "plataforma",
              capability: "platform.users.set_role",
              actorId: { in: [uno.id, dos.id] },
            },
          }),
        ).toBe(1);
        // El lock es FOR UPDATE: no reescribe `updated_at` de los owners.
        const sigue = await e.admin.user.findFirstOrThrow({ where: { platformRole: "owner" } });
        const original = sigue.id === uno.id ? uno : dos;
        expect(sigue.updatedAt.getTime()).toBe(original.updatedAt.getTime());
      } finally {
        await e.admin.user.updateMany({
          where: { id: { in: otros.map((o) => o.id) } },
          data: { platformRole: "owner" },
        });
      }
    });
  },
);
