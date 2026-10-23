import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

const AGENTE = v("agente.nombre", "texto", "Agente de cobranza", "Nombre de la API key.");

/** Eventos del núcleo sobre agentes, integraciones y la bitácora (avisos a administradores). */
export const COMUNICABLES_SISTEMA: readonly EventoComunicable[] = [
  {
    evento: "core.aprobacion.pendiente",
    nombre: "Aprobación pendiente de un agente",
    descripcion: "Un agente pidió ejecutar una acción irreversible y espera aprobación humana.",
    transaccional: false,
    variables: [
      AGENTE,
      v("accion", "texto", "core.vinculos.terminar", "Capacidad solicitada."),
      v("resumen", "texto", "Terminar el vínculo de Ana Rojas al 31-10-2026", "Qué hará."),
      v("vence", "fecha", "26-10-2026 18:00", "Hasta cuándo se puede aprobar."),
      EMPRESA,
      URL("Cola de aprobaciones."),
    ],
    plantillas: {
      correo: {
        asunto: "{{agente.nombre}} pide aprobar: {{resumen}}",
        cuerpo:
          "{{agente.nombre}} pidió ejecutar {{accion}}:\n{{resumen}}\n\nApruébalo o recházalo antes del {{vence}}:\n{{url}}",
      },
      inapp: { asunto: "Aprobación pendiente: {{agente.nombre}}", cuerpo: "{{resumen}}" },
    },
  },
  ...([80, 100] as const).map((p): EventoComunicable => ({
    evento: `core.agente.presupuesto_${p}`,
    nombre: p === 100 ? "Presupuesto de agente agotado" : "Presupuesto de agente al 80 %",
    descripcion:
      p === 100
        ? "El agente agotó su presupuesto mensual: sus ejecuciones se detienen hasta el próximo mes."
        : "El agente consumió el 80 % de su presupuesto mensual.",
    transaccional: false,
    variables: [
      AGENTE,
      v("consumo_usd", "numero", "8,10", "Consumo del mes en USD."),
      v("presupuesto_usd", "numero", "10,00", "Presupuesto mensual en USD."),
      EMPRESA,
      URL("Ficha del agente."),
    ],
    plantillas: {
      correo: {
        asunto: `{{agente.nombre}} ${p === 100 ? "agotó" : "usó el 80 % de"} su presupuesto`,
        cuerpo: `{{agente.nombre}} lleva US$ {{consumo_usd}} de US$ {{presupuesto_usd}} este mes.${p === 100 ? " Sus ejecuciones quedaron detenidas." : ""}\n\nRevísalo aquí:\n{{url}}`,
      },
      inapp: {
        asunto: `Presupuesto ${p} %: {{agente.nombre}}`,
        cuerpo: "US$ {{consumo_usd}} de {{presupuesto_usd}}",
      },
    },
  })),
  {
    evento: "core.integracion.error",
    nombre: "Integración con error",
    descripcion: "La prueba o el uso de una integración falló.",
    transaccional: false,
    variables: [
      v("integracion.nombre", "texto", "Correo (Resend)", "Integración."),
      v("error", "texto", "La clave fue rechazada (401).", "Mensaje del proveedor."),
      EMPRESA,
      URL("Ficha de la integración."),
    ],
    plantillas: {
      correo: {
        asunto: "{{integracion.nombre}} dejó de funcionar",
        cuerpo:
          "{{integracion.nombre}} respondió con un error:\n{{error}}\n\nRevísala aquí:\n{{url}}",
      },
      inapp: { asunto: "Error en {{integracion.nombre}}", cuerpo: "{{error}}" },
    },
  },
  {
    evento: "core.bitacora.rota",
    nombre: "Bitácora con quiebre",
    descripcion: "La verificación diaria encontró un eslabón alterado en la bitácora encadenada.",
    transaccional: false,
    variables: [v("seq", "numero", "1204", "Primer eslabón roto."), EMPRESA, URL("Auditoría.")],
    plantillas: {
      correo: {
        asunto: "Alerta: la bitácora de {{empresa.nombre}} no verifica",
        cuerpo:
          "La verificación encontró un quiebre en el eslabón {{seq}}. Revisa la auditoría:\n{{url}}",
      },
      inapp: { asunto: "La bitácora no verifica", cuerpo: "Quiebre en el eslabón {{seq}}." },
    },
  },
];
