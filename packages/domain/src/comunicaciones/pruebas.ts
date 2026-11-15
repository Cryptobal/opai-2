import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

/**
 * Aviso a la empresa de que su prueba de un módulo está por vencer (ADR-071, adenda 7.3, decisión de
 * Carlos del 12-nov-2026). Transaccional: va siempre a los dueños y administradores, sin reglas; la
 * empresa puede editar el texto en Configuración › Comunicaciones.
 */
export const COMUNICABLES_PRUEBAS: readonly EventoComunicable[] = [
  {
    evento: "core.modulo.prueba_por_vencer",
    nombre: "Prueba de módulo por vencer",
    descripcion:
      "La prueba de un módulo de la empresa vence pronto (7 días antes si la abrió OPAI, 2 días antes si es la prueba gratis).",
    transaccional: true,
    variables: [
      v("modulo.nombre", "texto", "Control de acceso", "Módulo en prueba."),
      v("vence", "fecha", "20-11-2026", "Último día de la prueba."),
      v("dias", "numero", "2", "Días que faltan."),
      v("despues", "texto", "quedará en solo lectura", "Qué pasa al vencer."),
      EMPRESA,
      URL("Módulos de la empresa."),
    ],
    plantillas: {
      correo: {
        asunto: "La prueba de {{modulo.nombre}} vence en {{dias}} días",
        cuerpo:
          "La prueba de {{modulo.nombre}} de {{empresa.nombre}} vence el {{vence}}. Al vencer, el módulo {{despues}}.\n\nPara seguir usándolo, conversa con OPAI. Revisa tus módulos aquí:\n{{url}}",
      },
    },
  },
];
