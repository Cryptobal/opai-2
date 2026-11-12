import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

const MES = v("periodo.nombre", "texto", "octubre de 2026", "Mes cerrado.");

/**
 * Avisos de Desempeño al cerrar el mes (CAR-312). Silencio por defecto (ADR-020): solo existen si la
 * empresa activa el aviso en Desempeño. Son transaccionales (sin reglas): van solo a la persona o a su
 * jefatura, y solo si pueden ver ese resultado. Campana; nunca llevan el puntaje ni el detalle.
 */
export const COMUNICABLES_DESEMPENO: readonly EventoComunicable[] = [
  {
    evento: "desempeno.resultado.bajo_meta",
    nombre: "Resultado bajo la meta",
    descripcion:
      "Al cerrar el mes, el resultado de una persona quedó bajo la meta de su cargo. Le llega a ella si su cargo le muestra su resultado.",
    transaccional: true,
    variables: [MES, EMPRESA, URL("Su resultado en Desempeño.")],
    plantillas: {
      inapp: {
        asunto: "Tu resultado de {{periodo.nombre}} quedó bajo la meta",
        cuerpo: "Revisa en qué indicadores no se llegó a la meta.",
      },
    },
  },
  {
    evento: "desempeno.equipo.bajo_meta",
    nombre: "Personas a cargo bajo la meta",
    descripcion:
      "Al cerrar el mes, una o más personas a cargo de una jefatura quedaron bajo la meta de su cargo. Le llega a la jefatura directa.",
    transaccional: true,
    variables: [
      MES,
      v("equipo.bajo_meta", "numero", "3", "Cuántas personas a su cargo quedaron bajo la meta."),
      EMPRESA,
      URL("El resultado de su equipo en Desempeño."),
    ],
    plantillas: {
      inapp: {
        asunto: "{{equipo.bajo_meta}} de tu equipo bajo la meta en {{periodo.nombre}}",
        cuerpo: "Revisa el resultado de tu equipo y conversa con quienes no llegaron.",
      },
    },
  },
];
