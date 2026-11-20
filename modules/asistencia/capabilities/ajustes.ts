import { z } from "zod";

import {
  CANALES, LIMITES_JORNADA_DEFECTO, MINUTOS_ALERTA_INICIO_DEFECTO, PLAZO_CORRECCION_HORAS_DEFECTO,
} from "../domain";

// Ajustes del módulo Asistencia (ADR-018): los lee el centro de configuración del núcleo desde el
// manifest; no hay página propia. A3 suma canales por instalación, plazo de corrección y alertas.
const PERMISO = "asistencia:configurar";

export const ajustesAsistencia = z.object({
  marcas_habilitadas: z.boolean().default(false).meta({
    etiqueta: "Habilitar marcas de asistencia",
    ayuda:
      "Apagado por defecto: mientras la identificación de terreno (RUT + PIN y biometría) no esté conectada, ninguna marca real sale de una empresa de prueba. Solo una empresa de prueba puede registrar marcas con PIN simulado.",
    grupo: "Marcas",
    ambito: "tenant",
    permiso: PERMISO,
    control: "switch",
  }),
  geocerca_radio_m: z.number().int().min(10).max(5000).default(100).meta({
    etiqueta: "Radio de geocerca en marcas de asistencia (m)",
    ayuda:
      "Por defecto 100 m. Solo para marcas de asistencia: fuera de este radio la marca se registra igual y queda señalada; el GPS nunca bloquea una marca. En rondas el radio por defecto es otro (configuración del módulo Rondas). Una instalación puede fijar su propio radio.",
    grupo: "Marcas",
    ambito: "tenant",
    permiso: PERMISO,
    control: "numero",
  }),
  canales_por_instalacion: z.record(z.string().uuid(), z.array(z.enum(CANALES)).min(1)).default({}).meta({
    etiqueta: "Canales de marca por instalación",
    ayuda:
      "Para cada instalación (por su id), los canales con que se puede marcar: «kiosco» (dispositivo emparejado) y «telefono_personal». Sin entrada, la instalación marca solo en el kiosco.",
    grupo: "Canales",
    ambito: "tenant",
    permiso: PERMISO,
    control: "json",
  }),
  telefono_personal_permitido: z.boolean().default(false).meta({
    etiqueta: "Permitir marcar desde el teléfono personal",
    ayuda:
      "Interruptor general de la empresa. Además cada persona debe estar habilitada por RR. HH., haber aceptado el uso de su teléfono y la instalación debe incluir el canal.",
    grupo: "Canales",
    ambito: "tenant",
    permiso: PERMISO,
    control: "switch",
  }),
  rostro_habilitado: z.boolean().default(false).meta({
    etiqueta: "Marcar con rostro (Face ID)",
    ayuda:
      "Apagado por defecto. Con el rostro apagado, todos marcan con RUT y PIN. Encenderlo exige además la integración de biometría de la empresa, el consentimiento de cada persona y que la plataforma lo permita para empresas reales (Ley 21.719).",
    grupo: "Identificación",
    ambito: "tenant",
    permiso: PERMISO,
    control: "switch",
  }),
  pin_respaldo_exige_motivo: z.boolean().default(true).meta({
    etiqueta: "Pedir el motivo al marcar con PIN de respaldo",
    ayuda:
      "RUT + PIN de 6 dígitos siempre está disponible como mecanismo secundario sin biometría (Res. 38 art. 57). Cuando la marca cae a PIN por una falla del rostro, se guarda el motivo.",
    grupo: "Identificación",
    ambito: "tenant",
    permiso: PERMISO,
    control: "switch",
  }),
  plazo_correccion_horas: z.number().int().min(1).max(720).default(PLAZO_CORRECCION_HORAS_DEFECTO).meta({
    etiqueta: "Plazo para responder una corrección (horas)",
    ayuda:
      "Desde el sello del servidor. Por defecto 48 horas; verifica el plazo que corresponda antes de cambiarlo. Si el trabajador no responde dentro del plazo configurado, el sistema registra la corrección como aceptada.",
    grupo: "Correcciones",
    ambito: "tenant",
    permiso: PERMISO,
    control: "numero",
  }),
  alerta_inicio_minutos: z.number().int().min(5).max(240).default(MINUTOS_ALERTA_INICIO_DEFECTO).meta({
    etiqueta: "Minutos sin marca de inicio para alertar",
    ayuda: "Art. 45 de la Res. 38: a los 30 minutos de iniciado el turno sin marca de entrada se alerta al trabajador, con copia al empleador.",
    grupo: "Alertas del art. 45",
    ambito: "tenant",
    permiso: PERMISO,
    control: "numero",
  }),
  alerta_termino_activa: z.boolean().default(true).meta({
    etiqueta: "Alertar la falta de marca de término",
    ayuda: "Art. 45: el empleador puede deshabilitar este aviso.",
    grupo: "Alertas del art. 45",
    ambito: "tenant",
    permiso: PERMISO,
    control: "switch",
  }),
  limites_jornada: z
    .object({
      vigenteDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      avisoSemanalHoras: z.number().min(1).max(80),
      maxSemanalHoras: z.number().min(1).max(80),
      maxDiarioHoras: z.number().min(1).max(24),
      maxExtraDiarioHoras: z.number().min(0).max(12),
    })
    .default(LIMITES_JORNADA_DEFECTO)
    .meta({
      etiqueta: "Límites de jornada (Ley 21.561)",
      ayuda:
        "Aviso a las 40 h semanales, tope crítico a las 42 h, 12 h diarias de trabajo y 2 h extraordinarias diarias. vigenteDesde: fecha desde la que se evalúan (defecto 2024-04-26, DS 48).",
      grupo: "Límites de jornada",
      ambito: "tenant",
      permiso: PERMISO,
      control: "json",
    }),
  correo_copia_est: z.string().trim().email().or(z.literal("")).default("").meta({
    etiqueta: "Correo del EST para copia del comprobante",
    ayuda:
      "Cuando el trabajador presta servicios a una empresa usuaria (EST o subcontrato), el comprobante de sus marcas se copia a este correo. Vacío: sin copia.",
    grupo: "Comprobante",
    ambito: "tenant",
    permiso: PERMISO,
    control: "texto",
  }),
  retencion_bitacora_anios: z.number().int().min(5).max(10).default(5).meta({
    etiqueta: "Retención mínima de la bitácora (años)",
    ayuda: "Los respaldos de marcas se conservan al menos este tiempo, según el art. 14 b de la Res. 38.",
    grupo: "Reportes DT",
    ambito: "tenant",
    permiso: PERMISO,
    control: "numero",
  }),
  tolerancia_atraso_min: z.number().int().min(0).max(120).default(15).meta({
    etiqueta: "Tolerancia de atraso para Desempeño (minutos)",
    ayuda:
      "Solo para el indicador «Marcas a la hora» de Desempeño: una entrada dentro de estos minutos desde el inicio del turno cuenta como a la hora. No cambia el atraso que se registra ni el reporte para la DT. Por defecto 15 minutos.",
    grupo: "Desempeño",
    ambito: "tenant",
    permiso: PERMISO,
    control: "numero",
  }),
});
