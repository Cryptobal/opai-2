import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Capacidades from "../src";

describe.skipIf(!urlPropietario)("lecturas durante expansión de auditoría", () => {
  let e: Entorno;
  let mod: typeof Capacidades;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("actividad y audit list toleran la cadena NULL sin filtrar filas ajenas", async () => {
    const tenant = await e.admin.tenant.create({
      data: { slug: `aud-null-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
    });
    const otro = await e.admin.tenant.create({
      data: { slug: `aud-null-${randomUUID()}`, nombre: "Otro", vertical: "seguridad" },
    });
    const id = randomUUID();
    await e.admin.$executeRawUnsafe(`ALTER TABLE core.audit_events
      ALTER COLUMN seq DROP NOT NULL, ALTER COLUMN hash_anterior DROP NOT NULL,
      ALTER COLUMN hash DROP NOT NULL, ALTER COLUMN hash_canon DROP NOT NULL`);
    try {
      await e.admin.$executeRaw`INSERT INTO core.audit_events
        (id, tenant_id, actor_type, capability, payload) VALUES
        (${id}::uuid, ${tenant.id}::uuid, 'system', 'core.cuentas.create', '{"input":{}}'::jsonb)`;
      const ctx = (tenantId: string, rol: "owner" | "viewer", alcance = false) =>
        mod.crearContexto({
          tenantId,
          actor: { tipo: "system" },
          rol,
          ...(alcance ? { alcance: { instalaciones: [] } } : {}),
        });
      for (const [capacidad, campo] of [
        ["core.actividad.list", "items"],
        ["core.audit.list", "eventos"],
      ]) {
        // La fila histórica representa una escritura registrada. Filtrarla separa el evento
        // nullable de los eventos que agregan las propias lecturas auditadas.
        expect(
          await mod.executeCapability(ctx(tenant.id, "owner"), capacidad!, {
            capability: "core.cuentas.create",
          }),
        ).toMatchObject({
          ok: true,
          data: { [campo!]: [expect.objectContaining({ id })] },
        });
        expect(
          await mod.executeCapability(ctx(otro.id, "owner"), capacidad!, {
            capability: "core.cuentas.create",
          }),
        ).toMatchObject({
          ok: true,
          data: { [campo!]: [] },
        });
        expect(
          await mod.executeCapability(ctx(tenant.id, "owner", true), capacidad!, {}),
        ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
        expect(await mod.executeCapability(ctx(tenant.id, "viewer"), capacidad!, {})).toMatchObject(
          { ok: false, error: { code: "FORBIDDEN" } },
        );
      }
      expect(await ctx(tenant.id, "owner").auditoria.verificar()).toMatchObject({ pausada: true });
      const { trabajoVerificarAuditoria } = await import("../src/core/auditoria");
      expect(
        await trabajoVerificarAuditoria.ejecutar(ctx(tenant.id, "owner"), { dia: "2026-10-27" }),
      ).toMatchObject({ pausada: true });
      expect(
        await e.admin.evento.count({ where: { tenantId: tenant.id, tipo: "core.auditoria.rota" } }),
      ).toBe(0);
      expect(
        await e.admin.auditoriaCabeza.findUnique({ where: { tenantId: tenant.id } }),
      ).toBeNull();
    } finally {
      await e.admin.auditEvent.deleteMany({ where: { id } });
      await e.admin.$executeRawUnsafe(`ALTER TABLE core.audit_events
        ALTER COLUMN seq SET NOT NULL, ALTER COLUMN hash_anterior SET NOT NULL,
        ALTER COLUMN hash SET NOT NULL, ALTER COLUMN hash_canon SET NOT NULL`);
    }
  });
});
