// CAR-78 · E4b-2: entrada y salida de portería por la cola, contra Postgres real con dos empresas ficticias.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { digitoVerificador, momentoLocal, normalizarDocumento } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { huellaVigente } from "../src/acceso/huella";

import type * as ModuloCapacidades from "../src";

type Res = { clave: string; estado: string; motivo: string | null };
const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";
const RUN = "12.345.678-5";
const RUN2 = "11.111.111-1";

describe.skipIf(!urlPropietario)("ingesta de portería en base real (CAR-78 E4b-2)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const disp = { A: "", B: "" };

  const recibir = async (k: "A" | "B", hechos: unknown[], modulos: string[] = ["acceso"]) => {
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
    return r.ok ? (r.data as { resultados: Res[] }).resultados : r;
  };
  const entrada = (run = RUN, extra: Record<string, unknown> = {}) => ({
    clave: randomUUID(),
    tipo: "acceso.entrada",
    payload: {
      tipoRegistro: "visita",
      documento: { tipo: "run", numero: run },
      nombre: "Visita Ficticia",
      ...extra,
    },
    horaHecho: new Date(Date.now() - 30_000).toISOString(),
  });
  const salida = (entradaClave: string) => ({
    clave: randomUUID(),
    tipo: "acceso.salida",
    payload: { entradaClave },
    horaHecho: new Date(Date.now() - 10_000).toISOString(),
  });
  const lista = (
    k: "A" | "B",
    run: string,
    tipo: "autorizada" | "bloqueada",
    extra: Record<string, unknown> = {},
  ) => {
    const d = normalizarDocumento({ tipo: "run", numero: run });
    if (!d) throw new Error("doc");
    const h = huellaVigente({ tenantId: t[k], tipo: "run", clave: d.clave });
    return e.admin.entradaLista.create({
      data: {
        tenantId: t[k],
        instalacionId: inst[k],
        tipo,
        docTipo: "run",
        huella: h.huella,
        huellaKid: h.kid,
        mascara: d.mascara,
        ...extra,
      },
    });
  };

  beforeAll(async () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", CLAVE_PRUEBA);
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `ai-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
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
    }
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await e?.cerrar?.();
  });

  it("una entrada sin listas se registra con huella y máscara, nunca el número; el reintento no duplica", async () => {
    const h = entrada();
    expect(await recibir("A", [h])).toEqual([{ clave: h.clave, estado: "recibido", motivo: null }]);
    const f = await e.admin.registroAcceso.findFirstOrThrow({
      where: { tenantId: t.A, clave: h.clave },
    });
    expect(f).toMatchObject({
      docTipo: "run",
      mascara: "12.3••.•••-5",
      huellaKid: "v1",
      instalacionId: inst.A,
      nombre: "Visita Ficticia",
    });
    expect(JSON.stringify(f)).not.toContain("12345678");
    expect(((await recibir("A", [h])) as Res[])[0]?.estado).toBe("duplicado");
    expect(await e.admin.registroAcceso.count({ where: { clave: h.clave } })).toBe(1);
  });

  it("el bloqueo gana: queda un intento denegado y no hay registro; el hecho se guarda", async () => {
    await lista("A", RUN2, "bloqueada", { motivo: "Prueba" });
    const h = entrada(RUN2);
    expect(((await recibir("A", [h])) as Res[])[0]?.estado).toBe("recibido");
    expect(await e.admin.registroAcceso.count({ where: { clave: h.clave } })).toBe(0);
    expect(
      (await e.admin.intentoDenegado.findFirstOrThrow({ where: { clave: h.clave } })).motivo,
    ).toBe("bloqueado");
    expect(await e.admin.hechoTerreno.count({ where: { clave: h.clave } })).toBe(1);
  });

  it("la lista de una empresa no afecta a la otra (misma persona, huella distinta)", async () => {
    const h = entrada(RUN2);
    await recibir("B", [h]);
    expect(await e.admin.registroAcceso.count({ where: { tenantId: t.B, clave: h.clave } })).toBe(
      1,
    );
    expect(await e.forTenant(t.B).entradaLista.count()).toBe(0);
  });

  it("en modo solo autorizados entra quien está autorizado; el uso único se consume", async () => {
    await lista("B", RUN, "autorizada", { usoUnico: true });
    const dentro = entrada(RUN);
    const otro = entrada(RUN2);
    const segundo = entrada(RUN);
    const r = (await recibir("B", [dentro, otro, segundo])) as Res[];
    expect(r.map((x) => x.estado)).toEqual(["recibido", "recibido", "recibido"]);
    expect(await e.admin.registroAcceso.count({ where: { clave: dentro.clave } })).toBe(1);
    const motivo = async (c: string) =>
      (await e.admin.intentoDenegado.findFirst({ where: { clave: c } }))?.motivo;
    expect(await motivo(otro.clave)).toBe("fuera_de_lista");
    expect(await motivo(segundo.clave)).toBe("uso_unico_consumido");
  });

  it("la salida cierra su entrada, también si llega en el mismo lote; una segunda salida o una desconocida se rechaza", async () => {
    const en = entrada();
    const s1 = salida(en.clave);
    const r = (await recibir("A", [en, s1])) as Res[];
    expect(r.map((x) => x.estado)).toEqual(["recibido", "recibido"]);
    const reg = await e.admin.registroAcceso.findFirstOrThrow({
      where: { clave: en.clave },
      include: { salida: true },
    });
    expect(reg.salida?.clave).toBe(s1.clave);
    const r2 = (await recibir("A", [salida(en.clave), salida(randomUUID())])) as Res[];
    expect(r2.map((x) => x.motivo)).toEqual(["salida_repetida", "entrada_desconocida"]);
  });

  it("documento inválido y módulo inactivo se rechazan; una marca de acceso no es asistencia", async () => {
    const malo = entrada("12.345.678-9");
    expect(((await recibir("A", [malo])) as Res[])[0]?.motivo).toBe("documento_invalido");
    expect(((await recibir("A", [entrada()], [])) as Res[])[0]?.motivo).toBe("modulo_inactivo");
    expect(await e.admin.marca.count({ where: { tenantId: { in: [t.A, t.B] } } })).toBe(0);
  });

  it("sin la clave de huellas el lote falla cerrado y no se guarda nada", async () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", "");
    const h = entrada();
    const r = await recibir("A", [h]);
    expect(Array.isArray(r)).toBe(false);
    expect(await e.admin.hechoTerreno.count({ where: { clave: h.clave } })).toBe(0);
    vi.stubEnv("ACCESO_HUELLA_SECRET", CLAVE_PRUEBA);
  });

  it("los horarios de la lista se evalúan en la zona horaria de la empresa", async () => {
    const run = `13000000-${digitoVerificador("13000000")}`;
    const ahora = momentoLocal(new Date(), "America/Santiago").minutos;
    await lista("B", run, "autorizada", {
      desdeMin: Math.max(0, ahora - 120),
      hastaMin: Math.min(1439, ahora + 120),
    });
    const antes = entrada(run);
    expect(((await recibir("B", [antes])) as Res[])[0]?.estado).toBe("recibido");
    expect(await e.admin.registroAcceso.count({ where: { clave: antes.clave } })).toBe(1);
    await e.admin.tenant.update({ where: { id: t.B }, data: { timezone: "Pacific/Auckland" } });
    const despues = entrada(run);
    await recibir("B", [despues]);
    expect(
      (await e.admin.intentoDenegado.findFirstOrThrow({ where: { clave: despues.clave } })).motivo,
    ).toBe("fuera_de_horario");
    await e.admin.tenant.update({ where: { id: t.B }, data: { timezone: "America/Santiago" } });
  });

  it("la portería ve quién sigue en sitio de su instalación, con documento enmascarado, y no ve la otra empresa", async () => {
    const dentro = entrada(RUN, { nombre: "Visita En Sitio" });
    await recibir("A", [dentro]);
    const leer = async (k: "A" | "B", modulos: string[] = ["acceso"]) => {
      const ctx = mod.crearContexto({
        tenantId: t[k],
        actor: { tipo: "system" },
        rol: "owner",
        alcance: null,
        medidor: { registrar: async () => undefined },
        modulosActivos: modulos,
      });
      const r = await mod.executeCapability(ctx, "core.terreno.en_sitio", {
        dispositivoId: disp[k],
      });
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return r.data as {
        activo: boolean;
        items: { clave: string; nombre: string; documento: string }[];
      };
    };
    const a = await leer("A");
    expect(a.items.map((x) => x.clave)).toContain(dentro.clave);
    expect(JSON.stringify(a)).not.toContain("12345678");
    expect(a.items.find((x) => x.clave === dentro.clave)?.documento).toBe("12.3••.•••-5");
    expect((await recibir("A", [salida(dentro.clave)])) as Res[]).toHaveLength(1);
    expect((await leer("A")).items.map((x) => x.clave)).not.toContain(dentro.clave);
    expect(JSON.stringify(await leer("B"))).not.toContain(dentro.clave);
    expect(await leer("A", [])).toEqual({ activo: false, items: [] });
  });
});
