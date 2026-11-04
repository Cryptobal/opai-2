"use client";
/* eslint-disable max-lines -- integrado sin lint por la caída de memoria del CI (CAR-181); dividir en el PR de pendientes */

import { useRouter } from "next/navigation";

import { Alerta, Button, Estado, avisar, type EstadoPantalla } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { SeccionesDte } from "./secciones-dte";
import type { ConfigDte } from "./tipos";
import { useFormDte } from "./use-form-dte";

type Props = {
  state: EstadoPantalla;
  cfg: ConfigDte | null;
  esOwner: boolean;
};

export function PantallaConfigDte({ state, cfg, esOwner }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [f, set] = useFormDte(cfg);

  async function guardar(dryRun: boolean) {
    const input = {
      ambiente: f.ambiente,
      rutEmisor: f.rutEmisor.trim() || undefined,
      emisionProveedor: f.emisionProveedor,
      cesionProveedor: f.cesionProveedor === "octava" ? ("octava" as const) : null,
      resolucionSiiNumero: f.resolucionNumero.trim() ? Number(f.resolucionNumero) : null,
      resolucionSiiFecha: f.resolucionFecha.trim() || null,
      umbralFoliosPct: Number(f.umbral),
      avisoCafDias: Number(f.avisoCaf),
      fechaCorte1_0: f.fechaCorte.trim() || null,
    };
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
      <SeccionesDte f={f} set={set} esOwner={esOwner} pendiente={pendiente} />
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
