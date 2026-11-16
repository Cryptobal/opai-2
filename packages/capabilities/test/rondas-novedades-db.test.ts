// CAR-78 · E5a y CAR-77: novedades de ronda por la cola hacia el libro del núcleo, contra Postgres real con dos
// empresas: gravedad por defecto del tipo, enlace a ronda y punto, equipo y hora del hecho, número NOV correlativo,
// evento de la grave, rechazos (punto o tipo ajeno, módulo inactivo) e idempotencia. La lectura del libro se prueba
// en libro-novedades-db.test.ts.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Res = { clave: string; estado: string; motivo: string | null };

describe.skipIf(!urlPropietario)("novedades de ronda en base real (CAR-78 E5a)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const disp = { A: "", B: "" };
  let puntoA = "";
  let puntoB = "";
  let tipoAltaA = "";
  let tipoB = "";
  let plantillaA = "";

  const recibir = async (k: "A" | "B", hechos: unknown[], modulos: string[] = ["rondas"]) => {
    const ctx = mod.crearContexto({
      tenantId: t[k],
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor: { registrar: async () => undefined },
      modulosActivos: modulos,
    });
    const r = await mod.executeCapability(ctx, "core.hechos_terreno.recibir", {
      dispositivoId: disp[k],
      horaEnvio: new Date().toISOString(),
      hechos,
    });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return (r.data as { resultados: Res[] }).resultados;
  };
  const hecho = (tipo: string, payload: object) => ({
    clave: randomUUID(),
    tipo,
    payload,
    horaHecho: new Date(Date.now() - 30_000).toISOString(),
  });
  const novedad = (p: object) => hecho("rondas.novedad", { resumen: "Puerta abierta", ...p });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `rn-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
      const cuentaId = (
        await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: `Cliente ${k}` } })
      ).id;
      inst[k] = (
        await e.admin.instalacion.create({
          data: { tenantId: t[k], cuentaId, nombre: `Planta ${k}` },
        })
      ).id;
      disp[k] = (
        await e.admin.dispositivo.create({
          data: {
            tenantId: t[k],
            instalacionId: inst[k],
            identificador: "DSP-1",
            estado: "activo",
            tokenHash: `h-${s}-${k}`,
          },
        })
      ).id;
      const p = await e.admin.puntoControl.create({
        data: { tenantId: t[k], instalacionId: inst[k], nombre: `P ${k}`, modo: "gps" },
      });
      if (k === "A") puntoA = p.id;
      else puntoB = p.id;
    }
    tipoAltaA = (
      await e.admin.tipoIncidente.create({
        data: { tenantId: t.A, nombre: "Intrusión", gravedadDefecto: "alta" },
      })
    ).id;
    tipoB = (await e.admin.tipoIncidente.create({ data: { tenantId: t.B, nombre: "Daño" } })).id;
    plantillaA = (
      await e.admin.plantillaRonda.create({
        data: { tenantId: t.A, instalacionId: inst.A, nombre: "R", tiempoMaxMin: 60 },
      })
    ).id;
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar?.();
  });

  const filas = (k: "A" | "B") =>
    e.admin.libroNovedad.findMany({ where: { tenantId: t[k] }, orderBy: { numero: "asc" } });

  it("guarda la novedad con la gravedad del tipo, el punto y la ronda del lote", async () => {
    const i = hecho("rondas.inicio", { plantillaId: plantillaA });
    const n = novedad({ tipoIncidenteId: tipoAltaA, puntoId: puntoA, ejecucionClave: i.clave });
    const r = await recibir("A", [i, n]);
    expect(r.map((x) => x.estado)).toEqual(["recibido", "recibido"]);
    const f = (await filas("A")).find((x) => x.idempotencyKey === n.clave);
    expect(f).toMatchObject({
      gravedad: "alta",
      origen: "punto",
      modulo: "rondas",
      puntoId: puntoA,
      estado: "abierta",
      dispositivoId: disp.A,
      numero: 1,
    });
    // Hora del hecho (hace ~30 s en el equipo), no la de recepción.
    expect(Date.now() - (f?.horaHecho.getTime() ?? 0)).toBeGreaterThan(20_000);
    // La tabla temporal de Rondas ya no recibe escrituras.
    expect(await e.admin.novedad.count({ where: { tenantId: t.A } })).toBe(0);
    const ej = await e.admin.ejecucionRonda.findFirst({ where: { clave: i.clave } });
    expect(f?.ejecucionId).toBe(ej?.id);
  });

  it("la gravedad enviada manda sobre la del tipo; sin tipo es media; reenviar no duplica", async () => {
    const a = novedad({ gravedad: "baja", tipoIncidenteId: tipoAltaA });
    const b = novedad({});
    await recibir("A", [a, b]);
    await recibir("A", [a, b]);
    const f = await filas("A");
    expect(f.filter((x) => x.idempotencyKey === a.clave)).toHaveLength(1);
    expect(f.find((x) => x.idempotencyKey === a.clave)?.gravedad).toBe("baja");
    const sinTipo = f.find((x) => x.idempotencyKey === b.clave);
    expect(sinTipo).toMatchObject({ gravedad: "media", origen: "manual" });
    expect(f.map((x) => x.numero)).toEqual(f.map((_, i) => i + 1));
  });

  it("una novedad grave emite rondas.novedad.grave una sola vez, aunque se reenvíe", async () => {
    const g = novedad({ gravedad: "alta" });
    await recibir("A", [g]);
    await recibir("A", [g]);
    const id = (await filas("A")).find((x) => x.idempotencyKey === g.clave)?.id ?? "";
    const ev = await e.admin.evento.findMany({
      where: { tenantId: t.A, tipo: "rondas.novedad.grave", entidadId: id },
    });
    expect(ev).toHaveLength(1);
  });

  it("si la novedad ya está en el libro (carrera entre dos envíos), no se duplica ni se reemite el evento", async () => {
    const g = novedad({ gravedad: "alta" });
    // La otra petición ganó la carrera y ya escribió la fila, pero este hecho aún no está en la cola del servidor.
    await e.admin.libroNovedad.create({
      data: {
        tenantId: t.A,
        instalacionId: inst.A,
        resumen: "ganó",
        gravedad: "alta",
        idempotencyKey: g.clave,
      },
    });
    expect((await recibir("A", [g]))[0]?.estado).toBe("recibido");
    const f = (await filas("A")).filter((x) => x.idempotencyKey === g.clave);
    expect(f).toHaveLength(1);
    const ev = await e.admin.evento.count({
      where: { tenantId: t.A, tipo: "rondas.novedad.grave", entidadId: f[0]?.id ?? "" },
    });
    expect(ev).toBe(0);
  });

  it("rechaza el punto o el tipo de otra empresa y no escribe nada", async () => {
    const antes = (await filas("A")).length;
    const r = await recibir("A", [
      novedad({ puntoId: puntoB }),
      novedad({ tipoIncidenteId: tipoB }),
    ]);
    expect(r.map((x) => x.motivo)).toEqual(["punto_invalido", "tipo_incidente_invalido"]);
    expect(await filas("A")).toHaveLength(antes);
    expect(await filas("B")).toHaveLength(0);
  });

  it("sin el módulo Rondas activo se rechaza; una ronda desconocida no pierde la novedad", async () => {
    const r = await recibir("A", [novedad({})], ["acceso"]);
    expect(r[0]?.motivo).toBe("modulo_inactivo");
    const n = novedad({ ejecucionClave: randomUUID() });
    expect((await recibir("A", [n]))[0]?.estado).toBe("recibido");
    const f = (await filas("A")).find((x) => x.idempotencyKey === n.clave);
    expect(f?.ejecucionId).toBeNull();
  });

  it("no crea asistencia ni mezcla empresas; cada empresa numera desde 1", async () => {
    await recibir("B", [novedad({ puntoId: puntoB })]);
    expect(await filas("B")).toHaveLength(1);
    expect((await filas("B"))[0]).toMatchObject({ instalacionId: inst.B, numero: 1 });
  });
});
