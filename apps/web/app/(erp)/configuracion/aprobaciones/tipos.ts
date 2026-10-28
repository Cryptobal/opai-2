// Tipos y presentación de aprobaciones, sin dependencias de servidor (los usan islas cliente).

export type Aprobacion = {
  id: string;
  /** plataforma: acción platform.*, se resuelve con platform.aprobaciones.* (CAR-36). */
  ambito: "empresa" | "plataforma";
  apiKeyId: string | null;
  agente: string;
  via: string | null;
  riesgo: "alto" | "medio";
  capability: string;
  resumen: string;
  input: unknown;
  estado: "pendiente" | "aprobada" | "rechazada" | "vencida";
  venceEn: string;
  resueltaEn: string | null;
  motivo: string | null;
  creadaEn: string;
};

export const quien = (a: Aprobacion) => `${a.agente}${a.via ? ` vía ${a.via}` : ""}`;

/** "vence en 23 h" / "vence en 2 días". */
export function venceEn(iso: string, ahora: number) {
  const h = Math.max(0, Math.round((new Date(iso).getTime() - ahora) / 3_600_000));
  return h < 48 ? `vence en ${h} h` : `vence en ${Math.round(h / 24)} días`;
}

export const RIESGO = {
  alto: { etiqueta: "Riesgo alto", tono: "danger" },
  medio: { etiqueta: "Riesgo medio", tono: "warning" },
} as const;

export const ESTADO = {
  pendiente: { etiqueta: "Pendiente", tono: "warning" },
  aprobada: { etiqueta: "Aprobada", tono: "success" },
  rechazada: { etiqueta: "Rechazada", tono: "danger" },
  vencida: { etiqueta: "Vencida", tono: "neutro" },
} as const;
