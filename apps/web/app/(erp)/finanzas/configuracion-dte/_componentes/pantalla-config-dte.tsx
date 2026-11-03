"use client";
/* eslint-disable max-lines -- integrado sin lint por la caída de memoria del CI (CAR-181); dividir en el PR de pendientes */

import { useRouter } from "next/navigation";

import { Alerta, Button, Cabecera, Estado, avisar, type EstadoPantalla } from "@opai/ds";

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
      <section>
        <Cabecera titulo="Configuración DTE" subtitulo="Facturación electrónica" />
        <Estado state={state} variante="formulario">
          <></>
        </Estado>
      </section>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="t-title m-0">Configuración DTE</h1>
        <p className="t-body-sm text-fg-muted m-0 mt-1">
          Ambiente SII, conector de emisión y resolución del emisor. Las credenciales SimpleAPI y el certificado se
          cargan en Configuración › Integraciones.
        </p>
      </div>
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
