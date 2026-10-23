// Errores de Google Maps Platform con el estado y el mensaje del proveedor, sin la clave.

const MAX_MENSAJE = 300;

/** Falla de Google Maps: `http` (0 si no hubo respuesta), `estado` de Google y su mensaje. */
export class ErrorGoogle extends Error {
  readonly http: number;
  readonly estado: string | null;
  readonly api: string;

  constructor(api: string, http: number, estado: string | null, mensaje: string) {
    super(
      `Google Maps rechazó la solicitud (${api}): ${[http || null, estado].filter(Boolean).join(" ")} — ${mensaje}`,
    );
    this.name = "ErrorGoogle";
    this.api = api;
    this.http = http;
    this.estado = estado;
  }
}

/** Quita la clave del texto (por si el proveedor la repite) y lo acota. */
export function sinClave(texto: string, clave: string): string {
  const limpio = clave ? texto.split(clave).join("[clave]") : texto;
  return limpio.replace(/\s+/g, " ").trim().slice(0, MAX_MENSAJE);
}

/** Registra la falla (status y mensaje de Google; nunca la clave) y devuelve el error a lanzar. */
export function fallaDeGoogle(
  clave: string,
  api: string,
  http: number,
  estado: string | null,
  mensaje: string,
): ErrorGoogle {
  const limpio = sinClave(mensaje || "Sin detalle.", clave);
  console.error(JSON.stringify({ evento: "geo.google.error", api, http, estado, mensaje: limpio }));
  return new ErrorGoogle(api, http, estado, limpio);
}

type CuerpoError = { error?: { code?: number; status?: string; message?: string } };

/** Convierte una respuesta HTTP fallida (Places API New) en `ErrorGoogle` leyendo su cuerpo. */
export async function errorDeRespuesta(r: Response, api: string, clave: string) {
  let cuerpo: CuerpoError = {};
  try {
    cuerpo = (await r.json()) as CuerpoError;
  } catch {
    // Cuerpo vacío o no JSON: se informa solo el código HTTP.
  }
  return fallaDeGoogle(
    clave,
    api,
    r.status,
    cuerpo.error?.status ?? null,
    cuerpo.error?.message ?? r.statusText,
  );
}
