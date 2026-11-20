// CAR-576 · Texto tipo por empresa contra Postgres real con un rol sin BYPASSRLS: guardarlo publica una versión nueva,
// la propuesta nueva lo trae precargado sin que nadie lo elija, la ya creada no cambia, otra empresa no lo ve y
// quien solo lee no lo puede guardar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

type Rol = "owner" | "viewer";
type Res<T> = { ok: true; data: T } | { ok: false; error: unknown };
type Vista = { bloques: { id: string; tipo: string; bibliotecaClave?: string | null }[]; textosPorDefecto: Record<string, string> };

describe.skipIf(!urlPropietario)("cpq · textos tipo de la propuesta en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const usuario = randomUUID();
  const ejecutar = <T>(tenantId: string, id: string, input: unknown, dryRun = false, rol: Rol = "owner") =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId,
        actor: { tipo: "user", id: usuario },
        usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
        portal: "erp",
        portalesMembresia: ["erp"],
        rol,
        modulosActivos: ["comercial", "cpq"],
        medidor,
      }),
      id,
      input,
      { dryRun },
    ) as Promise<Res<T>>;
  const guardar = (tenantId: string, tipo: string, texto: string, dryRun = false, rol: Rol = "owner") =>
    ejecutar<{ versionPublicada: number }>(tenantId, "cpq.biblioteca_bloques.guardar_texto_tipo", { tipo, texto }, dryRun, rol);
  const inicializar = (tenantId: string, cotizacionId: string) =>
    ejecutar<Vista>(tenantId, "cpq.propuestas_tecnica.inicializar", { cotizacionId });

  async function sis(tenantId: string, id: string, input: unknown) {
    const ctx = mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial", "cpq"], medidor });
    const r = (await mod.executeCapability(ctx, id, input)) as Res<{ id: string }>;
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  }
  async function empresa(nombre: string) {
    const t = await e.admin.tenant.create({ data: { slug: `tt-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const cuentaId = (await sis(t.id, "core.cuentas.create", { nombre })).id;
    const negocio = await sis(t.id, "comercial.negocios.create", { cuentaId, titulo: `Guardias ${nombre}` });
    const cotizacion = async (n: number) => {
      const cot = await e.admin.cpqCotizacion.create({
        data: { tenantId: t.id, negocioId: negocio.id, codigo: `CPQ-${n}-${t.id.slice(0, 6)}`, titulo: "Guardias", vigente: true, creadoPorId: usuario },
      });
      await e.admin.cpqVersion.create({ data: { tenantId: t.id, cotizacionId: cot.id, numero: 1, estado: "borrador", creadoPorId: usuario } });
      return cot.id;
    };
    return { tenantId: t.id, cotizacion };
  }
  const bloque = (v: Vista, tipo: string) => v.bloques.find((b) => b.tipo === tipo)!;

  let a: Awaited<ReturnType<typeof empresa>>;
  let b: Awaited<ReturnType<typeof empresa>>;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...capacidadesCpq]);
    registrarModuloComercial();
    await e.admin.user.create({ data: { id: usuario, email: `u-${usuario.slice(0, 8)}@cpq.test`, name: "Ana", emailVerified: true } });
    a = await empresa("Alfa");
    b = await empresa("Beta");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("la vista previa no escribe; guardar publica una versión nueva cada vez", async () => {
    expect((await guardar(a.tenantId, "comprension_servicio", "Borrador", true)).ok).toBe(true);
    expect(await e.admin.cpqBibliotecaBloque.count({ where: { tenantId: a.tenantId } })).toBe(0);
    const v1 = await guardar(a.tenantId, "comprension_servicio", "Entendemos su operación.");
    const v2 = await guardar(a.tenantId, "comprension_servicio", "Entendemos su operación y sus turnos.");
    expect(v1.ok && v1.data.versionPublicada).toBe(1);
    expect(v2.ok && v2.data.versionPublicada).toBe(2);
    expect(await e.admin.cpqBibliotecaBloqueRevision.count({ where: { tenantId: a.tenantId } })).toBe(2);
  });

  it("la propuesta nueva lo trae precargado; la ya creada no cambia", async () => {
    const r = await inicializar(a.tenantId, await a.cotizacion(1));
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    const comprension = bloque(r.data, "comprension_servicio");
    expect(comprension.bibliotecaClave).toBe("comprension_servicio");
    expect(r.data.textosPorDefecto[comprension.id]).toBe("Entendemos su operación y sus turnos.");
    expect(bloque(r.data, "incluye_exclusiones").bibliotecaClave).toBeUndefined();

    const cotizacionId = (await e.admin.cpqPropuestaTecnica.findFirstOrThrow({ where: { tenantId: a.tenantId } })).cotizacionId;
    expect((await guardar(a.tenantId, "incluye_exclusiones", "Incluye supervisión.")).ok).toBe(true);
    const despues = await ejecutar<Vista>(a.tenantId, "cpq.propuestas_tecnica.get", { cotizacionId });
    expect(despues.ok && bloque(despues.data, "incluye_exclusiones").bibliotecaClave).toBeUndefined();
  });

  it("otra empresa no ve el texto tipo", async () => {
    const r = await inicializar(b.tenantId, await b.cotizacion(1));
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    expect(bloque(r.data, "comprension_servicio").bibliotecaClave).toBeUndefined();
    expect(r.data.textosPorDefecto).toEqual({});
  });

  it("rechaza secciones sin texto tipo y a quien solo lee", async () => {
    expect((await guardar(a.tenantId, "texto_libre", "x")).ok).toBe(false);
    expect((await guardar(a.tenantId, "portada", "x")).ok).toBe(false);
    expect((await guardar(a.tenantId, "metodologia", "x", false, "viewer")).ok).toBe(false);
    expect(await e.admin.cpqBibliotecaBloque.count({ where: { tenantId: a.tenantId, clave: "metodologia" } })).toBe(0);
  });
});
