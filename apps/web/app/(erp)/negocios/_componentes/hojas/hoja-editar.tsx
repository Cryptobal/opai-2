"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { NegocioDetalle } from "../datos";
import { CamposNegocio, camposAInput, type DatosNegocio } from "./campos-negocio";
import type { ConfigComercial } from "./tipos";
import { useHojaNegocio } from "./use-hoja";

/** Editar un negocio: los campos de `comercial.negocios.update`; el monto no se edita con cotización. */
export function HojaEditar({ n, config }: { n: NegocioDetalle; config: ConfigComercial }) {
  const hoja = useHojaNegocio("editar");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const bloqueado = n.valorMensual != null;
  const [d, setD] = useState<DatosNegocio>({
    titulo: n.titulo,
    tipoId: n.tipoId ?? "",
    origenId: n.origenId ?? "",
    cierreEstimado: n.cierreEstimado ?? "",
    inicioServicioEstimado: n.inicioServicioEstimado ?? "",
    monto: String(n.valorMensual ?? n.montoEstimadoMensual ?? ""),
    probabilidad: String(n.probabilidad),
  });
  const set = <K extends keyof DatosNegocio>(k: K, v: DatosNegocio[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  async function guardar() {
    const r = await ejecutar("comercial.negocios.update", {
      id: n.id,
      ...camposAInput(d, !bloqueado),
      inicioServicioEstimado: d.inicioServicioEstimado || null,
    });
    if (!r) return;
    avisar.exito("Negocio actualizado");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Editar negocio"
      descripcion={n.cuentaNombre}
      telefono="completo"
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || d.titulo.trim().length < 3} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposNegocio d={d} set={set} config={config} editar={{ montoBloqueado: bloqueado }} />
      </div>
    </Sheet>
  );
}
