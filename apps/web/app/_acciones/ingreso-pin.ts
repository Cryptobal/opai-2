"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { entrarConPin } from "@opai/auth";
import { normalizarRut } from "@opai/domain";

import { ipDeCabeceras, permitir } from "@/lib/rate-limit";

/**
 * Ingreso de Trabajador con RUT + PIN (CAR-78 · B1, D-02). El tope se aplica ANTES de mirar si el RUT
 * existe y es el mismo exista o no (sin enumeración): 5 intentos por RUT y 30 por origen cada 15
 * minutos, con fallo cerrado (si la base de límites cae, se deniega). Lo demás —bloqueo por credencial,
 * hash, auditoría— vive en `@opai/auth`. Esta acción no es una capacidad: abre una sesión.
 */
export type EstadoPin =
  | { tipo: "inicial" }
  | { tipo: "error"; n: number }
  | { tipo: "pausado"; n: number }
  /** PIN temporal correcto: falta elegir el propio. No hay sesión hasta entonces (B3 del Revisor). */
  | { tipo: "cambiar"; n: number; mensaje?: string };

const VENTANA_MS = 15 * 60_000;
const INTENTOS_RUT = 5;
const INTENTOS_ORIGEN = 30;

export async function accionEntrarConPin(previo: EstadoPin, form: FormData): Promise<EstadoPin> {
  const n = ("n" in previo ? previo.n : 0) + 1;
  const rutEscrito = String(form.get("rut") ?? "");
  const pin = String(form.get("pin") ?? "");
  const nuevo = form.get("nuevo") === null ? undefined : String(form.get("nuevo"));
  if (nuevo !== undefined && nuevo !== String(form.get("repetir") ?? "")) {
    return { tipo: "cambiar", n, mensaje: "Los PIN nuevos no coinciden." };
  }
  const rut = normalizarRut(rutEscrito);
  // Un RUT que no se puede leer cuenta contra su propia clave: mismo comportamiento que uno inexistente.
  const clave =
    rut ??
    `invalido:${rutEscrito
      .replace(/[^0-9kK]/g, "")
      .toUpperCase()
      .slice(0, 12)}`;
  const origen = ipDeCabeceras(await headers());
  const [porOrigen, porRut] = [
    await permitir(`pin-origen:${origen}`, INTENTOS_ORIGEN, VENTANA_MS, { fallarCerrado: true }),
    await permitir(`pin-rut:${clave}`, INTENTOS_RUT, VENTANA_MS, { fallarCerrado: true }),
  ];
  if (!porOrigen || !porRut) return { tipo: "pausado", n };
  const r = await entrarConPin(rutEscrito, pin, nuevo);
  if (r.ok) redirect(`/elegir-empresa?next=${encodeURIComponent("/trabajador")}`);
  if (r.fallo === "cambiar") return { tipo: "cambiar", n };
  if (r.fallo === "nuevo_invalido") return { tipo: "cambiar", n, mensaje: r.mensaje };
  return { tipo: "error", n };
}
