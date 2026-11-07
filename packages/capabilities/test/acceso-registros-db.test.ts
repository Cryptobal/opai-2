// CAR-78 · E4b: tablas de Control de acceso contra Postgres real con dos empresas ficticias. Aislamiento por RLS,
// huellas separadas por empresa, hechos de solo inserción, una sola salida por registro y nada de número completo.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { normalizarDocumento } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { huellaVigente } from "../src/acceso/huella";

const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";
const RUN = "12.345.678-5";

describe.skipIf(!urlPropietario)("acceso en base real (CAR-78 E4b)", () => {
  let e: Entorno;
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const disp = { A: "", B: "" };
  const huella = { A: "", B: "" };

  const fila = (k: "A" | "B", extra: Record<string, unknown> = {}) => ({
    tenantId: t[k],
    instalacionId: inst[k],
    dispositivoId: disp[k],
    clave: randomUUID(),
    tipoRegistro: "visita",
    docTipo: "run",
    huella: huella[k],
    huellaKid: "v1",
    mascara: "12.3••.•••-5",
    nombre: "Visita Ficticia",
    horaCorregida: new Date(),
    ...extra,
  });

  beforeAll(async () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", CLAVE_PRUEBA);
    e = await prepararEntorno();
    const s = randomUUID().slice(0, 8);
    const doc = normalizarDocumento({ tipo: "run", numero: RUN });
    if (!doc) throw new Error("documento de prueba");
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `ac-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
      const cuentaId = (
        await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: `Cliente ${k}` } })
      ).id;
      inst[k] = (
        await e.admin.instalacion.create({
          data: { tenantId: t[k], cuentaId, nombre: `Portería ${k}` },
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
      huella[k] = huellaVigente({ tenantId: t[k], tipo: "run", clave: doc.clave }).huella;
    }
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await e?.cerrar?.();
  });

  it("el mismo RUN en dos empresas produce huellas distintas", () => {
    expect(huella.A).not.toBe(huella.B);
    expect(huella.A).toMatch(/^[0-9a-f]{64}$/);
  });

  it("cada empresa ve solo sus registros, listas e intentos", async () => {
    const r = await e.forTenant(t.A).registroAcceso.create({ data: fila("A") });
    await e.forTenant(t.B).registroAcceso.create({ data: fila("B") });
    await e.forTenant(t.A).entradaLista.create({
      data: {
        tenantId: t.A,
        instalacionId: inst.A,
        tipo: "bloqueada",
        docTipo: "run",
        huella: huella.A,
        huellaKid: "v1",
        mascara: "12.3••.•••-5",
        motivo: "Prueba",
      },
    });
    await e.forTenant(t.A).intentoDenegado.create({
      data: {
        tenantId: t.A,
        instalacionId: inst.A,
        dispositivoId: disp.A,
        clave: randomUUID(),
        tipoRegistro: "visita",
        docTipo: "run",
        huella: huella.A,
        huellaKid: "v1",
        mascara: "12.3••.•••-5",
        motivo: "bloqueado",
        horaCorregida: new Date(),
      },
    });
    expect(await e.forTenant(t.A).registroAcceso.count()).toBe(1);
    expect(await e.forTenant(t.B).registroAcceso.count()).toBe(1);
    expect(await e.forTenant(t.B).entradaLista.count()).toBe(0);
    expect(await e.forTenant(t.B).intentoDenegado.count()).toBe(0);
    expect(await e.forTenant(t.B).registroAcceso.findFirst({ where: { id: r.id } })).toBeNull();
  });

  it("una fila de otra empresa o una huella apuntando a otro tenant no entra", async () => {
    await expect(
      e.forTenant(t.B).registroAcceso.create({ data: fila("A", { tenantId: t.B }) }),
    ).rejects.toThrow();
  });

  it("los registros, salidas e intentos son de solo inserción; hay una sola salida por registro", async () => {
    const r = await e.forTenant(t.A).registroAcceso.create({ data: fila("A") });
    await expect(
      e.forTenant(t.A).registroAcceso.update({ where: { id: r.id }, data: { nombre: "Otro" } }),
    ).rejects.toThrow();
    await expect(e.forTenant(t.A).registroAcceso.delete({ where: { id: r.id } })).rejects.toThrow();
    const salida = {
      tenantId: t.A,
      instalacionId: inst.A,
      dispositivoId: disp.A,
      registroId: r.id,
      horaCorregida: new Date(),
    };
    await e.forTenant(t.A).salidaAcceso.create({ data: { ...salida, clave: randomUUID() } });
    await expect(
      e.forTenant(t.A).salidaAcceso.create({ data: { ...salida, clave: randomUUID() } }),
    ).rejects.toThrow();
    await expect(
      e
        .forTenant(t.B)
        .salidaAcceso.create({
          data: {
            ...salida,
            tenantId: t.B,
            instalacionId: inst.B,
            dispositivoId: disp.B,
            clave: randomUUID(),
          },
        }),
    ).rejects.toThrow();
  });

  it("el mismo hecho reenviado (misma clave y dispositivo) no se duplica", async () => {
    const f = fila("A");
    await e.forTenant(t.A).registroAcceso.create({ data: f });
    await expect(e.forTenant(t.A).registroAcceso.create({ data: f })).rejects.toThrow();
  });

  it("ninguna columna guarda el número completo del documento", async () => {
    const filas = await e.admin.registroAcceso.findMany({
      where: { tenantId: { in: [t.A, t.B] } },
    });
    expect(JSON.stringify(filas)).not.toContain("12345678");
    expect(JSON.stringify(filas)).not.toContain("12.345.678");
  });
});
