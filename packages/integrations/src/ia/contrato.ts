// Contrato neutral de IA por HTTP, sin SDKs (ADR-031, ADR-049). Los módulos piden una clase de
// tarea (económica, estándar, potente) y el núcleo resuelve proveedor y modelo. Este contrato suma
// conversación con herramientas, streaming y salida estructurada para el agente interno (ADR-049);
// `completar` (un turno de texto) se conserva tal cual para geolocalización y "probar integración".

export type ClaseTarea = "economica" | "estandar" | "potente";
export const CLASES_TAREA: readonly ClaseTarea[] = ["economica", "estandar", "potente"];
export type ProveedorIaId = "ia_anthropic" | "ia_openai" | "ia_google" | "ia_compatible" | "ia_xai";

/** Compatibilidad: un solo turno de texto (sin herramientas). */
export type SolicitudIa = { sistema?: string; prompt: string; maxTokens?: number };
export type RespuestaIa = {
  texto: string;
  tokensEntrada: number;
  tokensSalida: number;
  modelo: string;
  proveedor: ProveedorIaId;
};

/** Una llamada a herramienta que pide el modelo. `argumentos` es el JSON ya parseado. */
export type LlamadaHerramienta = { id: string; nombre: string; argumentos: unknown };

/** Referencia inerte, solo válida en memoria dentro del adaptador que la emitió. */
declare const continuidadIa: unique symbol;
export type ContinuidadIa = { readonly [continuidadIa]: true };

/** Mensajes de la conversación. El resultado de herramienta viaja como texto (JSON serializado). */
export type Mensaje =
  | { rol: "sistema"; texto: string }
  | { rol: "usuario"; texto: string }
  | {
      rol: "asistente";
      texto?: string;
      llamadas?: readonly LlamadaHerramienta[];
      continuidad?: ContinuidadIa;
    }
  | { rol: "herramienta"; id: string; nombre: string; resultado: string };

/** Herramienta disponible: nombre, descripción y JSON Schema de la entrada. */
export type Herramienta = {
  nombre: string;
  descripcion: string;
  esquema: Record<string, unknown>;
};

/** Qué puede hacer el modelo con las herramientas en este turno. */
export type EleccionHerramienta = "auto" | "obligatoria" | "ninguna" | { nombre: string };

/** Salida estructurada forzada por un JSON Schema; el resultado llega en `texto` como JSON. */
export type SalidaEstructurada = { nombre: string; esquema: Record<string, unknown> };

export type Uso = { tokensEntrada: number; tokensSalida: number };
export type MotivoTermino = "fin" | "herramienta" | "longitud" | "filtro" | "otro";

export type SolicitudConversacion = {
  mensajes: readonly Mensaje[];
  herramientas?: readonly Herramienta[];
  eleccionHerramienta?: EleccionHerramienta;
  salidaEstructurada?: SalidaEstructurada;
  maxTokens?: number;
  temperatura?: number;
};

export type RespuestaConversacion = {
  continuidad?: ContinuidadIa;
  texto: string;
  llamadas: readonly LlamadaHerramienta[];
  uso: Uso;
  motivo: MotivoTermino;
  modelo: string;
  proveedor: ProveedorIaId;
};

/**
 * Eventos del stream: texto parcial, una llamada de herramienta ya armada, el uso parcial conocido
 * (acumulado) en cuanto el proveedor lo informa, y el fin con el uso total. El evento `uso` permite
 * medir lo ya consumido aunque el stream se corte o se cancele antes del `fin` (ADR-031, ADR-049).
 */
export type EventoStream =
  | { tipo: "texto"; delta: string }
  | { tipo: "herramienta"; llamada: LlamadaHerramienta }
  | { tipo: "uso"; uso: Uso }
  | { tipo: "fin"; respuesta: RespuestaConversacion };

export interface ProveedorIa {
  readonly id: ProveedorIaId;
  /** Preflight local y puro: detecta continuidad perdida incluso antes de elegir un respaldo. */
  validarContinuacion?(modelo: string, s: SolicitudConversacion): void;
  conversar(modelo: string, s: SolicitudConversacion): Promise<RespuestaConversacion>;
  conversarStream(modelo: string, s: SolicitudConversacion): AsyncIterable<EventoStream>;
  completar(modelo: string, s: SolicitudIa): Promise<RespuestaIa>;
}

/** Modelos por clase cuando el tenant no configura otros (ajuste de plataforma `ia.modelos`). */
export const MODELOS_POR_DEFECTO: Readonly<
  Partial<Record<ProveedorIaId, Record<ClaseTarea, string>>>
> = {
  ia_anthropic: {
    economica: "claude-haiku-5-5",
    estandar: "claude-sonnet-5-5",
    potente: "claude-opus-5-5",
  },
};
