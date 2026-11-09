// CAR-138 PR 6 · Capítulo por instalación de la propuesta técnica contra Postgres real con un rol sin
// BYPASSRLS y dos empresas: lo derivado sale del CPQ (guardias simultáneos y dotación), lo narrativo solo
// se guarda como texto, lo que falta es un faltante verificable, la propuesta congelada no se toca, una
// instalación ajena no entra, el dryRun no escribe y una empresa no ve ni escribe los capítulos de la otra.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
type Cap = {
  instalacionId: string;
  direccion: string | null;
  puestos: { guardiasSimultaneos: number; dotacion: number | null }[];
  totales: { guardiasSimultaneos: number; dotacion: number | null };
  secciones: { clave: string; texto: string }[];
  faltantes: { clave: string }[];
};
type Lista = { estado: string; capitulos: Cap[] };

describe.skipIf(!urlPropietario)("cpq · capítulo por instalación de la propuesta en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const usuario = randomUUID();
  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["comercial", "cpq"],
      medidor,
    });
  const run = <T>(tenantId: string, id: string, input: unknown, dryRun = false) =>
    mod.executeCapability(ctx(tenantId), id, input, { dryRun }) as Promise<Res<T>>;
  async function sis<T>(tenantId: string, id: string, input: unknown) {
    const r = (await mod.executeCapability(
      mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial", "cpq"], medidor }),
      id,
      input,
    )) as Res<T>;
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  }
  const lista = async (tenantId: string, propuestaId: string) => {
    const r = await run<Lista>(tenantId, "cpq.propuestas_tecnica.capitulos_list", { propuestaId });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data;
  };
  const guardar = (tenantId: string, propuestaId: string, instalacionId: string, seccionClave: string, contenido: string, dryRun = false) =>
    run<{ eliminada: boolean }>(tenantId, "cpq.propuestas_tecnica.capitulo_guardar", { propuestaId, instalacionId, seccionClave, contenido }, dryRun);

  async function escenario(nombre: string) {
    const t = await e.admin.tenant.create({ data: { slug: `cap-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const cuentaId = (await sis<{ id: string }>(t.id, "core.cuentas.create", { nombre })).id;
    const instalacionId = (await sis<{ id: string }>(t.id, "core.instalaciones.create", { cuentaId, nombre: "Planta Norte" })).id;
    const ajena = (await sis<{ id: string }>(t.id, "core.instalaciones.create", { cuentaId, nombre: "Bodega Sur" })).id;
    const negocio = await sis<{ id: string }>(t.id, "comercial.negocios.create", { cuentaId, titulo: `Guardias ${nombre}` });
    await e.admin.patronTurno.create({ data: { tenantId: t.id, nombre: "4x4", clase: "ciclico", diasTrabajo: 4, diasDescanso: 4 } });
    const cot = await e.admin.cpqCotizacion.create({
      data: { tenantId: t.id, negocioId: negocio.id, codigo: `CPQ-${t.id.slice(0, 6)}-1`, titulo: "Guardias", vigente: true, creadoPorId: usuario },
    });
    const version = await e.admin.cpqVersion.create({ data: { tenantId: t.id, cotizacionId: cot.id, numero: 1, estado: "borrador", creadoPorId: usuario } });
    const sec = await e.admin.cpqSeccion.create({ data: { tenantId: t.id, versionId: version.id, instalacionId, nombre: "Planta Norte" } });
    await e.admin.cpqSeccion.create({ data: { tenantId: t.id, versionId: version.id, instalacionId: null, nombre: "Común", orden: 1 } });
    await e.admin.cpqLinea.create({
      data: { tenantId: t.id, seccionId: sec.id, tipo: "puesto", nombre: "Guardia día", posiciones: 2, patron: "4×4", horaInicio: "08:00", horaFin: "20:00", diasCobertura: 7 },
    });
    const plantilla = await e.admin.cpqPlantillaDocumento.create({ data: { tenantId: t.id, tipo: "propuesta_tecnica", bloquesJson: "[]" } });
    const prop = await e.admin.cpqPropuestaTecnica.create({
      data: { tenantId: t.id, cotizacionId: cot.id, versionId: version.id, base: "clasica", plantillaDocumentoId: plantilla.id, plantillaDocumentoVersion: 1, estado: "borrador", bloquesJson: "[]", creadoPorId: usuario },
    });
    return { tenantId: t.id, propuestaId: prop.id, instalacionId, ajena };
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

  it("deriva guardias simultáneos y dotación del CPQ y deja todo lo narrativo como faltante", async () => {
    const l = await lista(a.tenantId, a.propuestaId);
    expect(l.capitulos).toHaveLength(1); // «Común» no tiene capítulo
    const c = l.capitulos[0]!;
    expect(c.instalacionId).toBe(a.instalacionId);
    expect(c.puestos[0]?.guardiasSimultaneos).toBe(2);
    expect(c.puestos[0]?.dotacion).toBe(4); // 4×4, 7 días: 2 personas por posición × 2
    expect(c.totales).toEqual({ guardiasSimultaneos: 2, dotacion: 4 });
    expect(c.secciones).toEqual([]);
    expect(c.faltantes.map((f) => f.clave)).toEqual(expect.arrayContaining(["alcance", "exclusiones", "supervision", "arranque"]));
  });

  it("la vista previa no escribe; guardar escribe, auditado, y vaciar quita la sección", async () => {
    const previa = await guardar(a.tenantId, a.propuestaId, a.instalacionId, "alcance", "Control de accesos.", true);
    expect(previa.ok).toBe(true);
    expect(await e.admin.cpqPropuestaCapitulo.count({ where: { tenantId: a.tenantId } })).toBe(0);
    const real = await guardar(a.tenantId, a.propuestaId, a.instalacionId, "alcance", "  Control de accesos.\r\nRondas.  ");
    expect(real.ok).toBe(true);
    const fila = await e.admin.cpqPropuestaCapitulo.findFirstOrThrow({ where: { tenantId: a.tenantId } });
    expect(fila.contenido).toBe("Control de accesos.\nRondas.");
    expect(fila.origen).toBe("manual");
    expect(await e.admin.auditEvent.count({ where: { tenantId: a.tenantId, capability: "cpq.propuestas_tecnica.capitulo_guardar" } })).toBe(1);
    const c = (await lista(a.tenantId, a.propuestaId)).capitulos[0]!;
    expect(c.secciones.map((s) => s.clave)).toEqual(["alcance"]);
    expect(c.faltantes.map((f) => f.clave)).not.toContain("alcance");
    await guardar(a.tenantId, a.propuestaId, a.instalacionId, "alcance", "   ");
    expect(await e.admin.cpqPropuestaCapitulo.count({ where: { tenantId: a.tenantId } })).toBe(0);
  });

  it("rechaza instalación ajena a la cotización, clave inválida y texto demasiado largo", async () => {
    expect((await guardar(a.tenantId, a.propuestaId, a.ajena, "alcance", "x")).ok).toBe(false);
    expect((await guardar(a.tenantId, a.propuestaId, a.instalacionId, "precio", "x")).ok).toBe(false);
    expect((await guardar(a.tenantId, a.propuestaId, a.instalacionId, "alcance", "x".repeat(8001))).ok).toBe(false);
    expect(await e.admin.cpqPropuestaCapitulo.count({ where: { tenantId: a.tenantId } })).toBe(0);
  });

  it("una empresa no ve ni escribe los capítulos de la otra", async () => {
    expect((await run(b.tenantId, "cpq.propuestas_tecnica.capitulos_list", { propuestaId: a.propuestaId })).ok).toBe(false);
    expect((await guardar(b.tenantId, a.propuestaId, a.instalacionId, "alcance", "intruso")).ok).toBe(false);
    expect((await guardar(b.tenantId, b.propuestaId, a.instalacionId, "alcance", "otra empresa")).ok).toBe(false);
    expect(await e.admin.cpqPropuestaCapitulo.count({ where: { tenantId: { in: [a.tenantId, b.tenantId] } } })).toBe(0);
    // El disparador de misma empresa frena un capítulo de B colgado de la propuesta de A, aun con el rol propietario.
    await expect(
      e.admin.cpqPropuestaCapitulo.create({
        data: { tenantId: b.tenantId, propuestaId: a.propuestaId, instalacionId: a.instalacionId, seccionClave: "alcance", contenido: "x", actualizadoPorId: usuario },
      }),
    ).rejects.toThrow();
  });

  it("congelada: no se cambia ningún capítulo y la lectura sigue disponible", async () => {
    await guardar(a.tenantId, a.propuestaId, a.instalacionId, "exclusiones", "No incluye monitoreo.");
    await e.admin.cpqPropuestaTecnica.update({ where: { id: a.propuestaId }, data: { estado: "congelada" } });
    expect((await guardar(a.tenantId, a.propuestaId, a.instalacionId, "exclusiones", "otro texto")).ok).toBe(false);
    expect((await guardar(a.tenantId, a.propuestaId, a.instalacionId, "exclusiones", "")).ok).toBe(false);
    const l = await lista(a.tenantId, a.propuestaId);
    expect(l.estado).toBe("congelada");
    expect(l.capitulos[0]?.secciones[0]?.texto).toBe("No incluye monitoreo.");
  });
});
