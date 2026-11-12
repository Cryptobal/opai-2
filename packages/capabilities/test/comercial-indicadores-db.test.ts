// CAR-308 · Indicadores de gestión de Comercial contra Postgres real (rol sin BYPASSRLS): cada uno
// se calcula con los hechos del responsable en el mes y ninguna empresa ve los de la otra.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { ajustesComercial } from "../src/comercial";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { codigo, dato } from "./maestros-ayuda";

describe.skipIf(!urlPropietario)("comercial · indicadores de gestión en base real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let ana = "";
  let bea = "";
  const sufijo = randomUUID().slice(0, 8);
  const MEDIR = "core.indicadores_gestion.medir";
  type Salida = { mediciones: { sujetoId: string; valor: number | null; logro: number | null }[] };

  const ctx = (tenantId: string, extra: { modulosActivos?: string[] } = {}) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: ana },
      usuario: { id: ana, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: extra.modulosActivos ?? ["comercial"],
    });
  const medir = async (tenantId: string, indicador: string) =>
    new Map(
      (await dato<Salida>(ctx(tenantId), MEDIR, { indicador, periodo: "2026-10" })).mediciones.map(
        (m) => [m.sujetoId, m.valor],
      ),
    );

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
    const cuenta = await e.admin.cuenta.create({ data: { tenantId: t.id, nombre: `Cuenta ${slug}` } });
    const etapas = await e.admin.etapa.findMany({ where: { tenantId: t.id } });
    const etapa = (tipo: string) => etapas.find((x) => x.tipo === tipo);
    const negocio = (
      responsableId: string,
      tipo: "ganada" | "perdida" | "abierta",
      cerradoEn: string | null,
      monto: number,
      cotizado = true,
    ) =>
      e.admin.negocio.create({
        data: {
          tenantId: t.id,
          cuentaId: cuenta.id,
          embudoId: etapa(tipo)?.embudoId ?? "",
          etapaId: etapa(tipo)?.id ?? "",
          titulo: `Negocio ${tipo}`,
          responsableId,
          valorMensual: monto,
          cotizacionEnviadaEn: cotizado ? new Date("2026-10-02T12:00:00Z") : null,
          ganadoEn: tipo === "ganada" && cerradoEn ? new Date(cerradoEn) : null,
          perdidoEn: tipo === "perdida" && cerradoEn ? new Date(cerradoEn) : null,
        },
      });
    const solicitud = (responsableId: string, entra: string, atendida: string, duplicadaDeId?: string) =>
      e.admin.solicitud.create({
        data: {
          tenantId: t.id,
          canal: "manual",
          estado: "en_revision",
          textoOriginal: "Solicitud de prueba",
          registradaPorTipo: "usuario",
          responsableId,
          createdAt: new Date(entra),
          primeraRespuestaEn: new Date(atendida),
          ...(duplicadaDeId ? { duplicadaDeId } : {}),
        },
      });
    return { id: t.id, negocio, solicitud };
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
        indicadores: mod.indicadoresComercial,
      }),
    ]);
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const usuario = (nombre: string) =>
      e.admin.user
        .create({ data: { name: nombre, email: `${nombre}-${sufijo}@prueba.cl`, emailVerified: true } })
        .then((u) => u.id);
    ana = await usuario("ana");
    bea = await usuario("bea");
    const A = await empresa(`ind-com-a-${sufijo}`);
    const B = await empresa(`ind-com-b-${sufijo}`);
    a = A.id;
    b = B.id;
    // Empresa A, octubre: Ana gana 2 (1.000.000 + 500.000) y pierde 2; Bea gana 1 sin cotización.
    await A.negocio(ana, "ganada", "2026-10-10T15:00:00Z", 1_000_000);
    await A.negocio(ana, "ganada", "2026-10-20T15:00:00Z", 500_000);
    await A.negocio(ana, "perdida", "2026-10-21T15:00:00Z", 900_000);
    await A.negocio(ana, "perdida", "2026-10-22T15:00:00Z", 900_000);
    await A.negocio(ana, "abierta", null, 700_000);
    await A.negocio(ana, "ganada", "2026-11-02T15:00:00Z", 9_000_000);
    await A.negocio(bea, "ganada", "2026-10-15T15:00:00Z", 300_000, false);
    // Objetivo de la empresa A: 4 horas hábiles. Ana atiende una en 2 horas (a tiempo) y otra al día
    // siguiente (tarde). La duplicada, atendida al instante, no cuenta. Lunes 5 y martes 6 de octubre.
    const original = await A.solicitud(ana, "2026-10-05T13:00:00Z", "2026-10-05T15:00:00Z");
    await A.solicitud(ana, "2026-10-06T13:00:00Z", "2026-10-07T18:00:00Z");
    await A.solicitud(ana, "2026-10-06T13:00:00Z", "2026-10-06T13:01:00Z", original.id);
    // En la empresa B Ana atiende una, pero B no tiene tiempo objetivo configurado.
    await B.solicitud(ana, "2026-10-05T13:00:00Z", "2026-10-05T15:00:00Z");
    await dato(ctx(a), "core.config.set", {
      modulo: "comercial",
      clave: "solicitudes_primera_respuesta_horas",
      valor: 4,
    });
    // Empresa B, mismo mes y misma usuaria: no debe mezclarse.
    await B.negocio(ana, "ganada", "2026-10-10T15:00:00Z", 7_777_777);
  });
  afterAll(async () => {
    limpiarModulos();
    await e?.cerrar();
  });

  it("Comercial publica sus indicadores en el catálogo y un módulo apagado no los aporta", async () => {
    const ids = async (c: ReturnType<typeof ctx>) =>
      (await dato<{ id: string }[]>(c, "core.indicadores_gestion.catalogo", {})).map((i) => i.id);
    expect(await ids(ctx(a))).toEqual(
      expect.arrayContaining([
        "comercial.ventas_cerradas",
        "comercial.negocios_ganados",
        "comercial.cotizaciones_ganadas",
        "comercial.solicitudes_a_tiempo",
      ]),
    );
    const apagado = ctx(a, { modulosActivos: [] });
    expect((await ids(apagado)).some((id) => id.startsWith("comercial."))).toBe(false);
    const entrada = { indicador: "comercial.ventas_cerradas", periodo: "2026-10" };
    expect(await codigo(apagado, MEDIR, entrada)).toBe("NOT_FOUND");
  });

  it("ventas cerradas y negocios ganados: lo ganado en el mes por cada responsable", async () => {
    const ventas = await medir(a, "comercial.ventas_cerradas");
    expect(ventas.get(ana)).toBe(1_500_000);
    expect(ventas.get(bea)).toBe(300_000);
    const ganados = await medir(a, "comercial.negocios_ganados");
    expect([ganados.get(ana), ganados.get(bea)]).toEqual([2, 1]);
  });

  it("cotizaciones ganadas: de los cerrados con cotización enviada, el porcentaje ganado", async () => {
    const tasa = await medir(a, "comercial.cotizaciones_ganadas");
    expect(tasa.get(ana)).toBe(50);
    // El negocio de Bea no tuvo cotización enviada: no hay base, no un 0 %.
    expect(tasa.has(bea)).toBe(false);
  });

  it("solicitudes a tiempo: primera respuesta dentro del objetivo de la empresa, sin duplicadas", async () => {
    const aTiempo = await medir(a, "comercial.solicitudes_a_tiempo");
    expect(aTiempo.get(ana)).toBe(50);
    // Sin tiempo objetivo configurado no hay medición (no un 0 % ni un 100 %).
    expect([...(await medir(b, "comercial.solicitudes_a_tiempo"))]).toEqual([]);
  });

  it("otra empresa solo ve sus propios hechos", async () => {
    const ventas = await medir(b, "comercial.ventas_cerradas");
    expect([...ventas]).toEqual([[ana, 7_777_777]]);
  });
});
