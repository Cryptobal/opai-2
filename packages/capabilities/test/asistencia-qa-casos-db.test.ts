// CAR-89 · Los casos sintéticos del seed de QA (`scripts/asistencia-qa-casos.ts`) contra Postgres real: lo que la
// Pauta mensual muestra por celda coincide con lo esperado, rostro y RUT + PIN se ven igual y el reintento no duplica.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/asistencia/manifest";
import { type CASOS_QA } from "../scripts/asistencia-qa-casos";
import { prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type { Entorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("Casos sintéticos de Asistencia · Face ID (Postgres real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const previas = { ...process.env };
  let tenantId = "";
  let instalacionId = "";
  let sembrados: { caso: (typeof CASOS_QA)[number]; personaId: string; puestoId: string; fecha: string }[] = [];

  beforeAll(async () => {
    e = await prepararEntorno();
    // El seed usa dbAdmin(): lo apuntamos a la base de pruebas (propietario) como hace el script real.
    process.env["DATABASE_URL_MIGRATE"] = urlPropietario!;
    Object.assign(process.env, { OPAI_SECRETS_KEY: randomBytes(32).toString("base64"), OPAI_SECRETS_KEY_VERSION: "99" });
    mod = await import("../src");
    mod.limpiarRegistro(); mod.limpiarModulos();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesPauta]);
    mod.registrarModulos([manifest]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `qa-asis-${randomUUID().slice(0, 6)}`, nombre: "QA", vertical: "seguridad" } })).id;
    const { sembrarCasos } = await import("../scripts/asistencia-qa-sembrar");
    const r = await sembrarCasos(e.admin, tenantId);
    instalacionId = r.instalacionId;
    sembrados = r.casos;
  }, 120_000);
  afterAll(async () => {
    for (const k of ["OPAI_SECRETS_KEY", "OPAI_SECRETS_KEY_VERSION", "DATABASE_URL_MIGRATE"]) if (previas[k] === undefined) delete process.env[k]; else process.env[k] = previas[k];
    await e?.cerrar();
  });

  const erp = () => mod.crearContexto({ tenantId, actor: { tipo: "user", id: randomUUID() }, usuario: { id: randomUUID(), nombre: "RRHH", email: "rrhh@x.cl", platformRole: null }, portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: ["asistencia", "pauta"], medidor: { registrar: async () => undefined } });
  type Celda = { fecha: string; presencia?: { estado: string; personaId: string; entrada: string | null; salida: string | null; atrasoMin: number } };
  const celdas = async (anio: number, mes: number) => {
    const r = await mod.executeCapability(erp(), "pauta.mes.leer", { instalacionId, anio, mes });
    if (!r.ok) throw new Error(JSON.stringify(r));
    return (r.data as { puestos: { id: string; celdas: Celda[] }[] }).puestos;
  };

  it("cada caso muestra en la Pauta mensual la presencia esperada", async () => {
    const porMes = new Map<string, Awaited<ReturnType<typeof celdas>>>();
    for (const s of sembrados) {
      const [anio, mes] = s.fecha.split("-").map(Number) as [number, number];
      const k = `${anio}-${mes}`;
      if (!porMes.has(k)) porMes.set(k, await celdas(anio, mes));
      const celda = porMes.get(k)!.find((p) => p.id === s.puestoId)!.celdas.find((c) => c.fecha === s.fecha)!;
      expect(celda.presencia?.estado, `${s.caso.id}: ${JSON.stringify(celda.presencia)}`).toBe(s.caso.esperado);
      expect(celda.presencia?.personaId).toBe(s.personaId);
    }
  });

  it("rostro (QA-02) y RUT + PIN (QA-01) producen la misma lectura de presencia", async () => {
    const [q1, q2] = [sembrados[0]!, sembrados[1]!];
    const [anio, mes] = q1.fecha.split("-").map(Number) as [number, number];
    const p = await celdas(anio, mes);
    const lee = (s: typeof q1) => p.find((x) => x.id === s.puestoId)!.celdas.find((c) => c.fecha === s.fecha)!.presencia!;
    // Mismo estado y atraso; los instantes difieren solo en milisegundos porque cada marca lleva la hora del servidor.
    const [a, b] = [lee(q1), lee(q2)];
    expect({ estado: b.estado, atrasoMin: b.atrasoMin, conSalida: b.salida !== null }).toEqual({ estado: a.estado, atrasoMin: a.atrasoMin, conSalida: a.salida !== null });
    expect(Math.abs(Date.parse(b.entrada!) - Date.parse(a.entrada!))).toBeLessThan(5_000);
    const marca = await e.admin.marca.findFirstOrThrow({ where: { tenantId, personaId: q2.personaId }, orderBy: { seq: "asc" } });
    expect(marca).toMatchObject({ metodo: "rostro", pruebaVida: true });
  });

  it("la entrada tarde (QA-05) informa atraso y el reintento (QA-07) deja una marca por entrada y salida", async () => {
    const q5 = sembrados.find((s) => s.caso.id === "QA-05")!;
    const [anio, mes] = q5.fecha.split("-").map(Number) as [number, number];
    const p = await celdas(anio, mes);
    expect(p.find((x) => x.id === q5.puestoId)!.celdas.find((c) => c.fecha === q5.fecha)!.presencia!.atrasoMin).toBeGreaterThan(0);
    const q7 = sembrados.find((s) => s.caso.id === "QA-07")!;
    expect(await e.admin.marca.count({ where: { tenantId, personaId: q7.personaId } })).toBe(2);
  });
});
