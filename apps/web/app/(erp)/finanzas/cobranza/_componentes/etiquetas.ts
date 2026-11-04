import type { Tramo } from "./tipos";

type Tono = "neutro" | "warning" | "danger" | "success" | "info";

export const TRAMO: Record<Tramo, { etiqueta: string; tono: Tono }> = {
  por_vencer: { etiqueta: "Por vencer", tono: "neutro" },
  "1_30": { etiqueta: "1-30 días", tono: "neutro" },
  "31_60": { etiqueta: "31-60 días", tono: "warning" },
  "61_mas": { etiqueta: "61+ días", tono: "danger" },
};

export const CANAL = { correo: "Correo", whatsapp_manual: "WhatsApp (manual)", nota: "Nota" } as const;
export const RESULTADO: Record<string, { etiqueta: string; tono: Tono }> = {
  enviado: { etiqueta: "Registrado", tono: "success" },
  fallido: { etiqueta: "Falló", tono: "danger" },
  omitido: { etiqueta: "Omitido", tono: "warning" },
};
