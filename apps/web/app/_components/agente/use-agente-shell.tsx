"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { EVENTO_AGENTE, registrarAgente, type SolicitudAgente } from "./abrir-agente";

// Ni el botón ni el panel pesan en el JS inicial: se descargan solo donde el agente existe (ADR-037).
const PanelAgente = dynamic(() => import("./panel-agente").then((m) => m.PanelAgente), {
  ssr: false,
});
const BotonAgente = dynamic(() => import("./boton-agente").then((m) => m.BotonAgente));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Pedido = SolicitudAgente & { n: number };

/**
 * Agente interno en el shell (CAR-120): estado abierto/cerrado, atajo Ctrl/⌘+J, `?agente=1` en la URL
 * (con `&conversacion=<id>` para retomar una), el evento `opai:agente` que usan el historial, ⌘K y el
 * menú de las fichas, el lanzador para la barra y el panel. Sin licencia o sin `agente:usar`
 * (`disponible` falso) no hay botón, atajo ni escucha.
 */
export function useAgenteShell(disponible: boolean, portal: string) {
  const [abierto, setAbierto] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
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
  useEffect(() => {
    if (!disponible) return;
    const pedir = (s: SolicitudAgente) => {
      setPedido((p) => ({ ...s, n: (p?.n ?? 0) + 1 }));
      setAbierto(true);
    };
    const alEvento = (e: Event) => pedir((e as CustomEvent<SolicitudAgente>).detail ?? {});
    window.addEventListener(EVENTO_AGENTE, alEvento);
    const darDeBaja = registrarAgente();
    const url = new URL(window.location.href);
    if (url.searchParams.has("agente")) {
      const conversacion = url.searchParams.get("conversacion") ?? "";
      pedir(UUID.test(conversacion) ? { conversacionId: conversacion } : {});
      url.searchParams.delete("agente");
      url.searchParams.delete("conversacion");
      window.history.replaceState(window.history.state, "", url);
    }
    return () => {
      window.removeEventListener(EVENTO_AGENTE, alEvento);
      darDeBaja();
    };
  }, [disponible]);
  const lanzador: ReactNode = disponible ? (
    <BotonAgente abierto={abierto} onAlternar={alternar} />
  ) : undefined;
  const panel: ReactNode = disponible ? (
    <PanelAgente
      abierto={abierto}
      onCerrar={() => setAbierto(false)}
      portal={portal}
      solicitud={pedido}
    />
  ) : null;
  return { lanzador, panel };
}
