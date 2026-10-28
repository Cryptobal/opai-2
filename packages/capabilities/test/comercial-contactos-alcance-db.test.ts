// Revisión del #99 (B99-1): comercial.negocios.set_contactos reemplaza solo los vínculos que quien
// guarda puede ver (ADR-022). Un actor acotado que guarda la lista vacía no borra los vínculos con
// contactos fuera de su alcance. Complementa el test en memoria con Postgres real (DATABASE_URL_TEST).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "../../db/src/catalogo-comercial";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { Alcance } from "../src/types";

describe.skipIf(!urlPropietario)("comercial · set_contactos respeta el alcance", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let negocioId = "";
  let contactoId = "";
  const medidor = { registrar: async () => undefined };
  const modulosActivos = ["comercial"];

  const ctxOwner = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      modulosActivos,
      medidor,
    });
  // Supervisor con Comercial (leer y gestionar) concedido por excepción y alcance por instalaciones.
  const ctxAcotado = (alcance: Alcance) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "supervisor",
      excepciones: [
        { permiso: "comercial:negocios.read", conceder: true },
        { permiso: "comercial:negocios.manage", conceder: true },
      ],
      modulosActivos,
      alcance,
      medidor,
    });

  async function dato<T>(ctx: ReturnType<typeof ctxOwner>, id: string, input: unknown) {
    const r = await mod.executeCapability(ctx, id, input, {});
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial]);
    const slug = `com-sc-${randomUUID().slice(0, 8)}`;
    tenantId = (
      await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } })
    ).id;
    await sembrarComercial(e.admin.$extends({}), tenantId);
    const o = ctxOwner();
    const cuentaId = (await dato<{ id: string }>(o, "core.cuentas.create", { nombre: "Alfa" })).id;
    contactoId = (
      await e.admin.contacto.create({
        data: { tenantId, cuentaId, nombres: "Ana", apellidos: "Prueba" },
      })
    ).id;
    negocioId = (
      await dato<{ id: string }>(o, "comercial.negocios.create", { cuentaId, titulo: "Guardias" })
    ).id;
    await dato(o, "comercial.negocios.set_contactos", {
      negocioId,
      contactos: [{ contactoId, rol: "decisor", esPrincipal: true }],
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("guardar sin ver el contacto no borra su vínculo, ni deja agregarlo", async () => {
    const acotado = ctxAcotado({ instalaciones: [] });
    await dato(acotado, "comercial.negocios.set_contactos", { negocioId, contactos: [] });
    expect(await e.admin.negocioContacto.count({ where: { negocioId } })).toBe(1);
    const r = await mod.executeCapability(acotado, "comercial.negocios.set_contactos", {
      negocioId,
      contactos: [{ contactoId, rol: "tecnico", esPrincipal: false }],
    });
    expect(r).toMatchObject({ ok: false });
    const sinCuentas = mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      rol: "gerente",
      permisosRol: ["comercial:negocios.manage", "comercial:negocios.read"],
      modulosActivos,
      medidor,
    });
    const s = await mod.executeCapability(sinCuentas, "comercial.negocios.set_contactos", {
      negocioId,
      contactos: [],
    });
    expect(s).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await e.admin.negocioContacto.count({ where: { negocioId } })).toBe(1);
  });
});
