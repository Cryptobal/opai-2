import { z } from "zod";

import { MINUTOS_ALERTA_INICIO_DEFECTO, PLAZO_CORRECCION_HORAS_DEFECTO } from "../domain";

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
    etiqueta: "Radio de la geocerca para alertar (m)",
    ayuda:
      "Fuera de este radio la marca se registra igual y queda señalada: el GPS nunca bloquea una marca (Res. 38, arts. 38, 53 y 58 k).",
    grupo: "Marcas",
    ambito: "tenant",
    permiso: PERMISO,
    control: "numero",
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
});
