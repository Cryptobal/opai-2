// Utilidades HTTP compartidas por los adaptadores de IA. Ningún mensaje de error incluye la key.
import type { ProveedorIa } from "./contrato";

/**
 * Error de un proveedor de IA. `estado` es el código HTTP, o null ante un fallo de red o timeout.
 * `reintentable` marca lo que la cadena de respaldo puede reintentar con otro proveedor (ADR-049):
 * 5xx, 429 y fallos de red; nunca un 4xx de contenido.
 */
export class ErrorIa extends Error {
  constructor(
    readonly proveedor: string,
    readonly estado: number | null,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorIa";
  }
  get reintentable(): boolean {
    return this.estado === null || this.estado === 429 || this.estado >= 500;
  }
}

/** Lanza `ErrorIa` con el código HTTP si la respuesta no es `ok`. Nunca filtra el cuerpo ni la key. */
export function exigirOk(r: Response, proveedor: string): void {
  if (!r.ok) throw new ErrorIa(proveedor, r.status, `${proveedor} respondió ${r.status}.`);
}

export async function cuerpo<T>(r: Response, proveedor: string): Promise<T> {
  exigirOk(r, proveedor);
  return (await r.json()) as T;
}

/**
 * `fetch` que convierte un fallo de red o timeout en un `ErrorIa` reintentable (estado null). Fuerza
 * `redirect: "error"`: un 3xx no se sigue, así la key nunca viaja a un destino redirigido (SSRF).
 */
export async function pedir(
  url: string,
  init: RequestInit,
  proveedor: string,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, redirect: "error" });
  } catch {
    throw new ErrorIa(proveedor, null, `${proveedor}: fallo de red o timeout.`);
  }
}

/**
 * Lee un cuerpo SSE y entrega el contenido de cada línea `data:` (salta los `[DONE]`). Libera el
 * lector al terminar o al cancelarse el consumo, y convierte un corte de red en un `ErrorIa`.
 */
export async function* leerSSE(r: Response, proveedor: string): AsyncGenerator<string> {
  exigirOk(r, proveedor);
  const reader = r.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  const leer = async () => {
    try {
      return await reader.read();
    } catch {
      throw new ErrorIa(proveedor, null, `${proveedor}: stream interrumpido.`);
    }
  };
  try {
    for (;;) {
      const { done, value } = await leer();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let corte = buffer.indexOf("\n");
      while (corte >= 0) {
        const linea = buffer.slice(0, corte).trim();
        buffer = buffer.slice(corte + 1);
        if (linea.startsWith("data:")) {
          const payload = linea.slice(5).trim();
          if (payload && payload !== "[DONE]") yield payload;
        }
        corte = buffer.indexOf("\n");
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

/** Implementa `completar` (un turno de texto) sobre `conversar`, para no duplicar el HTTP. */
export function completarDesdeConversar(
  self: Pick<ProveedorIa, "conversar">,
): ProveedorIa["completar"] {
  return async (modelo, s) => {
    const r = await self.conversar(modelo, {
      mensajes: [
        ...(s.sistema ? ([{ rol: "sistema", texto: s.sistema }] as const) : []),
        { rol: "usuario", texto: s.prompt },
      ],
      ...(s.maxTokens !== undefined ? { maxTokens: s.maxTokens } : {}),
    });
    return {
      texto: r.texto,
      tokensEntrada: r.uso.tokensEntrada,
      tokensSalida: r.uso.tokensSalida,
      modelo: r.modelo,
      proveedor: r.proveedor,
    };
  };
}
