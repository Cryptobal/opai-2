"use client";

import { useState } from "react";

import { Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { FormMarcarRegistroMiDt } from "./marcar-registro-midt-form";
import type { MovimientoMiDt } from "./lista-cumplimiento-dt";

const ETIQUETA_MOV = { alta: "Alta", baja: "Baja", anexo: "Anexo", finiquito: "Finiquito" } as const;

export function MarcarRegistroMiDt({
  movimiento,
  tenantId,
  onCerrar,
}: {
  movimiento: MovimientoMiDt | null;
  tenantId: string;
  onCerrar: () => void;
}) {
  const { pendiente, error } = useCapacidad("erp");
  const [fecha, setFecha] = useState("");
  const titulo = movimiento ? `Marcar «${ETIQUETA_MOV[movimiento.movimientoTipo].toLowerCase()}» como registrado en Mi DT` : "";

  return (
    <Dialog
      abierto={movimiento !== null}
      onCerrar={onCerrar}
      titulo={titulo}
      {...(movimiento ? { descripcion: `${movimiento.personaNombre} · ${movimiento.hechoTexto}` } : {})}
      acciones={
        <Button disabled={pendiente || !fecha} form="form-midt-reg">
          Marcar registrado
        </Button>
      }
    >
      {movimiento ? (
        <FormMarcarRegistroMiDt
          movimiento={movimiento}
          tenantId={tenantId}
          fecha={fecha}
          onFecha={setFecha}
          pendiente={pendiente}
          error={error}
          onCerrar={onCerrar}
        />
      ) : null}
    </Dialog>
  );
}