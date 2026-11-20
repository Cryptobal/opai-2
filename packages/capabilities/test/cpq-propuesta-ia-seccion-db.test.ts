// CAR-534 · Aceptar el borrador de IA de una sección guarda el texto con `cpq.propuestas_tecnica.update`
// contra Postgres real con un rol sin BYPASSRLS: la vista previa no escribe, solo cambia la sección
// aceptada, otra empresa no puede escribir la propuesta y una propuesta congelada no se toca.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

type Res = { ok: boolean };
type Bloque = { id: string; tipo: string; activo: boolean; fijo: boolean; opcional: boolean; contenidoOverride?: string | null };

describe.skipIf(!urlPropietario)("cpq · aceptar borrador de IA por sección en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const usuario = randomUUID();
  const bloques: Bloque[] = [
    { id: "a", tipo: "texto_libre", activo: true, fijo: false, opcional: true, contenidoOverride: "Texto manual." },
    { id: "b", tipo: "texto_libre", activo: true, fijo: false, opcional: true },
  ];
  const aceptar = (tenantId: string, id: string, dryRun = false) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId,
        actor: { tipo: "user", id: usuario },
        usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
        portal: "erp",
        portalesMembresia: ["erp"],
        rol: "owner",
        modulosActivos: ["comercial", "cpq"],
        medidor,
      }),
      "cpq.propuestas_tecnica.update",
      { id, bloques: bloques.map((b) => (b.id === "b" ? { ...b, contenidoOverride: "Borrador aceptado." } : b)) },
      { dryRun },
    ) as Promise<Res>;
  const guardados = async (id: string) =>
    JSON.parse((await e.admin.cpqPropuestaTecnica.findUniqueOrThrow({ where: { id } })).bloquesJson) as Bloque[];

  async function sis(tenantId: string, id: string, input: unknown) {
    const ctx = mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial", "cpq"], medidor });
    const r = (await mod.executeCapability(ctx, id, input)) as { ok: true; data: { id: string } } | { ok: false; error: unknown };
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  }
  async function propuesta(nombre: string) {
    const t = await e.admin.tenant.create({ data: { slug: `ia-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const cuentaId = (await sis(t.id, "core.cuentas.create", { nombre })).id;
    const negocio = await sis(t.id, "comercial.negocios.create", { cuentaId, titulo: `Guardias ${nombre}` });
    const cot = await e.admin.cpqCotizacion.create({
      data: { tenantId: t.id, negocioId: negocio.id, codigo: `CPQ-${t.id.slice(0, 6)}`, titulo: "Guardias", vigente: true, creadoPorId: usuario },
    });
    const version = await e.admin.cpqVersion.create({ data: { tenantId: t.id, cotizacionId: cot.id, numero: 1, estado: "borrador", creadoPorId: usuario } });
    const plantilla = await e.admin.cpqPlantillaDocumento.create({ data: { tenantId: t.id, tipo: "propuesta_tecnica", bloquesJson: "[]" } });
    const prop = await e.admin.cpqPropuestaTecnica.create({
      data: { tenantId: t.id, cotizacionId: cot.id, versionId: version.id, base: "clasica", plantillaDocumentoId: plantilla.id, plantillaDocumentoVersion: 1, estado: "borrador", bloquesJson: JSON.stringify(bloques), creadoPorId: usuario },
    });
    return { tenantId: t.id, id: prop.id };
  }

  let a: Awaited<ReturnType<typeof propuesta>>;
  let b: Awaited<ReturnType<typeof propuesta>>;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...capacidadesCpq]);
    registrarModuloComercial();
    await e.admin.user.create({ data: { id: usuario, email: `u-${usuario.slice(0, 8)}@cpq.test`, name: "Ana", emailVerified: true } });
    a = await propuesta("Alfa");
    b = await propuesta("Beta");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("la vista previa no escribe; aceptar cambia solo la sección elegida", async () => {
    expect((await aceptar(a.tenantId, a.id, true)).ok).toBe(true);
    expect((await guardados(a.id))[1]?.contenidoOverride).toBeUndefined();
    expect((await aceptar(a.tenantId, a.id)).ok).toBe(true);
    const r = await guardados(a.id);
    expect(r[0]?.contenidoOverride).toBe("Texto manual.");
    expect(r[1]?.contenidoOverride).toBe("Borrador aceptado.");
  });

  it("otra empresa no puede escribir la propuesta", async () => {
    expect((await aceptar(b.tenantId, a.id)).ok).toBe(false);
    expect((await guardados(b.id))[1]?.contenidoOverride).toBeUndefined();
  });

  it("una propuesta congelada no se toca", async () => {
    await e.admin.cpqPropuestaTecnica.update({ where: { id: b.id }, data: { estado: "congelada" } });
    expect((await aceptar(b.tenantId, b.id)).ok).toBe(false);
    expect((await guardados(b.id))[1]?.contenidoOverride).toBeUndefined();
  });
});
