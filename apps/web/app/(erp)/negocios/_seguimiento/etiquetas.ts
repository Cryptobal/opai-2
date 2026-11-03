export const CANAL = { correo: "Correo", whatsapp: "WhatsApp", llamada: "Llamada", interno: "Interno" } as const;
export const EJECUTOR = { persona: "Una persona", opai_automatico: "Automático", agente: "Agente" } as const;
export const ESTADO_PASO: Record<string, { texto: string; tono: "neutro" | "info" | "warning" | "success" | "danger" }> = {
  programado: { texto: "Programado", tono: "neutro" },
  por_hacer: { texto: "Por hacer", tono: "info" },
  por_preparar: { texto: "Por preparar", tono: "info" },
  hecho: { texto: "Hecho", tono: "success" },
  omitido: { texto: "Omitido", tono: "neutro" },
  fallido: { texto: "Con error", tono: "danger" },
  cancelado: { texto: "Cancelado", tono: "neutro" },
};
export const ESTADO_VISIBLE: Record<string, { texto: string; tono: "neutro" | "info" | "warning" | "success" | "danger" }> = {
  activo: { texto: "En curso", tono: "success" },
  con_atrasos: { texto: "Con atrasos", tono: "warning" },
  pausado: { texto: "Pausado", tono: "warning" },
  con_fallos: { texto: "Con errores", tono: "danger" },
  terminado: { texto: "Terminado", tono: "neutro" },
  cancelado: { texto: "Cancelado", tono: "neutro" },
};
export const MOTIVO: Record<string, string> = {
  cliente_respondio: "El cliente respondió",
  sin_respuesta: "Sin respuesta al último paso",
  ganado: "Se ganó el negocio",
  perdido: "Se perdió el negocio",
  reemplazado: "Se inició otro seguimiento",
  manual: "Detenido a mano",
};
