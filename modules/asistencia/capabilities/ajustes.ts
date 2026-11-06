import { z } from "zod";

import {
  CANALES, MINUTOS_ALERTA_INICIO_DEFECTO, PLAZO_CORRECCION_HORAS_DEFECTO, UMBRAL_SIMILITUD_DEFECTO, UMBRAL_SIMILITUD_MAX,
  UMBRAL_SIMILITUD_MIN,
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
  geocerca_radio_m: z.number().int().min(10).max(5000).default(300).meta({
    etiqueta: "Radio de la geocerca para alertar (m)",
    ayuda:
      "Por defecto 300 m (D-13). Fuera de este radio la marca se registra igual y queda señalada: la geocerca solo alerta y el GPS nunca bloquea una marca (Res. 38, arts. 38, 53 y 58 k). Una instalación puede fijar su propio radio.",
    grupo: "Marcas",
    ambito: "tenant",
    permiso: PERMISO,
    control: "numero",
  }),
  canales_por_instalacion: z.record(z.string().uuid(), z.array(z.enum(CANALES)).min(1)).default({}).meta({
    etiqueta: "Canales de marca por instalación",
    ayuda:
      "Para cada instalación (por su id), los canales con que se puede marcar: «kiosco» (dispositivo emparejado) y «telefono_personal». Sin entrada, la instalación marca solo en el kiosco (D-01).",
    grupo: "Canales",
    ambito: "tenant",
    permiso: PERMISO,
    control: "json",
  }),
  telefono_personal_permitido: z.boolean().default(false).meta({
    etiqueta: "Permitir marcar desde el teléfono personal",
    ayuda:
      "Interruptor general (D-01). Además cada persona debe estar habilitada por RR. HH. y haber aceptado el uso de su teléfono (T-04), y la instalación debe incluir el canal.",
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
  biometria_umbral_similitud: z.number().min(UMBRAL_SIMILITUD_MIN).max(UMBRAL_SIMILITUD_MAX).default(UMBRAL_SIMILITUD_DEFECTO).meta({
    etiqueta: "Umbral de similitud facial (0 a 1)",
    ayuda: "Similitud mínima para aceptar un rostro. Lo fija la plataforma, no cada empresa (T-03).",
    grupo: "Identificación",
    ambito: "plataforma",
    control: "numero",
  }),
  biometria_empresas_reales: z.boolean().default(false).meta({
    etiqueta: "Permitir Face ID en empresas reales",
    ayuda:
      "Apagado: solo las empresas de prueba (slug «qa-…») pueden enrolar y verificar rostros. Se enciende solo cuando Carlos confirma la evaluación de impacto y el DPA (Ley 21.719, datos biométricos sensibles desde el 1-dic-2026).",
    grupo: "Identificación",
    ambito: "plataforma",
    control: "switch",
  }),
  plazo_correccion_horas: z.number().int().min(1).max(720).default(PLAZO_CORRECCION_HORAS_DEFECTO).meta({
    etiqueta: "Plazo para responder una corrección (horas)",
    ayuda:
      "Desde el sello del servidor. Por defecto 48 h; está pendiente de confirmar con el texto íntegro de la Res. 38 (el ORD 626/2024 habla del «día hábil siguiente»), por eso se puede cambiar. Vencido sin respuesta, la corrección se tiene por aceptada.",
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
  correo_copia_est: z.string().trim().email().or(z.literal("")).default("").meta({
    etiqueta: "Correo del EST para copia del comprobante",
    ayuda:
      "Cuando el trabajador presta servicios a una empresa usuaria (EST o subcontrato), el comprobante de sus marcas se copia a este correo. Vacío: sin copia.",
    grupo: "Comprobante",
    ambito: "tenant",
    permiso: PERMISO,
    control: "texto",
  }),
});
