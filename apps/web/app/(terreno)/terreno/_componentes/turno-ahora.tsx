"use client";

import { Alerta, Button, Loading } from "@opai/ds";

import { useContextoTerreno } from "./contexto-terreno";

const ETIQUETA = { en_curso: "En turno", proximo: "Entra después", terminado: "Terminó" } as const;
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

/**
 * «Turno de ahora» (CAR-78 · E2): quién cubre la instalación según el turno esperado. Sin los enlaces sueltos
 * a otras secciones: la barra inferior ya lleva a Rondas y Portería (CAR-801).
 */
export function TurnoAhora() {
  const { datos: c, falla, recargar } = useContextoTerreno();

  if (!c && !falla) return <Loading variante="lista" />;
  return (
    <section aria-label="Turno de ahora" className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <h2 className="t-heading text-fg">Turno de ahora</h2>
      {falla ? (
        <Alerta
          tono="warning"
          titulo={c ? "No se pudo actualizar" : "No se pudo cargar el turno"}
          accion={
            <Button variant="secondary" onClick={recargar}>
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
        <ul className="overflow-hidden rounded-md border border-border">
          {c.turnos.map((t) => (
            <li
              key={`${t.personaId}-${t.inicio}`}
              className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 last:border-b-0"
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
  );
}