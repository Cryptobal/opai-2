import { z } from "zod";

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
});
