// CAR-479 parte 1: configuración de acceso por empresa e instalación contra Postgres real (rol sin BYPASSRLS).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { CONFIG_ACCESO_DEFECTO as D } from "@opai/domain";

import { urlPropietario } from "../../db/test/entorno";
import { prepararAccesoAB } from "./acceso-entorno-a-b";

describe.skipIf(!urlPropietario)("configuración de acceso en base real (CAR-479)", () => {
  let x: Awaited<ReturnType<typeof prepararAccesoAB>>;
  const ok = <T>(...a: Parameters<typeof x.ok>) => x.ok<T>(...a);
  const run = (...a: Parameters<typeof x.run>) => x.run(...a);
  const entrada = (p: Record<string, unknown>) => x.entrada(p);
  const registro = (c: string) => x.registro(c);

  beforeAll(async () => {
    x = await prepararAccesoAB();
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await x?.e?.cerrar?.();
  });

  it("la instalación hereda la de la empresa, la reemplaza al personalizar y vuelve con null", async () => {
    await ok("A", "acceso.config.set", { config: { ...D, permanenciaMaxMin: 120 } });
    const hereda = await ok<{ personalizada: boolean; efectiva: typeof D }>(
      "A",
      "acceso.config.get",
      { instalacionId: x.inst.A },
    );
    expect(hereda).toMatchObject({ personalizada: false, efectiva: { permanenciaMaxMin: 120 } });
    await ok("A", "acceso.config.set", {
      instalacionId: x.inst.A,
      config: { ...D, cierreHora: 22 },
    });
    const propia = await ok<{ personalizada: boolean; efectiva: typeof D }>(
      "A",
      "acceso.config.get",
      { instalacionId: x.inst.A },
    );
    expect(propia).toMatchObject({
      personalizada: true,
      efectiva: { cierreHora: 22, permanenciaMaxMin: null },
    });
    await ok("A", "acceso.config.set", { instalacionId: x.inst.A, config: null });
    expect(
      (await ok<{ personalizada: boolean }>("A", "acceso.config.get", { instalacionId: x.inst.A }))
        .personalizada,
    ).toBe(false);
  });

  it("otra empresa no ve ni cambia la configuración de A; un formulario sin campos fijos se rechaza", async () => {
    expect(
      (await ok<{ efectiva: typeof D }>("B", "acceso.config.get", {})).efectiva.permanenciaMaxMin,
    ).toBeNull();
    expect((await run("B", "acceso.config.get", { instalacionId: x.inst.A })).ok).toBe(false);
    expect((await run("B", "acceso.config.set", { instalacionId: x.inst.A, config: D })).ok).toBe(
      false,
    );
    expect((await run("A", "acceso.config.set", { config: { ...D, campos: [] } })).ok).toBe(false);
    expect(await x.e.forTenant(x.t.B).configAcceso.count()).toBe(0);
  });

  it("la portería aplica «fuera de lista», «validar RUT» y guarda los campos propios", async () => {
    await ok("A", "acceso.listas.agregar", {
      instalacionId: x.inst.A,
      tipo: "autorizada",
      documento: { tipo: "run", numero: "11.111.111-1" },
    });
    const negada = await entrada({
      documento: { tipo: "run", numero: "12.345.678-5" },
      nombre: "Sin lista",
    });
    expect(await registro(negada)).toBeNull();
    expect(
      await x.e.forTenant(x.t.A).intentoDenegado.findFirst({ where: { clave: negada } }),
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
      dispositivoId: x.disp.A,
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
    await x.mod.trabajoCierreAutomatico.ejecutar(x.ctx("A"), { hora: "2027-01-16T06" });
    expect(await x.e.forTenant(x.t.A).salidaAcceso.count({ where: { registroId: id } })).toBe(0);
    expect(
      await x.mod.trabajoCierreAutomatico.ejecutar(x.ctx("A"), { hora: "2027-01-16T07" }),
    ).toMatchObject({ cerradas: expect.any(Number) });
    expect(
      await x.e.forTenant(x.t.A).salidaAcceso.findFirst({ where: { registroId: id } }),
    ).toMatchObject({ origen: "cierre" });
  });
});
