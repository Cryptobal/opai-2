import { z } from "zod";

import { GRAVEDADES, MODOS_PUNTO, ORDENES_PLANTILLA, RADIO_GEOCERCA_M } from "@opai/domain";

// Ajustes del módulo Rondas (ADR-018, ADR-021). Viven junto a las capacidades para que el manifest y
// `ajuste()` lean el mismo esquema. Son los defectos del tenant que heredan los puntos y plantillas
// (R1, R6); el valor propio de un punto o instalación se guarda como dato del módulo, no como ajuste
// con ámbito «instalación» (que hoy no existe, ADR-038). El catálogo de tipos de incidente se edita
// con `rondas.incidentes_tipo.*`, no como ajuste.
const PERMISO_CONFIG = "rondas:configurar";
const PERMISO_CONFIANZA = "rondas:confianza.manage";

export const ajustesRondas = z.object({
  modelo_confianza: z.enum(["v1"]).default("v1").meta({
    etiqueta: "Modelo de confianza",
    ayuda:
      "El modelo v1 combina geocerca, velocidad, movimiento, foto, dispositivo y batería para calcular el puntaje de confianza de cada marca.",
    grupo: "Modelo de confianza",
    ambito: "tenant",
    permiso: PERMISO_CONFIANZA,
    control: "seleccion",
  }),
  mostrar_banda_cliente: z.boolean().default(false).meta({
    etiqueta: "Mostrar la banda de confianza al cliente",
    ayuda:
      "Apagado por defecto: el cliente ve cumplimiento y recorrido, no el desglose del puntaje de confianza.",
    grupo: "Modelo de confianza",
    ambito: "tenant",
    permiso: PERMISO_CONFIANZA,
    control: "switch",
  }),
  modo_defecto: z.enum(MODOS_PUNTO).default("qr_gps").meta({
    etiqueta: "Modo por defecto de los puntos",
    ayuda: "QR, GPS o QR + GPS. Lo hereda cada punto nuevo salvo que elija otro modo.",
    grupo: "Defectos de punto",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "seleccion",
  }),
  radio_defecto_m: z
    .number()
    .int()
    .min(RADIO_GEOCERCA_M.min)
    .max(RADIO_GEOCERCA_M.max)
    .default(RADIO_GEOCERCA_M.defecto)
    .meta({
      etiqueta: "Radio de geocerca por defecto (m)",
      ayuda: "15 m por defecto, con un máximo de 20 m. Lo heredan los puntos nuevos salvo que definan otro radio.",
      grupo: "Defectos de punto",
      ambito: "tenant",
      permiso: PERMISO_CONFIG,
      control: "numero",
    }),
  precision_min_defecto_m: z.number().int().min(5).max(100).default(25).meta({
    etiqueta: "Precisión mínima aceptada por defecto (m)",
    ayuda: "Una lectura GPS con precisión peor que este valor no cuenta como «dentro» de la geocerca.",
    grupo: "Defectos de punto",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "numero",
  }),
  permanencia_gps_defecto_s: z.number().int().min(0).max(300).default(15).meta({
    etiqueta: "Permanencia por defecto con solo GPS (s)",
    ayuda: "Segundos que el guardia debe permanecer dentro de la geocerca para marcar un punto de solo GPS.",
    grupo: "Defectos de punto",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "numero",
  }),
  orden_defecto: z.enum(ORDENES_PLANTILLA).default("sugerido").meta({
    etiqueta: "Orden de puntos por defecto de las plantillas",
    ayuda: "Sugerido, estricto o aleatorio en cada ejecución de la ronda.",
    grupo: "Defectos de plantilla",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "seleccion",
  }),
  umbral_incompleta_pct: z.number().int().min(0).max(100).default(20).meta({
    etiqueta: "Umbral de ronda incompleta (%)",
    ayuda:
      "Porcentaje de puntos obligatorios sin marcar a partir del cual una ronda se cierra como incompleta.",
    grupo: "Defectos de plantilla",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "numero",
  }),
  gravedad_incidente_defecto: z.enum(GRAVEDADES).default("alta").meta({
    etiqueta: "Gravedad por defecto de un incidente de ronda",
    ayuda: "Gravedad con que se abre una novedad marcada como incidente si su tipo no fija una.",
    grupo: "Novedades",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "seleccion",
  }),
});