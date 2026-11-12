// Hechos que Comercial ofrece para armar indicadores propios (CAR-313, ADR-094 §8). Se atribuyen al
// usuario responsable del negocio o de la solicitud. Solo lectura sobre hechos ya registrados.
import { defineHecho, type HechoGestion } from "../hechos-gestion";
import { montoMensual } from "./informes-calculo";

const NEGOCIOS = "comercial:negocios.read";
const SOLICITUDES = "comercial:solicitudes.read";
const SI_NO = ["si", "no"] as const;

const negocioCerrado = (estado: "ganado" | "perdido") =>
  defineHecho({
    id: `comercial.negocio_${estado}`,
    nombre: estado === "ganado" ? "Negocio ganado" : "Negocio perdido",
    descripcion:
      estado === "ganado"
        ? "Un negocio a cargo de la persona pasó a ganado. Trae su valor mensual en pesos."
        : "Un negocio a cargo de la persona pasó a perdido. Trae su valor mensual en pesos.",
    sujeto: "usuario",
    entidad: "negocio",
    montos: [{ id: "valor_mensual", unidad: "clp" }],
    atributos: [{ id: "con_cotizacion", valores: SI_NO }],
    permiso: NEGOCIOS,
    async listar(ctx, rango) {
      const fecha = estado === "ganado" ? "ganadoEn" : "perdidoEn";
      const negocios = await ctx.db.negocio.findMany({
        where: { estado, [fecha]: { gte: rango.desde, lt: rango.hasta } },
        select: {
          id: true,
          responsableId: true,
          ganadoEn: true,
          perdidoEn: true,
          valorMensual: true,
          montoEstimadoMensual: true,
          cotizacionEnviadaEn: true,
        },
      });
      return negocios.flatMap((n) => {
        const en = estado === "ganado" ? n.ganadoEn : n.perdidoEn;
        if (!en) return [];
        return [
          {
            sujetoId: n.responsableId,
            en,
            clave: n.id,
            montos: { valor_mensual: montoMensual(n) },
            atributos: { con_cotizacion: n.cotizacionEnviadaEn ? "si" : "no" },
          },
        ];
      });
    },
  });

const solicitud = (
  sufijo: "recibida" | "atendida" | "convertida",
  campo: "createdAt" | "primeraRespuestaEn" | "convertidaEn",
  nombre: string,
  descripcion: string,
) =>
  defineHecho({
    id: `comercial.solicitud_${sufijo}`,
    nombre,
    descripcion,
    sujeto: "usuario",
    entidad: "solicitud",
    montos: [],
    atributos: [],
    permiso: SOLICITUDES,
    async listar(ctx, rango) {
      const filas = await ctx.db.solicitud.findMany({
        where: { duplicadaDeId: null, [campo]: { gte: rango.desde, lt: rango.hasta } },
        select: {
          id: true,
          responsableId: true,
          createdAt: true,
          primeraRespuestaEn: true,
          convertidaEn: true,
        },
      });
      return filas.flatMap((s) => {
        const en = s[campo];
        return en ? [{ sujetoId: s.responsableId, en, clave: s.id }] : [];
      });
    },
  });

export const hechosComercial: readonly HechoGestion[] = [
  negocioCerrado("ganado"),
  negocioCerrado("perdido"),
  solicitud(
    "recibida",
    "createdAt",
    "Solicitud recibida",
    "Entró una solicitud (lead) que quedó a cargo de la persona. Las duplicadas no cuentan.",
  ),
  solicitud(
    "atendida",
    "primeraRespuestaEn",
    "Solicitud atendida",
    "Una solicitud a cargo de la persona tuvo su primera respuesta. Las duplicadas no cuentan.",
  ),
  solicitud(
    "convertida",
    "convertidaEn",
    "Solicitud convertida en negocio",
    "Una solicitud a cargo de la persona se convirtió en negocio.",
  ),
];
