// CAR-54, auditoría del Núcleo §I-15: carrera de dos restablecimientos simultáneos del mismo
// segundo factor. Antes de este test, las comprobaciones (rol de plataforma, membresía, MFA
// activo) corrían fuera de la transacción de la escritura: dos llamadas concurrentes podían pasar
// ambas la comprobación inicial y terminar las dos en "ok" (dos correos, dos auditorías, por un
// solo restablecimiento real). El bloqueo (`FOR UPDATE`) de `core.users` y de la membresía dentro
// de la misma transacción fuerza a que la segunda vea el estado ya restablecido y falle limpio.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { Correo } from "../src/testing/tipos";

describe.skipIf(!urlPropietario)(
  "core.users.restablecer_mfa: sin carrera entre dos restablecimientos simultáneos (CAR-54)",
  () => {
    let e: Entorno;
    let mod: typeof ModuloCapacidades;
    let tenantId = "";
    let ownerId = "";
    let objetivoId = "";
    let membershipId = "";
    const correos: Correo[] = [];
    const sufijo = randomUUID().slice(0, 8);

    beforeAll(async () => {
      e = await prepararEntorno();
      mod = await import("../src");
      mod.limpiarRegistro();
      mod.registrarCapacidades(mod.capacidadesDelNucleo);
      tenantId = (
        await e.admin.tenant.create({
          data: { slug: `mfa-carrera-${sufijo}`, nombre: "Carrera MFA", vertical: "seguridad" },
        })
      ).id;
      ownerId = (
        await e.admin.user.create({
          data: { name: "Owner", email: `owner-${sufijo}@prueba.cl`, emailVerified: true },
        })
      ).id;
      objetivoId = (
        await e.admin.user.create({
          data: {
            name: "Beto",
            email: `beto-${sufijo}@prueba.cl`,
            emailVerified: true,
            twoFactorEnabled: true,
          },
        })
      ).id;
      await e.admin.membership.create({
        data: { tenantId, userId: ownerId, rol: "owner", portales: ["erp"] },
      });
      membershipId = (
        await e.admin.membership.create({
          data: { tenantId, userId: objetivoId, rol: "viewer", portales: ["erp"] },
        })
      ).id;
      await e.admin.twoFactor.create({
        data: { userId: objetivoId, secret: "cifrado", backupCodes: "cifrados" },
      });
      await e.admin.session.create({
        data: { userId: objetivoId, token: randomUUID(), expiresAt: new Date(Date.now() + 3_600_000) },
      });
    });

    // No se borra el tenant: la escritura quedó en `audit_events` (encadenada, append-only); borrar
    // la fila del tenant rompería esa cadena para quien la verifique después.
    afterAll(async () => {
      await e?.cerrar();
    });

    const ctxOwner = () =>
      mod.crearContexto({
        tenantId,
        actor: { tipo: "user", id: ownerId },
        portal: "erp",
        portalesMembresia: ["erp"],
        rol: "owner",
        usuario: { id: ownerId, nombre: "Owner", email: `owner-${sufijo}@prueba.cl`, platformRole: null },
        medidor: { registrar: async () => undefined },
        servicios: { correo: { nombre: "memoria", enviar: async (c) => void correos.push(c) } },
      });

    it("solo una de dos llamadas concurrentes restablece; la otra falla limpio, sin doble auditoría", async () => {
      const [a, b] = await Promise.all([
        mod.executeCapability(ctxOwner(), "core.users.restablecer_mfa", { membershipId }),
        mod.executeCapability(ctxOwner(), "core.users.restablecer_mfa", { membershipId }),
      ]);
      const resultados = [a, b];
      const exitosos = resultados.filter((r) => r.ok);
      const fallidos = resultados.filter((r) => !r.ok);
      expect(exitosos).toHaveLength(1);
      expect(fallidos).toHaveLength(1);
      expect(fallidos[0]).toMatchObject({
        ok: false,
        error: { code: "UNPROCESSABLE", message: "Ese usuario no tiene el segundo factor activo." },
      });
      expect(exitosos[0]).toMatchObject({ ok: true, data: { userId: objetivoId, sesionesCerradas: 1 } });

      // Un solo restablecimiento real: el enrolamiento y la sesión se borraron una sola vez.
      expect(await e.admin.twoFactor.count({ where: { userId: objetivoId } })).toBe(0);
      expect(await e.admin.session.count({ where: { userId: objetivoId } })).toBe(0);
      const u = await e.admin.user.findUniqueOrThrow({ where: { id: objetivoId } });
      expect(u.twoFactorEnabled).toBe(false);

      // Una sola auditoría de la escritura: la segunda llamada no llegó a auditarse (ROLLBACK).
      expect(
        await e.admin.auditEvent.count({
          where: { tenantId, capability: "core.users.restablecer_mfa" },
        }),
      ).toBe(1);
    });
  },
);
