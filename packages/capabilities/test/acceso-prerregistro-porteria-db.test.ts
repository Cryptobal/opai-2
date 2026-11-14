// CAR-478 parte 2: la portería usa el prerregistro (invitación QR o documento) contra Postgres real (dos empresas).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { diaEnZona } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";
type K = "A" | "B";
type Pre = { id: string; visitantes: { id: string }[]; dias: { dia: string; estado: string }[] };
const RUN = "12.345.678-5";

describe.skipIf(!urlPropietario)("prerregistro en la portería (CAR-478)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const disp = { A: "", B: "" };
  const hoy = diaEnZona(new Date(), "America/Santiago");
  const medidor = { registrar: async () => undefined };
  const ctx = (k: K) =>
    mod.crearContexto({
      tenantId: t[k],
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor,
      modulosActivos: ["acceso"],
    });
  const ok = async <T>(k: K, id: string, input: unknown): Promise<T> => {
    const r = await mod.executeCapability(ctx(k), id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };
  const prerregistrar = (k: K, nombre: string) =>
    ok<Pre>(k, "acceso.prerregistros.crear", {
      instalacionId: inst[k],
      visitantes: [{ nombre, documento: { tipo: "run", numero: RUN }, empresa: "Andes SpA" }],
      desde: hoy,
      anfitrion: "Marcela Rojas",
    });
  const codigo = async (k: K, visitanteId: string) =>
    (await ok<{ codigo: string }>(k, "acceso.prerregistros.invitacion", { visitanteId, dia: hoy }))
      .codigo;
  /** Envía una entrada por la cola del equipo y devuelve la respuesta completa del lote. */
  const entrar = (k: K, payload: Record<string, unknown>) => {
    const clave = randomUUID();
    return ok<unknown>(k, "core.hechos_terreno.recibir", {
      dispositivoId: disp[k],
      horaEnvio: new Date().toISOString(),
      hechos: [
        {
          clave,
          tipo: "acceso.entrada",
          payload: { tipoRegistro: "visita", ...payload },
          horaHecho: new Date(Date.now() - 5_000).toISOString(),
        },
      ],
    }).then((r) => ({ r: JSON.stringify(r), clave }));
  };
  const registroDe = (clave: string) => e.admin.registroAcceso.findFirst({ where: { clave } });

  beforeAll(async () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", CLAVE_PRUEBA);
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarCapacidades(mod.capacidadesAcceso);
    const s = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `pp-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: `C ${k}` } }))
        .id;
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
            tokenHash: `pp-${s}-${k}`,
          },
        })
      ).id;
    }
    // A tiene lista autorizada: «solo autorizados». Quien no está en ella necesita prerregistro.
    await ok("A", "acceso.listas.agregar", {
      instalacionId: inst.A,
      tipo: "autorizada",
      documento: { tipo: "run", numero: "11.111.111-1" },
    });
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await e?.cerrar?.();
  });

  it("con la invitación entra sin documento, una sola vez, y el día queda «Ingresó»", async () => {
    const p = await prerregistrar("A", "Camila Herrera");
    const v = p.visitantes[0]?.id ?? "";
    const esperados = await ok<{ items: { visitanteId: string; ingreso: boolean }[] }>(
      "A",
      "core.terreno.esperados",
      { dispositivoId: disp.A },
    );
    expect(esperados.items.find((x) => x.visitanteId === v)?.ingreso).toBe(false);
    const qr = await codigo("A", v);
    const uno = await entrar("A", { invitacion: qr, nombre: "Camila Herrera" });
    const reg = await registroDe(uno.clave);
    expect(reg?.mascara).toBe("12.3••.•••-5");
    expect(reg?.empresa).toBe("Andes SpA");
    expect(await e.admin.prerregistroUso.count({ where: { visitanteId: v } })).toBe(1);
    const dos = await entrar("A", { invitacion: qr, nombre: "Camila Herrera" });
    expect(dos.r).toContain("invitacion_invalida");
    expect(await registroDe(dos.clave)).toBeNull();
    const ficha = await ok<Pre>("A", "acceso.prerregistros.get", { id: p.id });
    expect(ficha.dias[0]?.estado).toBe("ingreso");
    const inv = await mod.executeCapability(ctx("A"), "acceso.prerregistros.invitacion", {
      visitanteId: v,
      dia: hoy,
    });
    expect(inv.ok).toBe(false);
  });

  it("con lista autorizada, el documento prerregistrado entra y otro no", async () => {
    const otroRun = "9.876.543-3";
    const sin = await entrar("A", {
      documento: { tipo: "run", numero: otroRun },
      nombre: "Sin lista",
    });
    expect(await registroDe(sin.clave)).toBeNull();
    expect(await e.admin.intentoDenegado.count({ where: { clave: sin.clave } })).toBe(1);
    const p = await ok<Pre>("A", "acceso.prerregistros.crear", {
      instalacionId: inst.A,
      visitantes: [{ nombre: "Con prerregistro", documento: { tipo: "run", numero: otroRun } }],
      desde: hoy,
      anfitrion: "Ana",
    });
    const con = await entrar("A", {
      documento: { tipo: "run", numero: otroRun },
      nombre: "Con prerregistro",
    });
    expect(await registroDe(con.clave)).not.toBeNull();
    expect(
      await e.admin.prerregistroUso.count({ where: { visitanteId: p.visitantes[0]?.id ?? "" } }),
    ).toBe(1);
  });

  it("una invitación de otra empresa, alterada o cancelada no sirve", async () => {
    const pB = await prerregistrar("B", "De B");
    const qrB = await codigo("B", pB.visitantes[0]?.id ?? "");
    expect((await entrar("A", { invitacion: qrB, nombre: "De B" })).r).toContain(
      "invitacion_invalida",
    );
    const p = await prerregistrar("A", "Alterada");
    const qr = await codigo("A", p.visitantes[0]?.id ?? "");
    const alterado = `${qr.slice(0, -1)}${qr.endsWith("A") ? "B" : "A"}`;
    expect((await entrar("A", { invitacion: alterado, nombre: "Alterada" })).r).toContain(
      "invitacion_invalida",
    );
    await ok("A", "acceso.prerregistros.cancelar", { id: p.id });
    expect((await entrar("A", { invitacion: qr, nombre: "Alterada" })).r).toContain(
      "invitacion_invalida",
    );
  });

  it("el bloqueo gana al prerregistro (R7)", async () => {
    const run = "15.555.555-6";
    await ok("A", "acceso.prerregistros.crear", {
      instalacionId: inst.A,
      visitantes: [{ nombre: "Bloqueado", documento: { tipo: "run", numero: run } }],
      desde: hoy,
      anfitrion: "Ana",
    });
    await ok("A", "acceso.listas.agregar", {
      instalacionId: inst.A,
      tipo: "bloqueada",
      documento: { tipo: "run", numero: run },
      motivo: "Prueba de bloqueo",
    });
    const x = await entrar("A", { documento: { tipo: "run", numero: run }, nombre: "Bloqueado" });
    expect(await registroDe(x.clave)).toBeNull();
    expect(
      (await e.admin.intentoDenegado.findFirstOrThrow({ where: { clave: x.clave } })).motivo,
    ).toBe("bloqueado");
  });
});
