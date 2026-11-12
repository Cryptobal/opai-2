import { defineCapability } from "../define";
import { aFecha, hoy } from "../core/maestros/comun";
import { PERMISO_READ, embudoPorDefecto } from "./comun";
import { montoMensual } from "./informes-calculo";
import { embudoDe, perdidasDe, porResponsable, pronosticoDe, resumenCierre, type Cerrado } from "./informes-tablero-calculo";
import { canalesDe } from "./informes-tablero-canales";
import { entradaTablero, salidaTablero } from "./informes-tablero-esquema";
import { haceMeses, mesesDesde, rangosDe } from "./informes-tablero-periodo";
import { PERMISO_SOLICITUDES_READ, horasPrimeraRespuesta } from "./solicitudes-comun";
import { resumenPrimeraRespuesta } from "./solicitudes-plazo";
import { CANALES_SOLICITUD } from "./solicitudes-dominio";

const dia = (d: Date) => d.toISOString().slice(0, 10);
const TOPE = 20_000;

/**
 * Tablero de reportes comerciales (CAR-27, pantalla `/negocios/reportes`; incluye el embudo por canal
 * de CAR-298). Una sola capacidad para que la pantalla y el agente lean lo mismo en 8 consultas.
 */
export const informesTablero = defineCapability({
  id: "comercial.informes.tablero",
  descripcion:
    "Tablero de reportes comerciales del mes, trimestre o año en curso, comparado con el período anterior: valor en curso, ganados y perdidos, conversión, ciclo promedio, embudo por etapa con días promedio y avance, motivos de pérdida y competidores de los últimos 12 meses, solicitudes por canal y su conversión a negocio, cumplimiento del tiempo de primera respuesta a solicitudes (si la empresa lo fijó), pronóstico ponderado por mes de cierre y tabla por responsable.",
  permiso: PERMISO_READ,
  input: entradaTablero,
  output: salidaTablero,
  efecto: "lectura",
  dryRun: false,
  // Agregados: no revela negocios, cuentas ni solicitudes concretas.
  auditarLectura: () => [],
  async handler(ctx, input) {
    const fecha = hoy();
    const r = rangosDe(input.periodo, fecha);
    const desde12 = haceMeses(fecha, 12);
    const corte = aFecha(desde12 < r.anterior.desde ? desde12 : r.anterior.desde);
    const mio = input.responsableId ? { responsableId: input.responsableId } : {};
    const montos = { valorMensual: true, montoEstimadoMensual: true } as const;
    const embudo = await embudoPorDefecto(ctx);
    const leeSolicitudes = ctx.autorizar(PERMISO_SOLICITUDES_READ);
    const [etapas, abiertos, cerradosBase, pasos, solicitudes, motivos] = await Promise.all([
      ctx.db.etapa.findMany({ where: { embudoId: embudo.id, activa: true }, orderBy: { orden: "asc" } }),
      ctx.db.negocio.findMany({
        where: { embudoId: embudo.id, estado: "abierto", archivadoEn: null, ...mio },
        select: { ...montos, etapaId: true, probabilidad: true, cierreEstimado: true, responsableId: true },
        take: TOPE,
      }),
      ctx.db.negocio.findMany({
        where: { embudoId: embudo.id, ...mio, OR: [{ estado: "ganado", ganadoEn: { gte: corte } }, { estado: "perdido", perdidoEn: { gte: corte } }] },
        select: { ...montos, estado: true, ganadoEn: true, perdidoEn: true, createdAt: true, responsableId: true, motivoPerdidaId: true, competidor: true },
        take: TOPE,
      }),
      ctx.db.historialEtapa.findMany({
        where: { cuando: { gte: aFecha(desde12) }, negocio: { embudoId: embudo.id, ...mio } },
        select: { deEtapaId: true, aEtapaId: true, segundosEnAnterior: true },
        take: TOPE,
      }),
      leeSolicitudes
        ? ctx.db.solicitud.findMany({
            where: { createdAt: { gte: aFecha(r.desde) }, duplicadaDeId: null, ...mio },
            select: { canal: true, estado: true, createdAt: true, primeraRespuestaEn: true, negocio: { select: { ...montos, estado: true } } },
            take: TOPE,
          })
        : Promise.resolve(null),
      ctx.db.motivoPerdida.findMany({ select: { id: true, nombre: true } }),
    ]);
    const cerrados = cerradosBase.flatMap((n): Cerrado[] => {
      const cuando = n.estado === "ganado" ? n.ganadoEn : n.perdidoEn;
      if (!cuando || (n.estado !== "ganado" && n.estado !== "perdido")) return [];
      return [{ ...n, estado: n.estado, cerradoEn: dia(cuando), creadoEn: dia(n.createdAt) }];
    });
    const vivos = abiertos.map((n) => ({ ...n, cierreEstimado: n.cierreEstimado ? dia(n.cierreEstimado) : null }));
    const tabla = porResponsable(vivos, cerrados, r);
    const usuarios = await ctx.db.user.findMany({
      where: { id: { in: tabla.flatMap((t) => (t.responsableId ? [t.responsableId] : [])) } },
      select: { id: true, name: true },
    });
    const perdidas = perdidasDe(cerrados, desde12);
    const horasObjetivo = solicitudes ? await horasPrimeraRespuesta(ctx) : 0;
    const nombreEtapa = new Map(etapas.map((e) => [e.id, e.nombre]));
    return {
      periodo: input.periodo,
      desde: r.desde,
      hasta: r.hasta,
      anterior: r.anterior,
      enCurso: { cantidad: vivos.length, montoMensualClp: vivos.reduce((s, n) => s + montoMensual(n), 0) },
      cierre: resumenCierre(cerrados, r),
      cierreAnterior: resumenCierre(cerrados, r.anterior),
      embudo: embudoDe(etapas, vivos, pasos.map((p) => ({ deEtapaId: p.deEtapaId, aEtapaId: p.aEtapaId, segundos: p.segundosEnAnterior })))
        .map((e) => ({ ...e, nombre: nombreEtapa.get(e.etapaId) ?? "" })),
      perdidas: {
        desde: desde12,
        motivos: perdidas.motivos.map((m) => ({ ...m, nombre: motivos.find((x) => x.id === m.motivoId)?.nombre ?? "Sin motivo" })),
        competidores: perdidas.competidores,
      },
      canales: solicitudes ? canalesDe(solicitudes, CANALES_SOLICITUD) : null,
      primeraRespuesta: solicitudes ? resumenPrimeraRespuesta(solicitudes, horasObjetivo, new Date()) : null,
      pronostico: pronosticoDe(vivos, mesesDesde(fecha, 4)),
      responsables: tabla.map((t) => ({ ...t, nombre: usuarios.find((u) => u.id === t.responsableId)?.name ?? "Sin responsable" })),
    };
  },
});
