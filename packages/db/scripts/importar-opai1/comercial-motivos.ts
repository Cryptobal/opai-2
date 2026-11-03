/** El schema comercial está en main; el apply CRM sigue pendiente (solo dry-run en el plan). */
export const COMERCIAL_EN_MAIN: boolean = true;

export const MOTIVO_PENDIENTE_CRM = "pendiente_crm_pr1";
export const MOTIVO_MODULO_COMERCIAL_INACTIVO = "modulo_comercial_inactivo";
export const MOTIVO_MODULO_FINANZAS_INACTIVO = "modulo_finanzas_inactivo";
export const MOTIVO_MODULO_CPQ_INACTIVO = "modulo_cpq_inactivo";
export const MOTIVO_PENDIENTE_MODELO_PROGRAMACION = "pendiente_modelo_finanzas_programacion";
export const MOTIVO_EXPORT_CPQ_INCOMPLETO = "export_cpq_incompleto";

/** Se pasa a `true` cuando finanzas.ventas_programaciones está en main (CAR-25 recurrentes). */
export const FINANZAS_PROGRAMACION_EN_MAIN = true;
