"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Alerta,
  Button,
  Cabecera,
  Campo,
  Estado,
  Input,
  Select,
  SeccionTarjeta,
  avisar,
  type EstadoPantalla,
} from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { ConfigDte } from "./tipos";

type Props = {
  state: EstadoPantalla;
  cfg: ConfigDte | null;
  esOwner: boolean;
};

export function PantallaConfigDte({ state, cfg, esOwner }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [ambiente, setAmbiente] = useState(cfg?.ambiente ?? "certificacion");
  const [rutEmisor, setRutEmisor] = useState(cfg?.rutEmisor ?? "");
  const [emisionProveedor, setEmisionProveedor] = useState(cfg?.emisionProveedor ?? "simulado");
  const [cesionProveedor, setCesionProveedor] = useState(cfg?.cesionProveedor ?? "");
  const [resolucionNumero, setResolucionNumero] = useState(
    cfg?.resolucionSiiNumero != null ? String(cfg.resolucionSiiNumero) : "",
  );
  const [resolucionFecha, setResolucionFecha] = useState(cfg?.resolucionSiiFecha ?? "");
  const [umbral, setUmbral] = useState(String(cfg?.umbralFoliosPct ?? 20));
  const [avisoCaf, setAvisoCaf] = useState(String(cfg?.avisoCafDias ?? 30));
  const [fechaCorte, setFechaCorte] = useState(cfg?.fechaCorte1_0 ?? "");

  async function guardar(dryRun: boolean) {
    const input = {
      ambiente,
      rutEmisor: rutEmisor.trim() || undefined,
      emisionProveedor,
      cesionProveedor: cesionProveedor === "octava" ? ("octava" as const) : null,
      resolucionSiiNumero: resolucionNumero.trim() ? Number(resolucionNumero) : null,
      resolucionSiiFecha: resolucionFecha.trim() || null,
      umbralFoliosPct: Number(umbral),
      avisoCafDias: Number(avisoCaf),
      fechaCorte1_0: fechaCorte.trim() || null,
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
      <SeccionTarjeta titulo="Emisión al SII">
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Ambiente SII" htmlFor="dte-ambiente">
            <Select
              id="dte-ambiente"
              valor={ambiente}
              disabled={!esOwner || pendiente}
              onCambiar={(v) => setAmbiente(v as ConfigDte["ambiente"])}
              opciones={[
                { valor: "certificacion", etiqueta: "Certificación" },
                { valor: "produccion", etiqueta: "Producción" },
              ]}
            />
          </Campo>
          <Campo etiqueta="RUT emisor" htmlFor="dte-rut">
            <Input
              id="dte-rut"
              value={rutEmisor}
              disabled={pendiente}
              onChange={(e) => setRutEmisor(e.target.value)}
              placeholder="76111222-8"
            />
          </Campo>
          <Campo etiqueta="Conector de emisión" htmlFor="dte-emision">
            <Select
              id="dte-emision"
              valor={emisionProveedor}
              disabled={!esOwner || pendiente}
              onCambiar={(v) => setEmisionProveedor(v as ConfigDte["emisionProveedor"])}
              opciones={[
                { valor: "simulado", etiqueta: "Simulado (pruebas)" },
                { valor: "simpleapi", etiqueta: "SimpleAPI (SII real)" },
              ]}
            />
          </Campo>
          <Campo etiqueta="Resolución SII N°" htmlFor="dte-res-n">
            <Input
              id="dte-res-n"
              inputMode="numeric"
              value={resolucionNumero}
              disabled={pendiente}
              onChange={(e) => setResolucionNumero(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Fecha resolución SII" htmlFor="dte-res-f">
            <Input
              id="dte-res-f"
              type="date"
              value={resolucionFecha}
              disabled={pendiente}
              onChange={(e) => setResolucionFecha(e.target.value)}
            />
          </Campo>
        </div>
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Cesión y folios">
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Cesión (Octava)" htmlFor="dte-cesion">
            <Select
              id="dte-cesion"
              valor={cesionProveedor || ""}
              disabled={!esOwner || pendiente}
              onCambiar={setCesionProveedor}
              opciones={[
                { valor: "", etiqueta: "Desactivada" },
                { valor: "octava", etiqueta: "Octava" },
              ]}
            />
          </Campo>
          <Campo etiqueta="Aviso folios bajos (%)" htmlFor="dte-umbral">
            <Input
              id="dte-umbral"
              inputMode="numeric"
              value={umbral}
              disabled={pendiente}
              onChange={(e) => setUmbral(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Aviso vencimiento CAF (días)" htmlFor="dte-caf-dias">
            <Input
              id="dte-caf-dias"
              inputMode="numeric"
              value={avisoCaf}
              disabled={pendiente}
              onChange={(e) => setAvisoCaf(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Fecha de corte con OPAI 1.0" htmlFor="dte-corte">
            <Input
              id="dte-corte"
              type="date"
              value={fechaCorte}
              disabled={pendiente}
              onChange={(e) => setFechaCorte(e.target.value)}
            />
          </Campo>
        </div>
      </SeccionTarjeta>
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
