// Documentos contra Postgres real: subida en dos pasos, bitácora encadenada, trigger de mismo tenant
// y vínculos; el almacenamiento es el de memoria (R2 se prueba con credenciales en la sesión D).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";

describe.skipIf(!urlPropietario)("documentos en base real", () => {
  let e: Entorno;
  let tenantId = "";
  let mod: typeof ModuloCapacidades;
  const almacen = almacenamientoEnMemoria();

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `doc-${randomUUID().slice(0, 8)}`, nombre: "D", vertical: "seguridad" },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
      servicios: { almacenamiento: almacen.almacenamiento },
    });

  async function dato<T>(id: string, input: unknown): Promise<T> {
    const r = await mod.executeCapability(ctx(), id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  it("sube, confirma con huella y queda encadenado en la bitácora verificable", async () => {
    const cuenta = await dato<{ id: string }>("core.cuentas.create", { nombre: "Andina" });
    const sha256 = "c".repeat(64);
    const ini = await dato<{ documento: { id: string } }>("core.documentos.iniciar_subida", {
      entidad: { tipo: "cuenta", id: cuenta.id },
      nombre: "contrato.pdf",
      mime: "application/pdf",
      tamano: 1234,
      sha256,
    });
    const fila = await e.admin.documento.findUniqueOrThrow({ where: { id: ini.documento.id } });
    expect(fila.storageKey).toBe(`t/${tenantId}/d/${fila.id}/v1/contrato.pdf`);
    almacen.subir(fila.storageKey, 1234, "application/pdf", sha256);
    const ok = await dato<{ bitacoraSeq: number }>("core.documentos.confirmar_subida", {
      id: fila.id,
    });
    expect(ok.bitacoraSeq).toBeGreaterThan(0);
    expect(await dato("core.bitacora.verificar", {})).toMatchObject({ ok: true });
    const lista = await dato<{ items: unknown[] }>("core.documentos.list", {
      entidad: { tipo: "cuenta", id: cuenta.id },
    });
    expect(lista.items).toHaveLength(1);
  });
});
