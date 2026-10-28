/**
 * Cargas de pantalla (CAR-50): un fallo nunca se muestra como «vacío» ni como «no encontrado».
 * Las páginas con patrón pasan `estadoPantalla(r)` a su `state`; las cargas sin patrón usan
 * `exigirDatos(r)` dentro del `cargar` de `PaginaPortal`, que atrapa el fallo en el servidor y muestra
 * `ErrorState` o `Forbidden` dentro del shell (`ErrorCarga`), sin JavaScript de cliente (ADR-037).
 */
import { unstable_rethrow } from "next/navigation";

type ResultadoCarga<T> =
  { ok: true; data: T } | { ok: false; error: { code: string; message?: string } };

/** Error de una carga: solo lleva el código de la capacidad, nunca su mensaje ni datos. */
export class CargaFallida extends Error {
  readonly code: string;
  constructor(code: string) {
    super(`Falló una carga de pantalla (${code}).`);
    this.name = "CargaFallida";
    this.code = code;
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

/**
 * Qué mostrar si `cargar` lanzó: «sin permisos» para un FORBIDDEN, «error» para lo demás. Redirecciones,
 * 404 y señales internas de Next se vuelven a lanzar (`unstable_rethrow`). El fallo se registra en el
 * servidor como lo haría Next; en pantalla no aparece ningún detalle técnico.
 */
export function falloDeCarga(e: unknown): "forbidden" | "error" {
  unstable_rethrow(e);
  if (e instanceof CargaFallida && e.code === "FORBIDDEN") return "forbidden";
  console.error(e);
  return "error";
}
