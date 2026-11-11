"use client";

import { Pin } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { AccesoRapido, Button, type ItemFijado, SeccionTarjeta, Skeleton } from "@opai/ds";

import { useAccesos } from "@/app/_components/accesos-contexto";

import { juntarAccesos, MAXIMO_FIJADOS, ofreceEditar } from "./accesos-armar";

const sinSuscripcion = () => () => undefined;
/** Falso en el servidor y al hidratar, verdadero después: evita el desajuste con lo que solo existe en el navegador. */
const useEnNavegador = () =>
  useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
/** Si el shell no entrega los fijados en este tiempo, se muestra la lista (vacía) en vez del esqueleto. */
const ESPERA_MS = 8000;

/**
 * «Tus accesos» (CAR-182): los fijados del usuario (preferencia `navegacion_fijados`, ya cargada por
 * el shell) y sus recientes del navegador. Tres en teléfono, cinco desde 768 px. «Editar» fija o desfija.
 */
export function AccesosInicio() {
  const a = useAccesos();
  const [editando, setEditando] = useState(false);
  const [agotado, setAgotado] = useState(false);
  const listo = useEnNavegador();
  const leer = a?.recientes;
  const fijados = a?.fijados;
  // Los recientes viven en el navegador: se leen una vez montado, nunca en el render del servidor.
  const recientes = useMemo(() => (listo ? (leer?.() ?? []) : []), [listo, leer]);
  const lista = useMemo(() => juntarAccesos(fijados ?? [], recientes), [fijados, recientes]);
  useEffect(() => {
    const t = setTimeout(() => setAgotado(true), ESPERA_MS);
    return () => clearTimeout(t);
  }, []);
  if (!a) return null;
  const sets = new Set((fijados ?? []).map((f) => f.href));
  const accionDe = (i: ItemFijado) =>
    sets.has(i.href) && a.onDesfijar
      ? { accion: "desfijar" as const, onAccion: () => a.onDesfijar?.(i.href) }
      : !sets.has(i.href) && a.onFijar && sets.size < MAXIMO_FIJADOS
        ? { accion: "fijar" as const, onAccion: () => a.onFijar?.(i) }
        : undefined;
  const editable = lista.some((i) => accionDe(i));
  return (
    <SeccionTarjeta
      titulo="Tus accesos"
      accion={
        ofreceEditar(listo, editable, editando) ? (
          <Button variant="ghost" onClick={() => setEditando((v) => !v)}>
            {editando ? "Listo" : "Editar"}
          </Button>
        ) : null
      }
    >
      {a.error ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-base text-fg-muted">No pudimos cargar tus fijados.</p>
          {a.reintentar ? (
            <Button variant="ghost" onClick={a.reintentar}>
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : !listo || (fijados === undefined && !agotado) ? (
        <div aria-hidden className="flex gap-2">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-11 w-28 rounded-md" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="flex items-start gap-2 text-base text-fg-muted">
          <Pin className="mt-0.5 size-4 flex-none" aria-hidden />
          Fija las páginas que más usas desde el menú y aparecerán aquí.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {lista.map((i, n) => {
            const edicion = editando ? accionDe(i) : undefined;
            return (
              <li key={i.href} className={n >= 3 ? "hidden min-w-0 md:block" : "min-w-0"}>
                <AccesoRapido
                  item={i}
                  activo={a.rutaActual === i.href}
                  fijado={sets.has(i.href)}
                  onNavegar={a.onNavegar}
                  {...(edicion ? { edicion } : {})}
                />
              </li>
            );
          })}
        </ul>
      )}
    </SeccionTarjeta>
  );
}
