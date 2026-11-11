"use client";

import { avisar } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { cookieMarco, type Marco } from "@/lib/marco";
import { aplicarTema, temaContrario } from "@/lib/tema";

/** Recuerda el marco en este navegador y recarga: el servidor pinta el otro marco desde cero. */
function aplicar(marco: Marco) {
  document.cookie = cookieMarco(marco);
  window.location.reload();
}

/**
 * Cambia el marco de la persona (Preferencias y el atajo del menú): guarda la preferencia y, solo si
 * quedó guardada, la aplica. Si falla, avisa y no cambia nada.
 */
export async function cambiarMarco(portal: string, marco: Marco): Promise<boolean> {
  const r = await ejecutarCapacidad(
    portal,
    "core.config.set",
    { modulo: "core", clave: "preferencias_marco", valor: marco },
    false,
    "ninguna",
  ).catch(() => ({ ok: false }) as const);
  if (!r.ok) {
    avisar.error("No pudimos cambiar el diseño. Reintenta.");
    return false;
  }
  aplicar(marco);
  return true;
}

/** Botón de tema del marco Hilo: pasa al contrario de lo que se ve y lo guarda como preferencia. */
export function alternarTema(portal: string) {
  const tema = temaContrario(
    document.documentElement.dataset["theme"],
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  aplicarTema(tema);
  void ejecutarCapacidad(
    portal,
    "core.config.set",
    { modulo: "core", clave: "preferencias_tema", valor: tema },
    false,
    "ninguna",
  ).catch(() => undefined);
}
