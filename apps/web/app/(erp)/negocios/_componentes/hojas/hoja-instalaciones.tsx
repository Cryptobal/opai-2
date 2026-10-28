"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Campo, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

import type { NegocioDetalle } from "../datos";
import { opcionesDe, TIPO_VINCULO } from "../etiquetas";
import { useHojaNegocio } from "./use-hoja";

type Props = { n: NegocioDetalle; cuenta: CuentaDetalle };

/** Instalaciones del negocio: vincula las de su cuenta con su tipo o quita un vínculo (R7, R10). */
export function HojaInstalaciones({ n, cuenta }: Props) {
  const hoja = useHojaNegocio("instalaciones");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const vinculadas = new Set(n.instalaciones.map((i) => i.instalacionId));
  const libres = cuenta.instalaciones.filter((i) => !vinculadas.has(i.id));
  const [instalacion, setInstalacion] = useState("");
  const [tipo, setTipo] = useState("nueva");
  async function vincular() {
    const r = await ejecutar("comercial.negocios.vincular_instalacion", {
      negocioId: n.id,
      instalacionId: instalacion,
      tipo,
    });
    if (!r) return;
    avisar.exito("Instalación vinculada");
    setInstalacion("");
  }
  async function quitar(instalacionId: string) {
    const r = await ejecutar("comercial.negocios.desvincular_instalacion", {
      negocioId: n.id,
      instalacionId,
    });
    if (r) avisar.exito("Vínculo quitado");
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Instalaciones del negocio"
      descripcion={`Instalaciones de ${cuenta.nombre}. El negocio lee sus datos, no los copia.`}
      acciones={
        <Button variant="secondary" onClick={hoja.cerrar}>
          Listo
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {n.instalaciones.length ? (
            n.instalaciones.map((i) => (
              <li key={i.id} className="flex min-h-11 items-center gap-2 px-3 py-1">
                <span className="min-w-0 flex-1 truncate">{i.nombre}</span>
                <Badge punto={false}>{TIPO_VINCULO[i.tipo] ?? i.tipo}</Badge>
                <Button
                  variant="ghost"
                  disabled={pendiente}
                  onClick={() => void quitar(i.instalacionId)}
                >
                  Quitar
                </Button>
              </li>
            ))
          ) : (
            <li className="t-caption px-3 py-3">Sin instalaciones vinculadas.</li>
          )}
        </ul>
        {libres.length ? (
          <div className="flex flex-col gap-3">
            <Campo etiqueta="Agregar instalación" htmlFor="vinc-instalacion">
              <Select
                id="vinc-instalacion"
                valor={instalacion || undefined}
                onCambiar={setInstalacion}
                placeholder="Elige una instalación"
                opciones={libres.map((i) => ({ valor: i.id, etiqueta: i.nombre }))}
              />
            </Campo>
            <Campo etiqueta="Tipo" htmlFor="vinc-tipo">
              <Select
                id="vinc-tipo"
                valor={tipo}
                onCambiar={setTipo}
                opciones={opcionesDe(TIPO_VINCULO)}
              />
            </Campo>
            <Button
              variant="secondary"
              disabled={pendiente || !instalacion}
              onClick={() => void vincular()}
            >
              Vincular instalación
            </Button>
          </div>
        ) : (
          <p className="t-caption">
            No quedan instalaciones de esta cuenta por vincular. Créalas desde la ficha de la
            cuenta.
          </p>
        )}
      </div>
    </Sheet>
  );
}
