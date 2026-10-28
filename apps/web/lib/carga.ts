/**
 * Cargas de pantalla (CAR-50): un fallo nunca se muestra como «vacío» ni como «no encontrado».
 * Las páginas con patrón pasan `estadoPantalla(r)` a su `state`; las cargas sin patrón (helpers que
 * devuelven datos) usan `exigirDatos(r)`, que lanza y deja que el `error.tsx` del portal muestre
 * `ErrorState` o `Forbidden` dentro del shell.
 */
import { DIGEST_CARGA_FALLIDA, DIGEST_SIN_ACCESO } from "./carga-digest";

type ResultadoCarga<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message?: string } };

/**
 * Error de una carga. Next respeta el `digest` propio al pasar el error al cliente (en producción el
 * mensaje se omite), así el `error.tsx` distingue «sin permisos» de «error» sin ver detalles técnicos.
 */
export class CargaFallida extends Error {
  readonly digest: string;
  readonly code: string;
  constructor(code: string) {
    super(`Falló una carga de pantalla (${code}).`);
    this.name = "CargaFallida";
    this.code = code;
    this.digest = code === "FORBIDDEN" ? DIGEST_SIN_ACCESO : DIGEST_CARGA_FALLIDA;
  }
}

/** Los datos de una carga exitosa; si falló, lanza `CargaFallida` (nunca devuelve `[]` ni `null`). */
export function exigirDatos<T>(r: ResultadoCarga<T>): T {
  if (!r.ok) throw new CargaFallida(r.error.code);
  return r.data;
}

/**
 * Carga secundaria que depende de un permiso aparte (gasto de agentes, tipos de documento, sueldo):
 * sin ese permiso la sección queda con `defecto`, que es lo que el rol puede ver; cualquier otro
 * fallo lanza `CargaFallida`, porque mostrar `defecto` ocultaría el error.
 */
export function datosSiHayPermiso<T, D>(r: ResultadoCarga<T>, defecto: D): T | D {
  if (!r.ok && r.error.code === "FORBIDDEN") return defecto;
  return exigirDatos(r);
}
