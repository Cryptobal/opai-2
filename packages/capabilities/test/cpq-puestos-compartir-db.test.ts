// CAR-162 PR E · CPQ v4 contra Postgres real con un rol sin BYPASSRLS: crear puestos al ganar (R2,
// confirma RRHH, idempotente), compartir por enlace (vence, se revoca, no cruza empresas) y archivar.
import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

describe.skipIf(!urlPropietario)("cpq · puestos al ganar, compartir y archivar en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const usuario = randomUUID();
  const sha = (t: string) => createHash("sha256").update(t).digest("hex");
  const ctx = (tenantId: string, rol: "owner" | "gerente" = "owner", modulos: readonly string[] = ["comercial", "cpq"]) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol,
      modulosActivos: modulos,
      medidor,
    });
  const run = <T>(
    tenantId: string,
    id: string,
    input: unknown,
    dryRun = false,
    rol: "owner" | "gerente" = "owner",
    modulos?: readonly string[],
  ) => mod.executeCapability(ctx(tenantId, rol, modulos), id, input, { dryRun }) as Promise<Res<T>>;
  /** Enciende o apaga el ajuste `cpq.enlace_publico` de la empresa (apagado por defecto). */
  const ajusteEnlace = (tenantId: string, valor: boolean) =>
    e.admin.ajuste.upsert({
      where: { tenantId_ambito_sujetoId_modulo_clave: { tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "cpq", clave: "enlace_publico" } },
      create: { tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "cpq", clave: "enlace_publico", valor },
      update: { valor },
    });
  async function ok<T>(tenantId: string, id: string, input: unknown, dryRun = false) {
    const r = await run<T>(tenantId, id, input, dryRun);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  }
  /** Preparación del escenario: sin persona (el negocio no queda con responsable). */
  async function sis<T>(tenantId: string, id: string, input: unknown) {
    const r = (await mod.executeCapability(
      mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial", "cpq"], medidor }),
      id,
      input,
    )) as Res<T>;
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  }
  const publica = (tenantId: string, token: string, modulos: readonly string[] = ["cpq"]) =>
    mod.executeCapability(
      mod.crearContexto({ tenantId, actor: { tipo: "system" }, modulosActivos: modulos, medidor }),
      "cpq.compartir.ver",
      { token },
    ) as Promise<Res<{ ventaMensualClp: number | null; secciones: { lineas: object[] }[] }>>;

  async function escenario(nombre: string) {
    const t = await e.admin.tenant.create({
      data: { slug: `cpq-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" },
    });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const cuentaId = (await sis<{ id: string }>(t.id, "core.cuentas.create", { nombre })).id;
    const instalacionId = (await sis<{ id: string }>(t.id, "core.instalaciones.create", { cuentaId, nombre: "Planta Norte" })).id;
    const negocio = await sis<{ id: string }>(t.id, "comercial.negocios.create", { cuentaId, titulo: `Guardias ${nombre}` });
    const cargo = await e.admin.cargo.create({ data: { tenantId: t.id, nombre: "Guardia", activo: true, orden: 0 } });
    await e.admin.patronTurno.create({ data: { tenantId: t.id, nombre: "4x4", clase: "ciclico", diasTrabajo: 4, diasDescanso: 4 } });
    const cot = await e.admin.cpqCotizacion.create({
      data: { tenantId: t.id, negocioId: negocio.id, codigo: `CPQ-${t.id.slice(0, 6)}-1`, titulo: "Guardias Planta Norte", vigente: true, creadoPorId: usuario },
    });
    const version = await e.admin.cpqVersion.create({
      data: { tenantId: t.id, cotizacionId: cot.id, numero: 1, estado: "enviada", ventaMensualClp: 3_791_510, creadoPorId: usuario },
    });
    const seccion = await e.admin.cpqSeccion.create({ data: { tenantId: t.id, versionId: version.id, instalacionId, nombre: "Planta Norte" } });
    const linea = await e.admin.cpqLinea.create({
      data: {
        tenantId: t.id, seccionId: seccion.id, tipo: "puesto", nombre: "Guardia día", posiciones: 2, cargoId: cargo.id,
        patron: "4×4", horaInicio: "08:00", horaFin: "20:00", sueldoBaseClp: 620_000, sueldoOrigen: "referencia_cargo",
      },
    });
    return { tenantId: t.id, cotizacionId: cot.id, versionId: version.id, lineaId: linea.id, instalacionId };
  }

  let a: Awaited<ReturnType<typeof escenario>>;
  let b: Awaited<ReturnType<typeof escenario>>;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...capacidadesCpq]);
    registrarModuloComercial();
    await e.admin.user.create({ data: { id: usuario, email: `u-${usuario.slice(0, 8)}@cpq.test`, name: "Ana", emailVerified: true } });
    a = await escenario("Alfa");
    b = await escenario("Beta");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("sin versión aceptada no hay oferta de puestos", async () => {
    const r = await run(a.tenantId, "cpq.puestos.ofrecer", { cotizacionId: a.cotizacionId });
    expect(r.ok).toBe(false);
    await e.admin.cpqVersion.update({ where: { id: a.versionId }, data: { estado: "aceptada" } });
    await e.admin.cpqVersion.update({ where: { id: b.versionId }, data: { estado: "aceptada" } });
  });

  it("ofrece la línea de guardias con su patrón casado y nada se crea", async () => {
    const o = await ok<{ pendientes: number; items: { patronId: string | null; sueldoBaseClp?: number | null }[] }>(
      a.tenantId, "cpq.puestos.ofrecer", { cotizacionId: a.cotizacionId });
    expect(o.pendientes).toBe(2);
    expect(o.items[0]?.patronId).not.toBeNull();
    expect(o.items[0]?.sueldoBaseClp).toBe(620_000);
    expect(await e.admin.puesto.count({ where: { tenantId: a.tenantId } })).toBe(0);
  });

  it("quien no es RRHH (gerente) no confirma; la vista previa no escribe", async () => {
    const entrada = { cotizacionId: a.cotizacionId, puestos: [{ lineaId: a.lineaId }] };
    const g = await run(a.tenantId, "cpq.puestos.confirmar", entrada, false, "gerente");
    expect(g.ok).toBe(false);
    const previa = await ok<{ creados: { nombre: string }[] }>(a.tenantId, "cpq.puestos.confirmar", entrada, true);
    expect(previa.creados.map((c) => c.nombre)).toEqual(["Guardia 1", "Guardia 2"]);
    expect(await e.admin.puesto.count({ where: { tenantId: a.tenantId } })).toBe(0);
  });

  it("confirmar crea un puesto por posición en PPC y repetir no duplica", async () => {
    const entrada = { cotizacionId: a.cotizacionId, puestos: [{ lineaId: a.lineaId, nombre: "Guardia día" }] };
    const r = await ok<{ creados: { puestoId: string }[] }>(a.tenantId, "cpq.puestos.confirmar", entrada);
    expect(r.creados).toHaveLength(2);
    const puestos = await e.admin.puesto.findMany({ where: { tenantId: a.tenantId }, orderBy: { nombre: "asc" } });
    expect(puestos.map((p) => [p.nombre, p.cobertura, p.diasTrabajo, p.horaInicio])).toEqual([
      ["Guardia día 1", "ppc", 4, "08:00"],
      ["Guardia día 2", "ppc", 4, "08:00"],
    ]);
    const otra = await run(a.tenantId, "cpq.puestos.confirmar", entrada);
    expect(otra.ok).toBe(false);
    expect(await e.admin.puesto.count({ where: { tenantId: a.tenantId } })).toBe(2);
    expect(await e.admin.cpqPuestoCreado.count({ where: { lineaId: a.lineaId } })).toBe(2);
    const estado = await ok<{ puestosPendientes: number }>(a.tenantId, "cpq.cotizaciones.estado_comercial", { id: a.cotizacionId });
    expect(estado.puestosPendientes).toBe(0);
  });

  it("la otra empresa no ve ni crea con lo de la primera", async () => {
    const r = await run(b.tenantId, "cpq.puestos.confirmar", { cotizacionId: a.cotizacionId, puestos: [{ lineaId: a.lineaId }] });
    expect(r.ok).toBe(false);
    expect(await e.admin.puesto.count({ where: { tenantId: b.tenantId } })).toBe(0);
  });

  it("enlace apagado por defecto: no se crea y /p/ responde NOT_FOUND", async () => {
    await e.admin.cpqVersion.update({ where: { id: b.versionId }, data: { estado: "enviada" } });
    const r = await run(b.tenantId, "cpq.compartir.crear", { cotizacionId: b.cotizacionId });
    expect(r.ok).toBe(false);
    expect((await publica(b.tenantId, "a".repeat(32)).then((x) => x.ok))).toBe(false);
    const est = await ok<{ enlacePermitido: boolean }>(b.tenantId, "cpq.cotizaciones.estado_comercial", { id: b.cotizacionId });
    expect(est.enlacePermitido).toBe(false);
    expect(await e.admin.cpqEnlaceCompartido.count({ where: { tenantId: b.tenantId } })).toBe(0);
  });

  it("ajuste encendido pero con Portal Cliente: nunca se crea ni abre", async () => {
    await ajusteEnlace(b.tenantId, true);
    const conPortal = ["comercial", "cpq", "portal_cliente"];
    const r = await run(b.tenantId, "cpq.compartir.crear", { cotizacionId: b.cotizacionId }, false, "owner", conPortal);
    expect(r.ok).toBe(false);
    const est = await run<{ enlacePermitido: boolean }>(b.tenantId, "cpq.cotizaciones.estado_comercial", { id: b.cotizacionId }, false, "owner", conPortal);
    expect(est.ok && est.data.enlacePermitido).toBe(false);
    // Un enlace creado antes de activar el portal deja de abrir apenas el portal está activo.
    const antes = (await ok<{ url: string }>(b.tenantId, "cpq.compartir.crear", { cotizacionId: b.cotizacionId })).url.split("/").at(-1)!;
    expect((await publica(b.tenantId, antes)).ok).toBe(true);
    expect((await publica(b.tenantId, antes, conPortal)).ok).toBe(false);
    await ok(b.tenantId, "cpq.compartir.revocar", { cotizacionId: b.cotizacionId });
  });

  it("compartir (ajuste encendido, sin portal): crea el enlace, el cliente lo abre sin costos y cuenta la vista", async () => {
    await ajusteEnlace(b.tenantId, true);
    const c = await ok<{ url: string }>(b.tenantId, "cpq.compartir.crear", { cotizacionId: b.cotizacionId });
    const token = c.url.split("/").at(-1)!;
    expect(c.url).toContain("/p/cpq-");
    const v = await publica(b.tenantId, token);
    expect(v.ok && v.data.ventaMensualClp).toBe(3_791_510);
    expect(JSON.stringify(v)).not.toMatch(/sueldo|margen|costo/i);
    // Solo se guarda el hash sha256; el token en claro no está en la base ni vuelve a leerse.
    const fila = await e.admin.cpqEnlaceCompartido.findFirstOrThrow({ where: { tokenHash: sha(token) } });
    expect(fila.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(fila.vistas).toBe(1);
    const est = await ok<{ enlacePermitido: boolean; enlace: Record<string, unknown> | null }>(b.tenantId, "cpq.cotizaciones.estado_comercial", { id: b.cotizacionId });
    expect(est.enlacePermitido).toBe(true);
    expect(est.enlace).not.toBeNull();
    expect(JSON.stringify(est)).not.toContain(token);
    expect(est.enlace).not.toHaveProperty("url");
    // Un token de la empresa B pedido con el slug de A (tenant A) da NOT_FOUND, igual que uno inexistente.
    const cruzado = await publica(a.tenantId, token);
    expect(cruzado.ok).toBe(false);
    expect(!cruzado.ok && cruzado.error.code).toBe("NOT_FOUND");
    expect(!cruzado.ok && cruzado.error.code).toBe(
      (await publica(a.tenantId, "f".repeat(32)).then((x) => (!x.ok ? x.error.code : "ok"))),
    );
    expect((await e.admin.cpqEnlaceCompartido.findFirstOrThrow({ where: { tokenHash: sha(token) } })).vistas).toBe(1);
  });

  it("revocar y vencer cierran el enlace; uno nuevo revoca el anterior", async () => {
    const primero = (await ok<{ url: string }>(b.tenantId, "cpq.compartir.crear", { cotizacionId: b.cotizacionId })).url.split("/").at(-1)!;
    const segundo = (await ok<{ url: string }>(b.tenantId, "cpq.compartir.crear", { cotizacionId: b.cotizacionId })).url.split("/").at(-1)!;
    expect((await publica(b.tenantId, primero)).ok).toBe(false);
    expect((await publica(b.tenantId, segundo)).ok).toBe(true);
    await e.admin.cpqEnlaceCompartido.updateMany({ where: { tokenHash: sha(segundo) }, data: { venceEn: new Date(Date.now() - 1000) } });
    expect((await publica(b.tenantId, segundo)).ok).toBe(false);
    const nuevo = (await ok<{ url: string }>(b.tenantId, "cpq.compartir.crear", { cotizacionId: b.cotizacionId })).url.split("/").at(-1)!;
    await ok(b.tenantId, "cpq.compartir.revocar", { cotizacionId: b.cotizacionId });
    expect((await publica(b.tenantId, nuevo)).ok).toBe(false);
  });

  it("archivar saca la cotización de la lista y restaurar la devuelve; la aceptada no se archiva", async () => {
    const lista = (tenantId: string, extra: object = {}) =>
      ok<{ items: { id: string }[] }>(tenantId, "cpq.cotizaciones.list", extra);
    expect((await ok(a.tenantId, "cpq.cotizaciones.archivar", { id: a.cotizacionId }).catch((x: Error) => x.message))).toMatch(/aceptada/);
    await e.admin.cpqVersion.update({ where: { id: b.versionId }, data: { estado: "rechazada" } });
    await ok(b.tenantId, "cpq.cotizaciones.archivar", { id: b.cotizacionId });
    expect((await lista(b.tenantId)).items).toHaveLength(0);
    expect((await lista(b.tenantId, { soloArchivadas: true })).items).toHaveLength(1);
    await ok(b.tenantId, "cpq.cotizaciones.restaurar", { id: b.cotizacionId });
    expect((await lista(b.tenantId)).items).toHaveLength(1);
    expect((await lista(a.tenantId, { soloArchivadas: true })).items).toHaveLength(0);
  });

  it("costos por categoría: la otra empresa no los lee ni los escribe", async () => {
    const borrador = await e.admin.cpqVersion.create({
      data: { tenantId: a.tenantId, cotizacionId: a.cotizacionId, numero: 2, estado: "borrador", creadoPorId: usuario },
    });
    const costo = { categoria: "uniformes", montoClp: 50_000, lineaId: null };
    const lee = await run(b.tenantId, "cpq.costos_categoria.list", { versionId: borrador.id });
    expect(!lee.ok && lee.error.code).toBe("NOT_FOUND");
    for (const dryRun of [true, false]) {
      const escribe = await run(b.tenantId, "cpq.costos_categoria.guardar", { versionId: borrador.id, items: [costo] }, dryRun);
      expect(!escribe.ok && escribe.error.code).toBe("NOT_FOUND");
    }
    expect(await e.admin.cpqCostoCategoria.count({ where: { versionId: borrador.id } })).toBe(0);
  });
});
