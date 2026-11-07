"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Alerta, Button, Loading } from "@opai/ds";

const MarcarPunto = dynamic(() => import("./marcar-punto").then((m) => m.MarcarPunto), {
  ssr: false,
});

type Turno = {
  personaId: string;
  nombre: string;
  iniciales: string;
  inicio: string;
  fin: string;
  estado: "en_curso" | "proximo" | "terminado";
};
type Contexto = {
  instalacion: { nombre: string };
  turnos: Turno[];
  modulos: { rondas: boolean };
};

const ETIQUETA = { en_curso: "En turno", proximo: "Entra después", terminado: "Terminó" } as const;
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

/**
 * «Turno de ahora» (CAR-78 · E2): quién cubre la instalación del equipo según el turno esperado. Lee del
 * servidor; sin conexión no inventa nada: dice que no pudo actualizar y conserva lo último que leyó.
 */
export function TurnoAhora({ personaId }: { personaId: string }) {
  const [c, setC] = useState<Contexto | null>(null);
  const [falla, setFalla] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let vivo = true;
    fetch("/api/terreno/contexto", { cache: "no-store", credentials: "same-origin" })
      .then((r) =>
        r.ok ? (r.json() as Promise<Contexto>) : Promise.reject(new Error(String(r.status))),
      )
      .then((x) => {
        if (!vivo) return;
        setC(x);
        setFalla(false);
      })
      .catch(() => vivo && setFalla(true));
    return () => {
      vivo = false;
    };
  }, [version]);
  useEffect(() => {
    const actualizar = () => setVersion((v) => v + 1);
    const cada = window.setInterval(actualizar, 60_000);
    window.addEventListener("online", actualizar);
    return () => {
      window.clearInterval(cada);
      window.removeEventListener("online", actualizar);
    };
  }, []);
  const cargar = () => setVersion((v) => v + 1);

  if (!c && !falla) return <Loading variante="lista" />;
  return (
    <>
      <section aria-label="Turno de ahora" className="flex flex-col gap-2">
        <h2 className="t-heading text-fg">Turno de ahora</h2>
        {falla ? (
          <Alerta
            tono="warning"
            titulo={c ? "No se pudo actualizar" : "No se pudo cargar el turno"}
            accion={
              <Button variant="secondary" onClick={cargar}>
                Reintentar
              </Button>
            }
          >
            {c ? "Lo que ves puede estar desactualizado." : "Revisa tu conexión."}
          </Alerta>
        ) : null}
        {c && c.turnos.length === 0 ? (
          <p className="text-base text-fg-muted">
            No hay turnos cargados para esta instalación por ahora.
          </p>
        ) : null}
        {c && c.turnos.length > 0 ? (
          <ul className="overflow-hidden rounded-lg border border-border bg-surface">
            {c.turnos.map((t) => (
              <li
                key={`${t.personaId}-${t.inicio}`}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="flex flex-col">
                  <span className="text-base text-fg">{t.nombre}</span>
                  <span className="text-sm text-fg-muted">{ETIQUETA[t.estado]}</span>
                </span>
                <span className="t-mono text-sm text-fg-muted">
                  {hora(t.inicio)}–{hora(t.fin)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      {c?.modulos.rondas ? <MarcarPunto personaId={personaId} /> : null}
    </>
  );
}
