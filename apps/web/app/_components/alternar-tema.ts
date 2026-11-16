"use client";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";
import { aplicarTema, temaContrario } from "@/lib/tema";

/** Botón de tema de la barra: pasa al contrario de lo que se ve y lo guarda como preferencia. */
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
