"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, Button, Estado, avisar, type EstadoPantalla } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { SeccionesDte } from "./secciones-dte";
import type { ConfigDte } from "./tipos";
import { useFormDte } from "./use-form-dte";
import { type ErroresDte, inputDteDesdeForm, validarFormDte } from "./validar-dte";

type Props = {
  state: EstadoPantalla;
  cfg: ConfigDte | null;
  esOwner: boolean;
};

export function PantallaConfigDte({ state, cfg, esOwner }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [errores, setErrores] = useState<ErroresDte>({});
  const [f, set] = useFormDte(cfg);

  async function guardar(dryRun: boolean) {
    limpiarError();
    const e = validarFormDte(f);
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    if (!cfg) return;
    const input = inputDteDesdeForm(f, cfg);
    const r = await ejecutar<ConfigDte>("finanzas.dte_config.actualizar", input, dryRun);
    if (!r) return;
    if (dryRun) {
      avisar.exito("Vista previa lista. Confirme para guardar.");
      return;
    }
    avisar.exito("Configuración DTE guardada");
    router.refresh();
  }

  if (state !== "ready" || !cfg) {
    return (
      <Estado state={state} variante="formulario">
        <></>
      </Estado>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!esOwner ? (
        <Alerta tono="info" titulo="Solo lectura">
          Solo el owner puede cambiar el ambiente de producción o activar SimpleAPI.
        </Alerta>
      ) : null}
      {error ? (
        <Alerta tono="danger" titulo="No se guardó la configuración DTE">
          {error}
        </Alerta>
      ) : null}
      {Object.keys(errores).length > 0 ? (
        <Alerta tono="danger" titulo="Revise los campos marcados antes de guardar" />
      ) : null}
      <SeccionesDte f={f} set={set} esOwner={esOwner} pendiente={pendiente} errores={errores} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pendiente} onClick={() => guardar(true)}>
          Vista previa
        </Button>
        <Button variant="primary" disabled={pendiente} onClick={() => guardar(false)}>
          Guardar
        </Button>
      </div>
    </div>
  );
}
