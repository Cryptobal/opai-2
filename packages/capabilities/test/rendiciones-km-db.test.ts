// Rendiciones R2a · kilometraje (CAR-194) con Postgres real: tres métodos, monto del cliente ignorado,
// instantánea de parámetros, aislamiento entre empresas, vista previa sin escritura y empresa sin configurar.
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { manifest } from "../../../modules/rendiciones/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const STGO = { texto: "Santiago Centro", lat: -33.4489, lng: -70.6693 };
const RANCAGUA = { texto: "Rancagua", lat: -34.1708, lng: -70.7444 };

describe.skipIf(omitirSuiteDb())("Rendiciones · R2a kilometraje (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  let tenantSin = "";
  let instA = "";
  const rinde = randomUUID();
  const aprueba = randomUUID();
  const admin = randomUUID();
  const rindeSin = randomUUID();
  const ajeno = randomUUID();
  const usos: { recurso: string }[] = [];

  type Rol = "supervisor" | "gerente" | "admin";
  const ctx = (uid: string, rol: Rol, tid: string) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@km.test`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol,
      modulosActivos: ["rendiciones"],
      medidor: { registrar: async (u: { recurso: string }) => void usos.push(u) },
    });
  const como = (uid: string, rol: Rol, tid: string) => (id: string, input: Record<string, unknown>, opts?: { dryRun?: boolean }) =>
    mod.executeCapability(ctx(uid, rol, tid), id, input, opts);
  const yo = como(rinde, "supervisor", "");
  let rindeA = yo;
  let adminA = yo;
  const dato = async <T>(r: Awaited<ReturnType<typeof yo>>): Promise<T> => {
    if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
    return r.data as T;
  };
  const config = async (clave: string, valor: unknown) => dato(await adminA("core.config.set", { modulo: "rendiciones", clave, valor }));
  const viaje = (extra: Record<string, unknown> = {}) => ({
    origen: STGO, destino: RANCAGUA, idaYVuelta: false, peajeClp: 0, fecha: "2026-11-02", ...extra,
  });
  const cuerpo = (extra: Record<string, unknown> = {}) => ({
    tipo: "kilometraje", descripcion: "Visita a la planta", centroCosto: "instalacion", instalacionId: instA, aprobadorId: aprueba,
    viaje: viaje(), ...extra,
  });
  const crear = (extra: Record<string, unknown> = {}) => rindeA("rendiciones.rendiciones.crear", cuerpo(extra));

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const t = (slug: string) => e.admin.tenant.create({ data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" } });
    tenantA = (await t("km-a")).id;
    tenantB = (await t("km-b")).id;
    tenantSin = (await t("km-sin")).id;
    const c = await e.admin.cuenta.create({ data: { tenantId: tenantA, nombre: "Cliente KM", rut: "76333444-5" } });
    instA = (await e.admin.instalacion.create({ data: { tenantId: tenantA, cuentaId: c.id, nombre: "Planta KM", estado: "activa" } })).id;
    for (const [id, rol, tid] of [[rinde, "supervisor", tenantA], [aprueba, "gerente", tenantA], [admin, "admin", tenantA], [rindeSin, "supervisor", tenantSin], [ajeno, "gerente", tenantB]] as const) {
      await e.admin.user.create({ data: { id, name: rol, email: `${id.slice(0, 8)}@km.test` } });
      await e.admin.membership.create({ data: { tenantId: tid, userId: id, rol, portales: ["erp"] } });
    }
    rindeA = como(rinde, "supervisor", tenantA);
    adminA = como(admin, "admin", tenantA);
    // Sin clave de Google la distancia es en línea recta: determinista y sin llamadas reales.
    delete process.env["GOOGLE_MAPS_SERVER_KEY"];
  });
  afterEach(() => vi.unstubAllGlobals());
  afterAll(async () => {
    await e?.cerrar();
  });

  it("empresa sin configurar: error de negocio claro, en calcular y en crear", async () => {
    const sin = como(rindeSin, "supervisor", tenantSin);
    const r = await sin("rendiciones.kilometraje.calcular", viaje());
    expect(r).toMatchObject({ ok: false, error: { message: "Tu empresa aún no configura el kilometraje" } });
    const c = await rindeA("rendiciones.kilometraje.calcular", viaje());
    expect(c).toMatchObject({ ok: false, error: { message: "Tu empresa aún no configura el kilometraje" } });
  });

  it("solo quien tiene rendiciones:config.manage configura el kilometraje", async () => {
    const r = await rindeA("core.config.set", { modulo: "rendiciones", clave: "km_metodo", valor: "consumo" });
    expect(r).toMatchObject({ ok: false });
  });

  it("consumo: calcular y crear guardan lo mismo, con instantánea; el monto del cliente se ignora", async () => {
    await config("km_metodo", "consumo");
    await config("km_rendimiento_km_l", 10);
    await config("km_precio_litro_clp", 1500);
    await config("km_recargo_desgaste_pct", 10);
    const calc = await dato<{ km: number; kmEfectivos: number; origenDistancia: string; montoClp: number; desglose: { concepto: string; montoClp: number }[] }>(
      await rindeA("rendiciones.kilometraje.calcular", viaje({ peajeClp: 2000 })),
    );
    expect(calc.origenDistancia).toBe("linea_recta");
    expect(calc.desglose.map((l) => l.concepto)).toEqual(["Combustible", "Desgaste del vehículo", "Peaje"]);
    const trampa = { ...cuerpo({ viaje: { ...viaje({ peajeClp: 2000 }), monto: 1, montoClp: 1 } }), montoTotal: 1, items: [{ fecha: "2026-11-02", proveedor: "X", descripcion: "X", monto: 1, sinRespaldoMotivo: "trampa" }] };
    const creada = await dato<{ id: string; montoTotal: number; kilometraje: { montoClp: number } }>(await rindeA("rendiciones.rendiciones.crear", trampa));
    expect(creada.montoTotal).toBe(calc.montoClp);
    expect(creada.kilometraje.montoClp).toBe(calc.montoClp);
    const fila = await e.admin.rendicion.findUniqueOrThrow({ where: { id: creada.id }, include: { viaje: true, items: true } });
    expect(fila).toMatchObject({ tipo: "kilometraje", montoTotal: calc.montoClp });
    expect(fila.items).toHaveLength(1);
    expect(fila.items[0]?.monto).toBe(calc.montoClp);
    expect(fila.viaje).toMatchObject({ metodo: "consumo", origenDistancia: "linea_recta", montoCalculado: calc.montoClp, peajeClp: 2000, tenantId: tenantA });
    expect(fila.viaje?.configSnapshot).toMatchObject({ config: { metodo: "consumo", precioLitroClp: 1500, recargoPct: 100_000 } });
    // Cambiar la configuración después no recalcula el viaje guardado (instantánea).
    await config("km_precio_litro_clp", 2000);
    const despues = await e.admin.rendicionViaje.findUniqueOrThrow({ where: { rendicionId: creada.id } });
    expect(despues.montoCalculado).toBe(calc.montoClp);
    await config("km_precio_litro_clp", 1500);
  });

  it("tarifa por km y tramo fijo", async () => {
    await config("km_metodo", "tarifa_km");
    await config("km_tarifa_por_km_clp", 250);
    const t = await dato<{ km: number; montoClp: number }>(await rindeA("rendiciones.kilometraje.calcular", viaje()));
    expect(t.montoClp).toBe(Math.round(t.km * 250));
    const ida = await dato<{ montoClp: number }>(await rindeA("rendiciones.kilometraje.calcular", viaje({ idaYVuelta: true })));
    expect(ida.montoClp).toBe(Math.round(t.km * 2 * 250));
    await config("km_metodo", "tramo_fijo");
    await config("km_tramos", [{ nombre: "Santiago–Rancagua", montoClp: 18_000 }]);
    expect(await rindeA("rendiciones.kilometraje.calcular", viaje())).toMatchObject({ ok: false });
    const f = await dato<{ montoClp: number }>(await rindeA("rendiciones.kilometraje.calcular", viaje({ tramo: "Santiago–Rancagua", peajeClp: 500 })));
    expect(f.montoClp).toBe(18_500);
    const g = await dato<{ id: string; montoTotal: number }>(await crear({ viaje: viaje({ tramo: "Santiago–Rancagua" }) }));
    expect(g.montoTotal).toBe(18_000);
    expect(await crear({ viaje: viaje({ tramo: "Inventado" }) })).toMatchObject({ ok: false });
  });

  it("actualizar recalcula en el servidor; enviar y aprobar siguen igual", async () => {
    await config("km_metodo", "tarifa_km");
    const c = await dato<{ id: string; montoTotal: number }>(await crear());
    const act = await dato<{ montoTotal: number }>(
      await rindeA("rendiciones.rendiciones.actualizar", { ...cuerpo({ viaje: viaje({ peajeClp: 1000 }) }), id: c.id, monto: 999 }),
    );
    expect(act.montoTotal).toBe(c.montoTotal + 1000);
    expect((await e.admin.rendicionViaje.count({ where: { rendicionId: c.id } }))).toBe(1);
    expect(await rindeA("rendiciones.rendiciones.actualizar", { ...cuerpo({ tipo: "compra", viaje: undefined }), id: c.id })).toMatchObject({ ok: false });
    expect(await rindeA("rendiciones.rendiciones.enviar", { id: c.id })).toMatchObject({ ok: true });
    const jefe = como(aprueba, "gerente", tenantA);
    expect(await jefe("rendiciones.rendiciones.aprobar", { id: c.id })).toMatchObject({ ok: true });
    const vista = await dato<{ rendicion: { tipo: string; viaje: { km: number; origenDistancia: string; montoCalculado: number } } }>(
      await rindeA("rendiciones.rendiciones.obtener", { id: c.id }),
    );
    expect(vista.rendicion).toMatchObject({ tipo: "kilometraje", viaje: { origenDistancia: "linea_recta", montoCalculado: act.montoTotal } });
  });

  it("vista previa (dryRun) no escribe; km inválido o fecha futura se rechazan", async () => {
    const antes = await e.admin.rendicion.count({ where: { tenantId: tenantA } });
    const vb = await e.admin.rendicionViaje.count({ where: { tenantId: tenantA } });
    expect(await crear(), "sanity").toMatchObject({ ok: true });
    const previo = await rindeA("rendiciones.rendiciones.crear", cuerpo(), { dryRun: true });
    expect(previo).toMatchObject({ ok: true, data: { kilometraje: { metodo: "tarifa_km" } } });
    expect(await e.admin.rendicion.count({ where: { tenantId: tenantA } })).toBe(antes + 1);
    expect(await e.admin.rendicionViaje.count({ where: { tenantId: tenantA } })).toBe(vb + 1);
    expect(await crear({ viaje: viaje({ destino: STGO }) })).toMatchObject({ ok: false }); // mismo punto: 0 km
    expect(await crear({ viaje: viaje({ fecha: "2999-01-01" }) })).toMatchObject({ ok: false });
  });

  it("con Google mide una consulta geo.ruta; si Google falla cae a línea recta sin consumir", async () => {
    process.env["GOOGLE_MAPS_SERVER_KEY"] = "clave-de-plataforma";
    try {
      vi.stubGlobal("fetch", vi.fn(async () => Response.json({ routes: [{ distanceMeters: 100_000 }] })));
      usos.length = 0;
      const g = await dato<{ km: number; origenDistancia: string; montoClp: number }>(await rindeA("rendiciones.kilometraje.calcular", viaje()));
      expect(g).toMatchObject({ km: 100, origenDistancia: "google", montoClp: 25_000 });
      expect(usos.filter((u) => u.recurso === "geo.ruta")).toHaveLength(1);
      vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 403 })));
      usos.length = 0;
      expect(await dato<{ origenDistancia: string }>(await rindeA("rendiciones.kilometraje.calcular", viaje()))).toMatchObject({ origenDistancia: "linea_recta" });
      expect(usos.filter((u) => u.recurso === "geo.ruta")).toHaveLength(0);
    } finally {
      delete process.env["GOOGLE_MAPS_SERVER_KEY"];
    }
  });

  it("aislamiento: otra empresa no ve ni toca el viaje; la base tampoco deja cruzar empresas", async () => {
    const c = await dato<{ id: string }>(await crear());
    const deB = como(ajeno, "gerente", tenantB);
    expect(await deB("rendiciones.rendiciones.obtener", { id: c.id })).toMatchObject({ ok: false });
    expect(await deB("rendiciones.rendiciones.actualizar", { ...cuerpo({ instalacionId: undefined, centroCosto: "administracion" }), id: c.id })).toMatchObject({ ok: false });
    const viajeA = await e.admin.rendicionViaje.findUniqueOrThrow({ where: { rendicionId: c.id } });
    await expect(
      e.admin.rendicionViaje.create({ data: { ...viajeA, id: randomUUID(), configSnapshot: {}, tenantId: tenantB } }),
    ).rejects.toThrow();
  });
});
