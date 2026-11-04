import { z } from "zod";

import { defineCapability } from "../define";
import { aFecha, diaSchema, hoy } from "../core/maestros/comun";
import { PERMISO_READ } from "./comun";
import { montoMensual, porcentaje } from "./informes-calculo";

const MS_DIA = 86_400_000;
const hace = (dias: number) => new Date(Date.now() - dias * MS_DIA).toISOString().slice(0, 10);

const grupoSchema = z.object({
  clave: z.string().describe("aaaa-mm, id de responsable u origen (vacío si no tiene)."),
  etiqueta: z.string(),
  ganados: z.number().int(),
  perdidos: z.number().int(),
  tasaGanePct: z.number().int().describe("Ganados sobre cerrados (ganados + perdidos), 0–100."),
  montoGanadoMensualClp: z.number().int(),
  montoPerdidoMensualClp: z.number().int(),
});

type Acum = { g: number; p: number; mg: number; mp: number };

export const informesCierre = defineCapability({
  id: "comercial.informes.cierre",
  descripcion:
    "Informe de cierre comercial en un rango de fechas (por defecto los últimos 90 días): negocios ganados y perdidos, tasa de cierre y monto mensual ganado o perdido, agrupado por mes, responsable u origen, más el pipeline abierto de hoy.",
  permiso: PERMISO_READ,
  input: z.object({
    desde: diaSchema.optional().describe("Primer día (aaaa-mm-dd). Por defecto, hace 90 días."),
    hasta: diaSchema.optional().describe("Último día, inclusive (aaaa-mm-dd). Por defecto, hoy."),
    agruparPor: z.enum(["mes", "responsable", "origen"]).default("mes"),
  }),
  output: z.object({
    desde: z.string(),
    hasta: z.string(),
    agruparPor: z.enum(["mes", "responsable", "origen"]),
    ganados: z.number().int(),
    perdidos: z.number().int(),
    tasaGanePct: z.number().int(),
    montoGanadoMensualClp: z.number().int(),
    montoPerdidoMensualClp: z.number().int(),
    pipelineAbierto: z.object({ cantidad: z.number().int(), montoMensualClp: z.number().int() }),
    grupos: z.array(grupoSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  // Agregados: no revela negocios ni personas concretas.
  auditarLectura: () => [],
  async handler(ctx, input) {
    const desde = input.desde ?? hace(90);
    const hasta = input.hasta ?? hoy();
    const rango = { gte: aFecha(desde), lt: new Date(aFecha(hasta).getTime() + MS_DIA) };
    const campos = {
      responsableId: true,
      origenId: true,
      ganadoEn: true,
      perdidoEn: true,
      valorMensual: true,
      montoEstimadoMensual: true,
    } as const;
    const [ganados, perdidos, abiertos] = await Promise.all([
      ctx.db.negocio.findMany({ where: { estado: "ganado", ganadoEn: rango }, select: campos }),
      ctx.db.negocio.findMany({ where: { estado: "perdido", perdidoEn: rango }, select: campos }),
      ctx.db.negocio.findMany({
        where: { estado: "abierto", archivadoEn: null },
        select: { valorMensual: true, montoEstimadoMensual: true },
      }),
    ]);
    // Nombres solo de los ids que aparecen en el informe (nunca la lista completa de usuarios).
    const cerrados = [...ganados, ...perdidos];
    const ids = (f: "responsableId" | "origenId") => [
      ...new Set(cerrados.flatMap((n) => (n[f] ? [n[f] as string] : []))),
    ];
    const [usuarios, origenes] = await Promise.all([
      input.agruparPor === "responsable"
        ? ctx.db.user.findMany({
            where: { id: { in: ids("responsableId") } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      input.agruparPor === "origen"
        ? ctx.db.origenNegocio.findMany({
            where: { id: { in: ids("origenId") } },
            select: { id: true, nombre: true },
          })
        : Promise.resolve([]),
    ]);
    const acum = new Map<string, Acum>();
    const sumar = (clave: string, ganado: boolean, monto: number) => {
      const a = acum.get(clave) ?? { g: 0, p: 0, mg: 0, mp: 0 };
      acum.set(
        clave,
        ganado ? { ...a, g: a.g + 1, mg: a.mg + monto } : { ...a, p: a.p + 1, mp: a.mp + monto },
      );
    };
    const claveDe = (n: (typeof ganados)[number], fecha: Date | null) =>
      input.agruparPor === "mes"
        ? (fecha?.toISOString().slice(0, 7) ?? "")
        : input.agruparPor === "responsable"
          ? (n.responsableId ?? "")
          : (n.origenId ?? "");
    for (const n of ganados) sumar(claveDe(n, n.ganadoEn), true, montoMensual(n));
    for (const n of perdidos) sumar(claveDe(n, n.perdidoEn), false, montoMensual(n));
    const etiqueta = (clave: string) =>
      input.agruparPor === "mes"
        ? clave
        : ((input.agruparPor === "responsable"
            ? usuarios.find((u) => u.id === clave)?.name
            : origenes.find((o) => o.id === clave)?.nombre) ??
          (input.agruparPor === "responsable" ? "Sin responsable" : "Sin origen"));
    const grupos = [...acum.entries()]
      .map(([clave, a]) => ({
        clave,
        etiqueta: etiqueta(clave),
        ganados: a.g,
        perdidos: a.p,
        tasaGanePct: porcentaje(a.g, a.g + a.p),
        montoGanadoMensualClp: a.mg,
        montoPerdidoMensualClp: a.mp,
      }))
      .sort((a, b) =>
        input.agruparPor === "mes" ? a.clave.localeCompare(b.clave) : b.ganados - a.ganados,
      );
    const suma = (l: typeof ganados) => l.reduce((s, n) => s + montoMensual(n), 0);
    return {
      desde,
      hasta,
      agruparPor: input.agruparPor,
      ganados: ganados.length,
      perdidos: perdidos.length,
      tasaGanePct: porcentaje(ganados.length, ganados.length + perdidos.length),
      montoGanadoMensualClp: suma(ganados),
      montoPerdidoMensualClp: suma(perdidos),
      pipelineAbierto: {
        cantidad: abiertos.length,
        montoMensualClp: abiertos.reduce((s, n) => s + montoMensual(n), 0),
      },
      grupos,
    };
  },
});
