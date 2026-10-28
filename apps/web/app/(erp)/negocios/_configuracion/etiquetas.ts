// Etiquetas del editor del embudo (sin dependencias de servidor: las usan componentes cliente).

export const REQUISITO: Record<string, string> = {
  monto: "Monto",
  fecha_cierre: "Fecha de cierre",
  cotizacion_enviada: "Cotización enviada",
  inicio_servicio: "Inicio de servicio",
  motivo_perdida: "Motivo de pérdida",
};

export const TONO: Record<string, string> = {
  neutral: "Neutro",
  info: "Información",
  warning: "Atención",
  success: "Éxito",
  danger: "Peligro",
};

export const TIPO_ETAPA = {
  abierta: { etiqueta: "Abierta", tono: "neutro" },
  ganada: { etiqueta: "Ganada", tono: "success" },
  perdida: { etiqueta: "Perdida", tono: "danger" },
} as const;
