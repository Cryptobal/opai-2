"use client";

import { useCallback, useEffect, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { useBusquedaDiferida } from "./use-busqueda";
import type { MetaConversacion } from "./use-agente";
import type { Mensaje } from "./tipos";

export type Resumen = {
  id: string;
  titulo: string;
  mensajes: number;
  ultimaActividad: string;
  archivada: boolean;
};
type Guardado = { rol: "usuario" | "agente"; texto: string; pasos?: string[] };

const nuevoId = () => crypto.randomUUID();
const SIN_RED = "No hay conexión con OPAI. Reintenta en unos minutos.";

/**
 * Conversaciones guardadas de la persona (spec agente §3.5, R19): listar (activas o archivadas),
 * buscar por título en el servidor, abrir, renombrar, archivar y borrar. Las escrituras llevan
 * `idempotencyKey` y usan las mismas capacidades que el MCP.
 */
export function useHistorial(portal: string, activo: boolean, archivadas = false, busqueda = "") {
  const q = useBusquedaDiferida(busqueda);
  type Carga = { archivadas: boolean; q: string; filas: Resumen[] };
  const [cargada, setCargada] = useState<Carga | null>(null);
  // La lista de otra pestaña o de otra búsqueda no se muestra mientras llega la nueva.
  const vigente = cargada?.archivadas === archivadas && cargada.q === q;
  const lista = vigente ? cargada.filas : null;
  /** Texto con el que se obtuvo la lista que se ve (para «Sin resultados para …»). */
  const buscado = vigente ? cargada.q : "";
  const setLista = (f: (l: Resumen[] | null) => Resumen[] | null) =>
    setCargada((c) => (c ? { ...c, filas: f(c.filas) ?? [] } : c));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    void ejecutarCapacidad(portal, "agente.conversaciones.list", {
      archivadas,
      limite: 50,
      ...(q ? { q } : {}),
    })
      .then((r) => {
        if (!vivo) return;
        setError(r.ok ? null : "No pudimos cargar tus conversaciones.");
        if (r.ok) setCargada({ archivadas, q, filas: r.data as Resumen[] });
      })
      .catch(() => vivo && setError(SIN_RED));
    return () => {
      vivo = false;
    };
  }, [activo, archivadas, portal, q]);

  const abrir = useCallback(
    async (id: string): Promise<{ hilo: Mensaje[]; meta: MetaConversacion } | null> => {
      try {
        const r = await ejecutarCapacidad(portal, "agente.conversaciones.get", { id });
        if (!r.ok) return (setError("No pudimos abrir esa conversación."), null);
        const { historial, titulo, archivada } = r.data as {
          historial: Guardado[];
          titulo: string;
          archivada: boolean;
        };
        const hilo = historial.map((m) => ({
          id: nuevoId(),
          rol: m.rol === "usuario" ? ("yo" as const) : ("agente" as const),
          texto: m.texto,
        }));
        return { hilo, meta: { titulo, archivada } };
      } catch {
        return (setError(SIN_RED), null);
      }
    },
    [portal],
  );

  /** Escritura sobre una conversación: devuelve si se hizo; si no, deja el error visible. */
  const intentar = useCallback(
    async (llamada: () => Promise<{ ok: boolean }>, fallo: string): Promise<boolean> => {
      try {
        const r = await llamada();
        setError(r.ok ? null : fallo);
        return r.ok;
      } catch {
        setError(`${SIN_RED} No se cambió nada.`);
        return false;
      }
    },
    [],
  );

  const quitar = (id: string) => setLista((l) => l?.filter((c) => c.id !== id) ?? null);
  const borrar = async (id: string) => {
    const ok = await intentar(
      () =>
        ejecutarCapacidad(
          portal,
          "agente.conversaciones.borrar",
          { id },
          false,
          "ninguna",
          nuevoId(),
        ),
      "No pudimos borrar la conversación.",
    );
    if (ok) quitar(id);
    return ok;
  };
  const archivar = async (id: string, archivar: boolean) => {
    const ok = await intentar(
      () =>
        ejecutarCapacidad(
          portal,
          "agente.conversaciones.archivar",
          { id, archivar },
          false,
          "ninguna",
          nuevoId(),
        ),
      "No pudimos archivar la conversación.",
    );
    if (ok) quitar(id);
    return ok;
  };
  const renombrar = async (id: string, titulo: string) => {
    const ok = await intentar(
      () =>
        ejecutarCapacidad(
          portal,
          "agente.conversaciones.renombrar",
          { id, titulo },
          false,
          "ninguna",
          nuevoId(),
        ),
      "No pudimos cambiar el título.",
    );
    if (ok) setLista((l) => l?.map((c) => (c.id === id ? { ...c, titulo } : c)) ?? null);
    return ok;
  };

  return { lista, buscado, error, abrir, borrar, archivar, renombrar };
}
