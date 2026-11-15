// CAR-553: fondo y mensaje de bienvenida de la portería por instalación contra Postgres real (rol sin BYPASSRLS).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { urlPropietario } from "../../db/test/entorno";
import { prepararAccesoAB } from "./acceso-entorno-a-b";

type Bienvenida = { mensaje: string | null; fondoId: string | null; color: string | null };

describe.skipIf(!urlPropietario)("bienvenida de la portería en base real (CAR-553)", () => {
  let x: Awaited<ReturnType<typeof prepararAccesoAB>>;
  const sitio = async () =>
    (
      await x.ok<{ bienvenida: Bienvenida }>("A", "core.terreno.en_sitio", {
        dispositivoId: x.disp.A,
      })
    ).bienvenida;
  async function imagen(instalacionId: string, mime = "image/png") {
    const id = (
      await x.e.admin.documento.create({
        data: {
          tenantId: x.t.A,
          nombre: "fondo.png",
          mime,
          tamano: 1_000,
          storageKey: `k-${randomUUID()}`,
          estado: "disponible",
          creadoPorTipo: "user",
        },
      })
    ).id;
    await x.e.admin.documentoVinculo.create({
      data: {
        tenantId: x.t.A,
        documentoId: id,
        entidadTipo: "instalacion",
        entidadId: instalacionId,
        rol: "propietario",
      },
    });
    return id;
  }

  beforeAll(async () => {
    x = await prepararAccesoAB();
    await x.e.admin.perfilEmpresa.create({
      data: { tenantId: x.t.A, nombreComercial: "Empresa Demo", colorPrimario: "#123456" },
    });
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await x?.e?.cerrar?.();
  });

  it("sin nada propio, la portería usa la marca de la empresa", async () => {
    expect(await sitio()).toMatchObject({
      mensaje: "Bienvenido a Empresa Demo",
      fondoId: null,
      color: "#123456",
    });
  });

  it("guarda mensaje y fondo de la instalación; la vista previa no escribe; null vuelve a la marca", async () => {
    const instalacionId = x.inst.A;
    const fondoDocumentoId = await imagen(instalacionId);
    const input = { instalacionId, mensaje: "Bienvenido, regístrate aquí", fondoDocumentoId };
    const vista = await x.mod.executeCapability(x.ctx("A"), "acceso.apariencia.set", input, {
      dryRun: true,
    });
    expect(vista).toMatchObject({ ok: true, data: { fondo: { id: fondoDocumentoId } } });
    expect(await x.e.forTenant(x.t.A).aparienciaAcceso.count()).toBe(0);
    await x.ok("A", "acceso.apariencia.set", input);
    expect(await x.ok("A", "acceso.apariencia.get", { instalacionId })).toEqual({
      mensaje: input.mensaje,
      fondo: { id: fondoDocumentoId, nombre: "fondo.png" },
    });
    expect(await sitio()).toMatchObject({ mensaje: input.mensaje, fondoId: fondoDocumentoId });
    await x.ok("A", "acceso.apariencia.set", {
      instalacionId,
      mensaje: null,
      fondoDocumentoId: null,
    });
    expect(await sitio()).toMatchObject({ mensaje: "Bienvenido a Empresa Demo", fondoId: null });
  });

  it("rechaza un fondo que no es imagen o es de otra instalación, y otra empresa no lee ni cambia", async () => {
    const instalacionId = x.inst.A;
    const pdf = await imagen(instalacionId, "application/pdf");
    const base = { instalacionId, mensaje: null };
    expect((await x.run("A", "acceso.apariencia.set", { ...base, fondoDocumentoId: pdf })).ok).toBe(
      false,
    );
    const otra = (await x.e.admin.instalacion.findUniqueOrThrow({ where: { id: instalacionId } }))
      .cuentaId;
    const inst2 = (
      await x.e.admin.instalacion.create({
        data: { tenantId: x.t.A, cuentaId: otra, nombre: "Otra" },
      })
    ).id;
    const deOtra = await imagen(inst2);
    expect(
      (await x.run("A", "acceso.apariencia.set", { ...base, fondoDocumentoId: deOtra })).ok,
    ).toBe(false);
    expect((await x.run("B", "acceso.apariencia.get", { instalacionId })).ok).toBe(false);
    const ajeno = await x.run("B", "acceso.apariencia.set", {
      instalacionId: x.inst.B,
      mensaje: null,
      fondoDocumentoId: deOtra,
    });
    expect(ajeno.ok).toBe(false);
    expect(await x.e.forTenant(x.t.B).aparienciaAcceso.count()).toBe(0);
  });
});
