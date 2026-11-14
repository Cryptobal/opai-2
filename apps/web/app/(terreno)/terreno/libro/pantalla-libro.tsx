"use client";

import { useCallback, useEffect, useState } from "react";

import { formatearFechaHora } from "@opai/domain";
import { Alerta, Badge, Button, Empty, Loading } from "@opai/ds";
import { LinkNext } from "@/app/_components/link-next";

import { usePersonaElegida } from "@/lib/terreno/persona";

import { ReportarNovedad } from "../_componentes/reportar-novedad";

type Novedad = {
  id: string;
  codigo: string;
  gravedad: "baja" | "media" | "alta";
  estado: string;
  resumen: string;
  detalle: string | null;
  personaId: string | null;
  horaHecho: string;
};

const TONO = { baja: "neutro", media: "warning", alta: "danger" } as const;
const GRAVEDAD = { baja: "Baja", media: "Media", alta: "Incidente" } as const;
const ESTADO: Record<string, string> = {
  abierta: "Abierta",
  en_atencion: "En atención",
  resuelta: "Resuelta",
  cerrada: "Cerrada",
  derivada: "Derivada",
};

/**
 * Libro de novedades de la instalación en el equipo de terreno (CAR-77 parte 3, export-terreno «Libro Novedades»):
 * las últimas novedades con su número, hora y gravedad, y «Nueva novedad», que va a la cola del teléfono.
 */
export function PantallaLibro() {
  const persona = usePersonaElegida();
  const [items, setItems] = useState<Novedad[] | null>(null);
  const [falla, setFalla] = useState(false);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let vivo = true;
    fetch("/api/terreno/libro", { cache: "no-store", credentials: "same-origin" })
      .then((r) =>
        r.ok ? (r.json() as Promise<{ items: Novedad[] }>) : Promise.reject(new Error()),
      )
      .then((x) => {
        if (!vivo) return;
        setItems(x.items);
        setFalla(false);
      })
      .catch(() => vivo && setFalla(true));
    return () => {
      vivo = false;
    };
  }, [version]);
  useEffect(() => {
    const cada = window.setInterval(recargar, 30_000);
    window.addEventListener("online", recargar);
    return () => {
      window.clearInterval(cada);
      window.removeEventListener("online", recargar);
    };
  }, [recargar]);

  if (persona === undefined) return null;
  const marco = "mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 pt-safe pb-safe";
  if (!persona) {
    return (
      <main className={marco}>
        <Alerta tono="warning" titulo="Elige tu nombre primero">
          El libro necesita saber quién escribe cada novedad.
        </Alerta>
        <LinkNext href="/terreno" className="font-medium underline">
          Volver al inicio
        </LinkNext>
      </main>
    );
  }
  return (
    <main className={marco}>
      <h1 className="t-title text-fg">Libro de novedades</h1>
      <ReportarNovedad personaId={persona.id} desdeLibro alGuardar={recargar} />
      {!items && !falla ? <Loading variante="lista" /> : null}
      {falla ? (
        <Alerta
          tono="warning"
          titulo={items ? "No se pudo actualizar" : "No se pudo cargar el libro"}
          accion={
            <Button variant="secondary" onClick={recargar}>
              Reintentar
            </Button>
          }
        >
          {items ? "Lo que ves puede estar desactualizado." : "Revisa tu conexión."}
        </Alerta>
      ) : null}
      {items?.length === 0 ? (
        <Empty
          titulo="Sin novedades"
          descripcion="Lo que anotes aquí queda en el libro de la instalación."
        />
      ) : null}
      {items && items.length > 0 ? (
        <ul
          aria-label="Novedades"
          className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface"
        >
          {items.map((n) => (
            <li key={n.id} className="flex flex-col gap-1 p-3">
              <p className="text-sm text-fg-muted">
                {n.codigo} · {formatearFechaHora(n.horaHecho)}
                {n.personaId === persona.id ? " · tú" : ""}
              </p>
              <p className="text-fg">{n.resumen}</p>
              <div className="flex gap-2">
                <Badge tono={TONO[n.gravedad]}>{GRAVEDAD[n.gravedad]}</Badge>
                <Badge>{ESTADO[n.estado] ?? n.estado}</Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
