"use client";

import { Alerta, Button, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";

import { fechaCl } from "./etiquetas";

export type AlertaPautaFila = {
  personaId: string;
  nombre: string;
  tipo: "semanal" | "mensual" | "descanso";
  mensaje: string;
  horas?: number;
  limite?: number;
};

/** P09: alertas de horas legales (`?alertas=1`), datos cargados en el servidor. */
export function AlertasPauta({
  semanaDesde,
  alertas,
}: {
  semanaDesde: string | null;
  alertas: AlertaPautaFila[] | null;
}) {
  const hoja = useHojaUrl("alertas");
  if (!hoja.abierta) return null;
  const lista = alertas ?? [];

  return (
    <Sheet
      abierto
      onCerrar={hoja.cerrar}
      titulo="Alertas de horas"
      descripcion={
        semanaDesde ? `Semana desde el ${fechaCl(semanaDesde)} · ${lista.length} alertas` : "Sin datos"
      }
      acciones={
        <Button variant="secondary" onClick={hoja.cerrar}>
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {alertas === null ? <Alerta tono="danger" titulo="No se pudieron cargar las alertas." /> : null}
        {alertas && lista.length === 0 ? (
          <p className="t-body-sm text-fg-muted">No hay alertas de horas legales en esta semana.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lista.map((a) => (
              <li key={`${a.personaId}-${a.tipo}-${a.mensaje}`}>
                <Alerta tono="warning" titulo={a.nombre}>
                  {a.mensaje}
                </Alerta>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
