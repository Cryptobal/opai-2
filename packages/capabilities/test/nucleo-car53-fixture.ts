// Fixture de CAR-53: capacidades del Núcleo que no tenían test, contra Postgres real. Cada escritura
// se prueba igual: sin permiso → FORBIDDEN y sin auditoría; `dryRun` → sin cambios ni auditoría;
// real → cambio y una fila en `core.audit_events`; fuera del alcance → NOT_FOUND.
import { randomUUID } from "node:crypto";
import { expect } from "vitest";

import { type Entorno, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { Alcance } from "../src/types";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";
import type { Correo } from "../src/testing/tipos";

type Mod = typeof ModuloCapacidades;
type Ctx = ReturnType<Mod["crearContexto"]>;

export async function prepararCar53(prefijo: string) {
  const e: Entorno = await prepararEntorno();
  const mod: Mod = await import("../src");
  mod.limpiarRegistro();
  mod.registrarCapacidades(mod.capacidadesDelNucleo);
  const sufijo = randomUUID().slice(0, 8);
  const tenantId = (
    await e.admin.tenant.create({
      data: { slug: `${prefijo}-${sufijo}`, nombre: "Empresa CAR-53", vertical: "seguridad" },
    })
  ).id;
  const email = `owner-${sufijo}@prueba.cl`;
  const userId = (
    await e.admin.user.create({ data: { name: "Owner", email, emailVerified: true } })
  ).id;
  await e.admin.membership.create({ data: { tenantId, userId, rol: "owner", portales: ["erp"] } });
  const correos: Correo[] = [];
  const medidor = { registrar: async () => undefined };
  const almacen = almacenamientoEnMemoria();
  const servicios = {
    correo: { nombre: "memoria", enviar: async (c: Correo) => void correos.push(c) },
    almacenamiento: almacen.almacenamiento,
  };

  const owner = (): Ctx =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      portal: "erp",
      portalesMembresia: ["erp"],
      usuario: { id: userId, nombre: "Owner", email, platformRole: null },
      rol: "owner",
      medidor,
      servicios,
    });
  /** Solo lectura en todo el núcleo: ninguna escritura de estas capacidades le corresponde. */
  const viewer = (): Ctx =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      rol: "viewer",
      medidor,
      servicios,
    });
  /** Supervisor con el permiso concedido por excepción y alcance por instalaciones (ADR-022). */
  const acotado = (alcance: Alcance, permisos: string[], portal = "erp"): Ctx =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal,
      portalesMembresia: ["erp", "supervisor"],
      rol: "supervisor",
      excepciones: permisos.map((permiso) => ({ permiso, conceder: true })),
      alcance,
      medidor,
      servicios,
    });

  async function dato<T>(ctx: Ctx, id: string, input: unknown, opciones = {}): Promise<T> {
    const r = await mod.executeCapability(ctx, id, input, opciones);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  const auditorias = (capability: string) =>
    e.admin.auditEvent.count({ where: { tenantId, capability } });

  /**
   * Autorización, `dryRun` y auditoría de una escritura: `estado()` lee de la base lo que la
   * escritura debe cambiar; se compara antes, tras la vista previa y tras la escritura real.
   */
  async function probarEscritura<T>(
    id: string,
    input: unknown,
    estado: () => Promise<unknown>,
    ctx: Ctx = owner(),
  ): Promise<T> {
    const inicial = await estado();
    const auditadas = await auditorias(id);
    expect(await mod.executeCapability(viewer(), id, input)).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    await dato(ctx, id, input, { dryRun: true });
    expect(await estado()).toEqual(inicial);
    expect(await auditorias(id)).toBe(auditadas);
    const salida = await dato<T>(ctx, id, input);
    expect(await estado()).not.toEqual(inicial);
    expect(await auditorias(id)).toBe(auditadas + 1);
    return salida;
  }

  const cerrar = () => e.cerrar();
  return {
    e,
    mod,
    tenantId,
    userId,
    email,
    correos,
    almacen,
    owner,
    viewer,
    acotado,
    dato,
    auditorias,
    probarEscritura,
    cerrar,
  };
}

export type Car53 = Awaited<ReturnType<typeof prepararCar53>>;
