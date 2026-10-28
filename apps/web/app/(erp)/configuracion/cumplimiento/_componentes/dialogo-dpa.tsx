"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Checkbox, Dialog } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { TextoDpa } from "./datos";

/**
 * Revisar y aceptar el DPA vigente (`?dpa=1`, solo owner). Muestra el texto exacto y su huella
 * SHA-256, la misma que queda en la aceptación como prueba de qué se aceptó (§16.1).
 */
export function DialogoDpa({ texto }: { texto: TextoDpa }) {
  const hoja = useHojaUrl("dpa");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [leido, setLeido] = useState(false);
  async function aceptar() {
    if (!(await ejecutar("core.cumplimiento.dpa_aceptar", { version: texto.versionVigente })))
      return;
    avisar.exito(`DPA ${texto.versionVigente} aceptado`);
    hoja.cerrar();
  }
  return (
    <Dialog
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      tamano="grande"
      titulo={`Acuerdo de tratamiento de datos · versión ${texto.versionVigente}`}
      descripcion="La empresa (responsable) acepta las condiciones en que OPAI (encargado) trata sus datos personales."
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || !leido || !texto.texto} onClick={() => void aceptar()}>
            {pendiente ? "Aceptando…" : "Aceptar el DPA"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {texto.texto ? (
          <div
            tabIndex={0}
            aria-label="Texto del acuerdo"
            className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-bg p-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-focus"
          >
            {texto.texto}
          </div>
        ) : (
          <Alerta tono="warning" titulo="OPAI aún no publica el texto de esta versión." />
        )}
        {texto.sha256 ? (
          <p className="t-caption break-all">
            Huella SHA-256: <span className="t-mono">{texto.sha256}</span>
          </p>
        ) : null}
        <Checkbox
          etiqueta="Leí el acuerdo y lo acepto en nombre de la empresa"
          marcado={leido}
          onCambiar={setLeido}
        />
      </div>
    </Dialog>
  );
}
