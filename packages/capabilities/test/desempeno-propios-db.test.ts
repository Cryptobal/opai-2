// CAR-313 · Indicadores propios de la empresa contra Postgres real (rol sin BYPASSRLS): se arman
// sobre hechos declarados por los módulos, se ven con datos reales antes de publicar, entran a un
// scorecard y ninguna empresa ve los de otra.
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { sembrarComercial } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { ajustesComercial } from "../src/comercial";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { codigo, dato } from "./maestros-ayuda";

describe.skipIf(!urlPropietario)("desempeño · indicadores propios en base real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let ana = "";
  let bea = "";
  let cargo = "";
  let personaAna = "";
  let propio = "";
  const sufijo = randomUUID().slice(0, 8);
  const GUARDAR = "desempeno.propios.guardar";
  type Guardado = {
    indicador: { id: string; indicador: string; unidad: string; estado: string; vigenteDesde: string };
    vistaPrevia: { sujetos: number; minimo: number | null; maximo: number | null; promedio: number | null };
  };

  const ctx = (tenantId: string, modulosActivos = ["comercial", "desempeno"]) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: ana },
      usuario: { id: ana, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos,
    });
  const ventasConCotizacion = {
    nombre: "Ventas con cotización",
    sentido: "mayor",
    metaSugerida: 1_000_000,
    definicion: {
      forma: "sumar",
      hecho: "comercial.negocio_ganado",
      monto: "valor_mensual",
      filtros: { con_cotizacion: ["si"] },
    },
  };

  async function empresa(slug: string) {
    const t = await e.admin.tenant.create({
      data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" },
    });
    await sembrarComercial(e.admin.$extends({}), t.id);
    for (const userId of [ana, bea]) {
      await e.admin.membership.create({
        data: { tenantId: t.id, userId, rol: "owner", portales: ["erp"] },
      });
    }
    return t.id;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarModulos();
    mod.limpiarRegistro();
    registrarModulos([
      defineModule({
        id: "comercial",
        nombre: "Comercial",
        version: "0.1.0",
        dependencias: [],
        permisos: [
          { id: "comercial:negocios.read", descripcion: "Ver negocios" },
          { id: "comercial:solicitudes.read", descripcion: "Ver solicitudes" },
        ],
        navegacion: [],
        configuracion: ajustesComercial,
        eventos: [],
        capacidades: [],
        hechos: mod.hechosComercial,
      }),
    ]);
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesDesempeno]);
    const usuario = (nombre: string) =>
      e.admin.user
        .create({ data: { name: nombre, email: `${nombre}-${sufijo}@prueba.cl`, emailVerified: true } })
        .then((u) => u.id);
    ana = await usuario("ana");
    bea = await usuario("bea");
    a = await empresa(`prop-a-${sufijo}`);
    b = await empresa(`prop-b-${sufijo}`);
    const cuenta = await e.admin.cuenta.create({ data: { tenantId: a, nombre: "Cuenta A" } });
    const ganada = await e.admin.etapa.findFirst({ where: { tenantId: a, tipo: "ganada" } });
    const negocio = (responsableId: string, monto: number, cotizado: boolean) =>
      e.admin.negocio.create({
        data: {
          tenantId: a,
          cuentaId: cuenta.id,
          embudoId: ganada?.embudoId ?? "",
          etapaId: ganada?.id ?? "",
          titulo: "Negocio ganado",
          responsableId,
          valorMensual: monto,
          ganadoEn: new Date("2026-10-10T15:00:00Z"),
          cotizacionEnviadaEn: cotizado ? new Date("2026-10-02T12:00:00Z") : null,
        },
      });
    await negocio(ana, 1_000_000, true);
    await negocio(ana, 500_000, false);
    await negocio(bea, 300_000, true);
    await e.admin.solicitud.create({
      data: {
        tenantId: a,
        canal: "manual",
        estado: "en_revision",
        textoOriginal: "Solicitud de prueba",
        registradaPorTipo: "usuario",
        responsableId: ana,
        createdAt: new Date("2026-09-30T12:00:00Z"),
        primeraRespuestaEn: new Date("2026-10-01T12:00:00Z"),
      },
    });
    cargo = (await e.admin.cargo.create({ data: { tenantId: a, nombre: "Vendedor" } })).id;
    personaAna = (
      await e.admin.persona.create({
        data: { tenantId: a, nombres: "Ana", apellidos: "Prueba", rut: "30000001-k", usuarioId: ana },
      })
    ).id;
    await e.admin.vinculoLaboral.create({
      data: {
        tenantId: a,
        personaId: personaAna,
        cargoId: cargo,
        tipo: "indefinido",
        inicio: new Date("2026-01-01"),
      },
    });
  });
  afterAll(async () => {
    limpiarModulos();
    await e?.cerrar();
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-20T15:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("ofrece solo los hechos de los módulos activos", async () => {
    const ids = async (c: ReturnType<typeof ctx>) =>
      (await dato<{ id: string }[]>(c, "desempeno.hechos.list", {})).map((h) => h.id);
    expect(await ids(ctx(a))).toEqual(
      expect.arrayContaining(["core.tarea_completada", "comercial.negocio_ganado", "comercial.solicitud_atendida"]),
    );
    expect((await ids(ctx(a, ["desempeno"]))).some((id) => id.startsWith("comercial."))).toBe(false);
  });

  it("la vista previa usa datos reales y no guarda nada; después se publica", async () => {
    const previa = await dato<Guardado>(ctx(a), GUARDAR, ventasConCotizacion, { dryRun: true });
    // Dos sujetos: dice cuántos, pero no resume (mínimo y máximo serían el valor de cada uno).
    expect(previa.vistaPrevia).toEqual({
      periodo: "2026-10",
      sujetos: 2,
      minimo: null,
      maximo: null,
      promedio: null,
    });
    expect(previa.indicador.unidad).toBe("clp");
    expect(await e.admin.desempenoIndicadorPropio.count({ where: { tenantId: a } })).toBe(0);
    const publicado = await dato<Guardado>(ctx(a), GUARDAR, { ...ventasConCotizacion, publicar: true });
    expect(publicado.indicador).toMatchObject({ estado: "publicado", vigenteDesde: "2026-10" });
    propio = publicado.indicador.id;
    const repetido = { ...ventasConCotizacion, nombre: "ventas CON cotización" };
    expect(await codigo(ctx(a), GUARDAR, repetido)).toBe("CONFLICT");
  });

  it("rechaza definiciones sobre hechos que no existen, apagados o mal combinados", async () => {
    const con = (definicion: unknown) => ({ ...ventasConCotizacion, nombre: "Otro", definicion });
    expect(await codigo(ctx(a), GUARDAR, con({ forma: "contar", hecho: "no.existe" }))).toBe("UNPROCESSABLE");
    const sinComercial = ctx(a, ["desempeno"]);
    expect(await codigo(sinComercial, GUARDAR, ventasConCotizacion)).toBe("UNPROCESSABLE");
    const mezcla = {
      forma: "tiempo",
      desde: { hecho: "comercial.solicitud_recibida" },
      hasta: { hecho: "comercial.negocio_ganado" },
      unidad: "horas",
    };
    expect(await codigo(ctx(a), GUARDAR, con(mezcla))).toBe("UNPROCESSABLE");
  });

  it("mide el tiempo entre dos hechos aunque el inicio sea del mes anterior", async () => {
    const r = await dato<Guardado>(
      ctx(a),
      GUARDAR,
      {
        nombre: "Horas hasta atender",
        sentido: "menor",
        metaSugerida: 24,
        definicion: {
          forma: "tiempo",
          desde: { hecho: "comercial.solicitud_recibida" },
          hasta: { hecho: "comercial.solicitud_atendida" },
          unidad: "horas",
        },
      },
      { dryRun: true },
    );
    expect(r.vistaPrevia).toMatchObject({ sujetos: 1, promedio: null });
  });

  it("un indicador propio publicado entra al scorecard, da resultado y no se archiva mientras se usa", async () => {
    await dato(ctx(a), "desempeno.scorecards.guardar", {
      cargoId: cargo,
      indicadores: [{ indicador: `propio.${propio}`, meta: 1_000_000, peso: 100 }],
      publicar: true,
    });
    const r = await dato<{ puntaje: number; indicadores: { nombre: string; valor: number }[] }>(
      ctx(a),
      "desempeno.resultados.ver_persona",
      { personaId: personaAna },
    );
    expect(r.puntaje).toBe(100);
    expect(r.indicadores[0]).toMatchObject({ nombre: "Ventas con cotización", valor: 1_000_000 });
    expect(await codigo(ctx(a), "desempeno.propios.archivar", { id: propio })).toBe("UNPROCESSABLE");
    // Un borrador que invierte el sentido no toca el indicador publicado ni el resultado del mes.
    const invertido = { ...ventasConCotizacion, id: propio, nombre: "Otro nombre", sentido: "menor" };
    const pendiente = await dato<Guardado>(ctx(a), GUARDAR, invertido);
    expect(pendiente.indicador).toMatchObject({ estado: "borrador", vigenteDesde: "2026-11" });
    const igual = await dato<typeof r>(ctx(a), "desempeno.resultados.ver_persona", { personaId: personaAna });
    expect(igual.puntaje).toBe(100);
    expect(igual.indicadores[0]?.nombre).toBe("Ventas con cotización");
    // Con Comercial apagado el indicador deja de estar disponible: sin dato, no un cero.
    const apagado = await dato<{ puntaje: number | null; indicadores: { disponible: boolean }[] }>(
      ctx(a, ["desempeno"]),
      "desempeno.resultados.ver_persona",
      { personaId: personaAna },
    );
    expect(apagado).toMatchObject({ puntaje: null, indicadores: [{ disponible: false }] });
    const borrador = { cargoId: cargo, indicadores: [{ indicador: "propio.no-existe", meta: 1, peso: 100 }] };
    expect(await codigo(ctx(a), "desempeno.scorecards.guardar", borrador)).toBe("UNPROCESSABLE");
  });

  it("otra empresa no ve ni puede tocar los indicadores propios de esta", async () => {
    expect(await dato<unknown[]>(ctx(b), "desempeno.propios.list", {})).toEqual([]);
    const ajeno = { ...ventasConCotizacion, id: propio, nombre: "Ajeno" };
    expect(await codigo(ctx(b), GUARDAR, ajeno)).toBe("NOT_FOUND");
    expect(await codigo(ctx(b), "desempeno.propios.archivar", { id: propio })).toBe("NOT_FOUND");
    const previaB = await dato<Guardado>(ctx(b), GUARDAR, ventasConCotizacion, { dryRun: true });
    expect(previaB.vistaPrevia.sujetos).toBe(0);
  });
});
