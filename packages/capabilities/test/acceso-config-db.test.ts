// CAR-479 parte 1: configuración de acceso por empresa e instalación contra Postgres real (rol sin BYPASSRLS).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { CONFIG_ACCESO_DEFECTO as D } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";
type K = "A" | "B";

describe.skipIf(!urlPropietario)("configuración de acceso en base real (CAR-479)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const disp = { A: "", B: "" };
  const ctx = (k: K) =>
    mod.crearContexto({
      tenantId: t[k],
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor: { registrar: async () => undefined },
      modulosActivos: ["acceso"],
    });
  const run = (k: K, id: string, input: unknown) => mod.executeCapability(ctx(k), id, input);
  const ok = async <T>(k: K, id: string, input: unknown): Promise<T> => {
    const r = await run(k, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };
  /** Una entrada por la portería de A; devuelve su clave. */
  async function entrada(payload: Record<string, unknown>): Promise<string> {
    const clave = randomUUID();
    await ok("A", "core.hechos_terreno.recibir", {
      dispositivoId: disp.A,
      horaEnvio: new Date().toISOString(),
      hechos: [
        {
          clave,
          tipo: "acceso.entrada",
          payload: { tipoRegistro: "visita", ...payload },
          horaHecho: new Date(Date.now() - 5_000).toISOString(),
        },
      ],
    });
    return clave;
  }
  const registro = (clave: string) =>
    e.forTenant(t.A).registroAcceso.findFirst({ where: { clave } });

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
          data: { slug: `cf-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: `C ${k}` } }))
        .id;
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
    }
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await e?.cerrar?.();
  });

  it("la instalación hereda la de la empresa, la reemplaza al personalizar y vuelve con null", async () => {
    await ok("A", "acceso.config.set", { config: { ...D, permanenciaMaxMin: 120 } });
    const hereda = await ok<{ personalizada: boolean; efectiva: typeof D }>(
      "A",
      "acceso.config.get",
      { instalacionId: inst.A },
    );
    expect(hereda).toMatchObject({ personalizada: false, efectiva: { permanenciaMaxMin: 120 } });
    await ok("A", "acceso.config.set", { instalacionId: inst.A, config: { ...D, cierreHora: 22 } });
    const propia = await ok<{ personalizada: boolean; efectiva: typeof D }>(
      "A",
      "acceso.config.get",
      { instalacionId: inst.A },
    );
    expect(propia).toMatchObject({
      personalizada: true,
      efectiva: { cierreHora: 22, permanenciaMaxMin: null },
    });
    await ok("A", "acceso.config.set", { instalacionId: inst.A, config: null });
    expect(
      (await ok<{ personalizada: boolean }>("A", "acceso.config.get", { instalacionId: inst.A }))
        .personalizada,
    ).toBe(false);
  });

  it("otra empresa no ve ni cambia la configuración de A; un formulario sin campos fijos se rechaza", async () => {
    expect(
      (await ok<{ efectiva: typeof D }>("B", "acceso.config.get", {})).efectiva.permanenciaMaxMin,
    ).toBeNull();
    expect((await run("B", "acceso.config.get", { instalacionId: inst.A })).ok).toBe(false);
    expect((await run("B", "acceso.config.set", { instalacionId: inst.A, config: D })).ok).toBe(
      false,
    );
    expect((await run("A", "acceso.config.set", { config: { ...D, campos: [] } })).ok).toBe(false);
    expect(await e.forTenant(t.B).configAcceso.count()).toBe(0);
  });

  it("la portería aplica «fuera de lista», «validar RUT» y guarda los campos propios", async () => {
    await ok("A", "acceso.listas.agregar", {
      instalacionId: inst.A,
      tipo: "autorizada",
      documento: { tipo: "run", numero: "11.111.111-1" },
    });
    const negada = await entrada({
      documento: { tipo: "run", numero: "12.345.678-5" },
      nombre: "Sin lista",
    });
    expect(await registro(negada)).toBeNull();
    expect(
      await e.forTenant(t.A).intentoDenegado.findFirst({ where: { clave: negada } }),
    ).toMatchObject({ motivo: "fuera_de_lista" });
    await ok("A", "acceso.config.set", {
      config: { ...D, permitirFueraDeLista: true, validarRut: false },
    });
    const campos = [{ etiqueta: "Departamento", valor: "301" }];
    const admitida = await entrada({
      documento: { tipo: "run", numero: "12.345.678-9" },
      nombre: "RUN mal escrito",
      campos,
    });
    const r = await registro(admitida);
    expect(r).toMatchObject({ docTipo: "otro", camposExtra: campos });
    expect(await ok<{ campos: unknown }>("A", "acceso.registros.get", { id: r?.id })).toMatchObject(
      { campos },
    );
    const sitio = await ok<{ config: typeof D }>("A", "core.terreno.en_sitio", {
      dispositivoId: disp.A,
    });
    expect(sitio.config.permitirFueraDeLista).toBe(true);
  });

  it("el cierre automático cierra a su hora solo las instalaciones que lo configuran", async () => {
    await ok("A", "acceso.config.set", {
      config: { ...D, permitirFueraDeLista: true, cierreHora: 7 },
    });
    const clave = await entrada({
      documento: { tipo: "run", numero: "12.345.678-5" },
      nombre: "Para cierre",
    });
    const id = (await registro(clave))?.id ?? "";
    await mod.trabajoCierreAutomatico.ejecutar(ctx("A"), { hora: "2027-01-16T06" });
    expect(await e.forTenant(t.A).salidaAcceso.count({ where: { registroId: id } })).toBe(0);
    expect(
      await mod.trabajoCierreAutomatico.ejecutar(ctx("A"), { hora: "2027-01-16T07" }),
    ).toMatchObject({ cerradas: expect.any(Number) });
    expect(
      await e.forTenant(t.A).salidaAcceso.findFirst({ where: { registroId: id } }),
    ).toMatchObject({ origen: "cierre" });
  });
});
