"use client";

import { useState } from "react";

import { useSeleccionIds } from "../seleccion-ids";
import { BarraBulkBandeja } from "./barra-bulk-bandeja";
import { DialogoBulkBandeja } from "./dialogo-bulk-bandeja";
import { FilasSeleccionBandeja } from "./filas-seleccion-bandeja";
import { useBulkBandeja } from "./use-bulk-bandeja";
import type { Bandeja, FiltrosBandeja } from "./tipos";

type Fila = Bandeja["items"][number];

/** Selección múltiple en la bandeja (CAR-613): aprobar o rechazar con vista previa. */
export function ListaBandejaSeleccion({
  filtros,
  rendiciones,
  idActiva,
}: {
  filtros: FiltrosBandeja;
  rendiciones: readonly Fila[];
  idActiva: string | null;
}) {
  const { sel, alternar, vaciar } = useSeleccionIds();
  const [motivo, setMotivo] = useState("");
  const ids = [...sel];
  const bulk = useBulkBandeja(ids, motivo);

  const onConfirmar = async () => {
    await bulk.confirmar();
    vaciar();
  };

  return (
    <>
      <FilasSeleccionBandeja
        rendiciones={rendiciones}
        filtros={filtros}
        idActiva={idActiva}
        sel={sel}
        alternar={alternar}
      />
      {bulk.error ? (
        <p role="alert" className="px-4 text-base font-medium text-danger-fg md:px-0">
          {bulk.error}
        </p>
      ) : null}
      <BarraBulkBandeja
        cantidad={sel.size}
        motivo={motivo}
        ocupado={bulk.ocupado}
        onMotivo={setMotivo}
        onVistaPrevia={(a) => void bulk.vistaPrevia(a)}
      />
      <DialogoBulkBandeja
        accion={bulk.dialogo}
        preview={bulk.preview}
        motivo={motivo}
        ocupado={bulk.ocupado}
        onMotivo={setMotivo}
        onCerrar={bulk.cerrarDialogo}
        onConfirmar={() => void onConfirmar()}
      />
    </>
  );
}