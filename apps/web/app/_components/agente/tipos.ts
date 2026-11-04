export type Modelo = {
  proveedor: "ia_anthropic" | "ia_openai" | "ia_google" | "ia_compatible" | "ia_xai";
  modelo: string;
  clase: "economica" | "estandar" | "potente";
};
/** Ficha desde la que se pregunta al agente (R9). */
export type Contexto = { tipo: "cuenta" | "instalacion" | "negocio" | "persona"; id: string };
export type Nivel = "aprobar_todo" | "paso_a_paso";

export type PasoPlan = {
  capacidad: string;
  argumentos: unknown;
  clave: string;
  vistaPrevia: { data: unknown };
};
export type Turno = {
  conversacionId: string | null;
  token: string | null;
  texto: string;
  pasos: PasoPlan[];
  tokens: number;
};
export type Resolucion = {
  estado: "completo" | "rechazado" | "fallido" | "aprobacion" | "pendiente" | "prevista";
  resultados: { paso: number; ok: boolean; code?: string; aprobacionId?: string }[];
  siguiente: string | null;
};

export type EstadoPlan =
  | "propuesto"
  | "ejecutando"
  | "en_curso"
  | "completo"
  | "rechazado"
  | "fallido"
  | "aprobacion"
  | "vencido";
export type PlanVista = {
  pasos: PasoPlan[];
  nivel: Nivel;
  token: string | null;
  /** Índice del próximo paso por ejecutar. */
  siguiente: number;
  resultados: Resolucion["resultados"];
  estado: EstadoPlan;
  vence: number;
  error?: string;
};
export type Mensaje = {
  id: string;
  rol: "yo" | "agente";
  texto: string;
  error?: string;
  /** Aviso que no invalida la respuesta (p. ej. no quedó en el historial). */
  aviso?: string;
  plan?: PlanVista;
};

/** El plan firmado vale una hora (`VIGENCIA_PLAN_MS` en `modules/agente/planes.ts`). */
export const VIGENCIA_PLAN_MS = 3_600_000;
