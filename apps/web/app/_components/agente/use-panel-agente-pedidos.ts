"use client";

import { useEffect } from "react";

import type { SolicitudAgente } from "./abrir-agente";
import { solicitudDesdePantalla, suscribirFichaActual } from "./contexto-pantalla-agente";
import type { useAgente } from "./use-agente";
import type { useHistorial } from "./use-historial";

/** Reacciona a pedidos externos y a cambios de ficha mientras el panel está abierto. */
export function usePanelAgentePedidos(
  abierto: boolean,
  solicitud: (SolicitudAgente & { n: number }) | null,
  a: ReturnType<typeof useAgente>,
  h: ReturnType<typeof useHistorial>,
) {
  const { cargar, sobreFicha, quitarFicha } = a;
  const { abrir } = h;
  useEffect(() => {
    if (!solicitud) return;
    const { conversacionId, contexto, etiqueta } = solicitud;
    if (conversacionId) {
      void abrir(conversacionId).then((r) => r && cargar(conversacionId, r.hilo, r.meta));
    } else if (contexto) sobreFicha({ contexto, etiqueta });
  }, [solicitud, abrir, cargar, sobreFicha]);
  useEffect(() => {
    if (!abierto) return;
    return suscribirFichaActual(() => {
      const { contexto, etiqueta } = solicitudDesdePantalla();
      if (contexto) sobreFicha({ contexto, etiqueta });
      else quitarFicha();
    });
  }, [abierto, sobreFicha, quitarFicha]);
}