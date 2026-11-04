"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useCallback, useEffect, useState } from "react";

// Ni el botón ni el panel pesan en el JS inicial: se descargan solo donde el agente existe (ADR-037).
const PanelAgente = dynamic(() => import("./panel-agente").then((m) => m.PanelAgente), {
  ssr: false,
});
const BotonAgente = dynamic(() => import("./boton-agente").then((m) => m.BotonAgente));

/**
 * Agente interno en el shell (CAR-120): estado abierto/cerrado, atajo Ctrl/⌘+J, el lanzador para la
 * barra y el panel. Sin licencia o sin `agente:usar` (`disponible` falso) no hay botón ni atajo.
 */
export function useAgenteShell(disponible: boolean, portal: string) {
  const [abierto, setAbierto] = useState(false);
  const alternar = useCallback(() => setAbierto((v) => !v), []);
  useEffect(() => {
    if (!disponible) return;
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAbierto((v) => !v);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [disponible]);
  const lanzador: ReactNode = disponible ? (
    <BotonAgente abierto={abierto} onAlternar={alternar} />
  ) : undefined;
  const panel: ReactNode = disponible ? (
    <PanelAgente abierto={abierto} onCerrar={() => setAbierto(false)} portal={portal} />
  ) : null;
  return { lanzador, panel };
}
