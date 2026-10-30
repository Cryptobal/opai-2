"use client";

import { Button, Empty, Sheet, Timeline, type ItemTimeline } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";

import { fechaCl, MOTIVO } from "./etiquetas";
import type { LineaHistorial, Motivo } from "./tipos";

const cuando = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(",", "")
    .replaceAll("/", "-");

function item(l: LineaHistorial): ItemTimeline {
  const rango = l.desde === l.hasta ? fechaCl(l.desde) : `${fechaCl(l.desde)} al ${fechaCl(l.hasta)}`;
  const accion =
    l.accion === "serie_fijada"
      ? `fijó la serie de ${l.puesto}`
      : l.accion === "excepcion_creada"
        ? `registró ${MOTIVO[l.detalle["tipo"] as Motivo] ?? "una excepción"} en ${l.puesto}`
        : `anuló excepciones de ${l.puesto}`;
  const meta =
    l.accion === "serie_fijada"
      ? `Patrón ${String(l.detalle["patron"] ?? "")} desde ${rango}. Los días anteriores no cambiaron.`
      : l.accion === "excepcion_creada"
        ? `${rango} · ${String(l.detalle["dias"] ?? "")} días de turno`
        : rango;
  const agente = l.actorTipo === "agent";
  return {
    id: l.id,
    actor: { nombre: l.actorNombre ?? (agente ? "Agente" : "Sistema"), agente },
    accion,
    cuando: cuando(l.creadoEn),
    meta,
  };
}

/** P04: historial de cambios de la pauta (quién, cuándo, qué), abierto por `?historial=1`. */
export function HojaHistorial({ lineas }: { lineas: readonly LineaHistorial[] | null }) {
  const hoja = useHojaUrl("historial");
  if (!hoja.abierta) return null;
  return (
    <Sheet
      abierto
      onCerrar={hoja.cerrar}
      titulo="Historial de cambios"
      descripcion="Quién cambió la pauta, cuándo y qué."
      acciones={
        <Button variant="secondary" onClick={hoja.cerrar}>
          Cerrar
        </Button>
      }
    >
      {lineas && lineas.length > 0 ? (
        <Timeline items={lineas.map(item)} />
      ) : (
        <Empty titulo="Aún no hay cambios" descripcion="Los cambios de series y excepciones aparecerán aquí." />
      )}
    </Sheet>
  );
}
