"use client";

import { AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Alerta, Button } from "@opai/ds";

import { encolarHecho } from "@/lib/terreno/cola";

import type { PlantillaRonda } from "./tipos";

const MarcarPunto = dynamic(
  () => import("../_componentes/marcar-punto").then((m) => m.MarcarPunto),
  { ssr: false },
);

const ReportarNovedad = dynamic(
  () => import("../_componentes/reportar-novedad").then((m) => m.ReportarNovedad),
  { ssr: false },
);

/**
 * La ronda en curso (CAR-78 · E3e): sus puntos con lo que el servidor ya confirmó, marcar el siguiente (cámara o
 * código) y cerrar. El cierre lo evalúa el servidor; aquí solo se dice «guardado» cuando la cola lo releyó.
 */
export function RondaActiva({
  plantilla,
  clave,
  marcados,
  personaId,
  alCerrar,
}: {
  plantilla: PlantillaRonda;
  clave: string;
  marcados: ReadonlySet<string>;
  personaId: string;
  alCerrar: () => void;
}) {
  const [error, setError] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const cerrar = async () => {
    setError(false);
    setConfirmando(false);
    try {
      await encolarHecho({ tipo: "rondas.cierre", payload: { ejecucionClave: clave }, personaId });
      alCerrar();
    } catch {
      setError(true);
    }
  };
  const confirmados = plantilla.puntos.filter((p) => marcados.has(p.id)).length;
  // CAR-381: cerrar no se deshace; con puntos obligatorios pendientes se pregunta antes.
  const pendientes = plantilla.puntos.filter((p) => p.obligatorio && !marcados.has(p.id)).length;
  const pedirCierre = () => (pendientes > 0 ? setConfirmando(true) : void cerrar());
  return (
    <section aria-label="Ronda en curso" className="flex flex-col gap-3">
      <h2 className="t-heading text-fg">{plantilla.nombre}</h2>
      <p className="text-sm text-fg-muted">
        {confirmados} de {plantilla.puntos.length} puntos confirmados por el servidor
      </p>
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {plantilla.puntos.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <span className="text-base text-fg">
              {p.nombre}
              {p.obligatorio ? "" : " (opcional)"}
            </span>
            <span className="text-sm text-fg-muted">
              {marcados.has(p.id) ? "Marcado" : "Pendiente"}
            </span>
          </li>
        ))}
      </ul>
      <MarcarPunto personaId={personaId} ejecucionClave={clave} />
      <ReportarNovedad personaId={personaId} ejecucionClave={clave} />
      {error ? (
        <Alerta tono="danger" titulo="No se pudo guardar el cierre">
          No quedó en el teléfono. Vuelve a intentarlo.
        </Alerta>
      ) : null}
      {confirmando ? (
        <Alerta
          tono="warning"
          icono={AlertTriangle}
          titulo={
            pendientes === 1
              ? "Queda 1 punto obligatorio pendiente. ¿Cerrar igual?"
              : `Quedan ${pendientes} puntos obligatorios pendientes. ¿Cerrar igual?`
          }
        >
          <div className="flex flex-col gap-2 pt-2">
            Al cerrar, la ronda queda incompleta y no se puede volver a abrir.
            <Button onClick={() => setConfirmando(false)}>Volver a la ronda</Button>
            <Button variant="secondary" onClick={() => void cerrar()}>
              Cerrar igual
            </Button>
          </div>
        </Alerta>
      ) : (
        <Button variant="secondary" onClick={pedirCierre}>
          Cerrar ronda
        </Button>
      )}
    </section>
  );
}
