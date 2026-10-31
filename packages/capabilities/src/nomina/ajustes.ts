import { z } from "zod";

// Ajustes del módulo Nómina (ADR-018, ADR-021). Viven junto a las capacidades para que el manifest y
// `ajuste()` lean el mismo esquema. Los conceptos de haberes y descuentos son datos (`nomina.conceptos.*`),
// no ajustes. Los datos del empleador y del representante laboral son los que usarán Previred, el LRE
// y el SII (PR 2); ninguno de esos formatos está verificado todavía.
export const PERMISO_CONFIG = "nomina:config.manage";

const texto = (max: number) => z.string().trim().max(max).default("");

export const ajustesNomina = z.object({
  dia_cierre: z.number().int().min(1).max(31).default(31).meta({
    etiqueta: "Día de cierre del mes",
    ayuda: "Día del mes en que se cierra el período de remuneraciones; si el mes es más corto, el último día.",
    grupo: "Período",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "numero",
  }),
  umbral_diferencia_pct: z.number().int().min(0).max(100).default(10).meta({
    etiqueta: "Umbral de diferencia contra el mes anterior (%)",
    ayuda: "Una liquidación cuyo líquido cambia más que este porcentaje se marca para revisión.",
    grupo: "Período",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "numero",
  }),
  anticipo_dia_defecto: z.number().int().min(1).max(31).default(15).meta({
    etiqueta: "Día del anticipo quincenal por defecto",
    ayuda: "Lo hereda cada regla de anticipo nueva (B2); si el mes es más corto, el último día.",
    grupo: "Anticipos",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "numero",
  }),
  banco_pago: texto(80).meta({
    etiqueta: "Banco del archivo de pago",
    ayuda: "Formato de nómina masiva del banco: por verificar.",
    grupo: "Pago",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "texto",
  }),
  empleador_rut: texto(20).meta({
    etiqueta: "RUT del empleador",
    ayuda: "Lo usan Previred y el SII. Campos oficiales: por verificar.",
    grupo: "Empleador",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "texto",
  }),
  empleador_razon_social: texto(160).meta({
    etiqueta: "Razón social del empleador",
    grupo: "Empleador",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "texto",
  }),
  empleador_actividad: texto(160).meta({
    etiqueta: "Actividad económica del empleador",
    ayuda: "Qué parte del registro de contribuyentes cubre OPAI: por verificar.",
    grupo: "Empleador",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "texto",
  }),
  representante_laboral_nombre: texto(120).meta({
    etiqueta: "Representante laboral electrónico",
    ayuda: "Quien sube los archivos en Mi DT con ClaveÚnica; la DT no tiene API pública.",
    grupo: "Representante",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "texto",
  }),
  representante_laboral_rut: texto(20).meta({
    etiqueta: "RUT del representante laboral",
    grupo: "Representante",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "texto",
  }),
});
