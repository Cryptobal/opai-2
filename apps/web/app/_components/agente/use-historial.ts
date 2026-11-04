"use client";

import { useCallback, useEffect, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import type { Mensaje } from "./tipos";

export type Resumen = {
  id: string;
  titulo: string;
  mensajes: number;
  ultimaActividad: string;
};
type Guardado = { rol: "usuario" | "agente"; texto: string; pasos?: string[] };

const nuevoId = () => crypto.randomUUID();

/** Lista de conversaciones guardadas de la persona: abrir una y borrarla (spec agente §3.5, R19). */
export function useHistorial(portal: string, activo: boolean) {
  const [lista, setLista] = useState<Resumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consultar = useCallback(async (): Promise<Resumen[] | string> => {
    try {
      const r = await ejecutarCapacidad(portal, "agente.conversaciones.list", {});
      return r.ok ? (r.data as Resumen[]) : "No pudimos cargar tus conversaciones.";
    } catch {
      return "No hay conexión con OPAI. Reintenta en unos minutos.";
    }
  }, [portal]);

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    void consultar().then((r) => {
      if (!vivo) return;
      setError(typeof r === "string" ? r : null);
      if (typeof r !== "string") setLista(r);
    });
    return () => {
      vivo = false;
    };
  }, [activo, consultar]);

  const abrir = useCallback(
    async (id: string): Promise<Mensaje[] | null> => {
      try {
        const r = await ejecutarCapacidad(portal, "agente.conversaciones.get", { id });
        if (!r.ok) return (setError("No pudimos abrir esa conversación."), null);
        const { historial } = r.data as { historial: Guardado[] };
        return historial.map((m) => ({
          id: nuevoId(),
          rol: m.rol === "usuario" ? "yo" : "agente",
          texto: m.texto,
        }));
      } catch {
        return (setError("No hay conexión con OPAI. Reintenta en unos minutos."), null);
      }
    },
    [portal],
  );

  const borrar = useCallback(
    async (id: string) => {
      try {
        const r = await ejecutarCapacidad(
          portal,
          "agente.conversaciones.borrar",
          { id },
          false,
          "ninguna",
          nuevoId(),
        );
        if (!r.ok) return setError("No pudimos borrar la conversación.");
        setLista((l) => l?.filter((c) => c.id !== id) ?? null);
      } catch {
        setError("No hay conexión con OPAI. No se borró nada.");
      }
    },
    [portal],
  );

  return { lista, error, abrir, borrar };
}
