"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, SeccionTarjeta, Textarea, Uploader } from "@opai/ds";

import { subirDocumento } from "@/app/_components/documentos/subir";
import { useCapacidad } from "@/app/_components/use-capacidad";

export type Apariencia = { mensaje: string | null; fondo: { id: string; nombre: string } | null };

/**
 * Fondo y mensaje de bienvenida de la portería de la instalación (CAR-553). Vacíos, la portería usa la marca de la
 * empresa. La imagen se sube como documento de la instalación y se asigna con `acceso.apariencia.set`.
 */
export function EditorApariencia({
  instalacionId,
  apariencia,
}: {
  instalacionId: string;
  apariencia: Apariencia;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [mensaje, setMensaje] = useState(apariencia.mensaje ?? "");
  const [fondo, setFondo] = useState(apariencia.fondo);
  async function guardar(f = fondo) {
    const r = await ejecutar<Apariencia>("acceso.apariencia.set", {
      instalacionId,
      mensaje: mensaje.trim() || null,
      fondoDocumentoId: f?.id ?? null,
    });
    if (!r) return false;
    setFondo(r.fondo);
    avisar.exito("Bienvenida de la portería guardada");
    return true;
  }
  return (
    <SeccionTarjeta titulo="Bienvenida de la portería">
      <div className="flex flex-col gap-4">
        <p className="t-caption">
          Sin mensaje ni fondo, la portería muestra el logo, el color y el nombre de la empresa.
        </p>
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Mensaje de bienvenida" htmlFor="bienvenida-mensaje">
          <Textarea
            id="bienvenida-mensaje"
            maxLength={200}
            rows={2}
            placeholder="Por ejemplo, «Bienvenido. Muestra tu documento al guardia»"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
          />
        </Campo>
        <FondoApariencia
          instalacionId={instalacionId}
          fondo={fondo}
          pendiente={pendiente}
          quitar={() => setFondo(null)}
          subido={guardar}
        />
        <div>
          <Button disabled={pendiente} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Guardar bienvenida"}
          </Button>
        </div>
      </div>
    </SeccionTarjeta>
  );
}

type Fondo = Apariencia["fondo"];

function FondoApariencia({
  instalacionId,
  fondo,
  pendiente,
  quitar,
  subido,
}: {
  instalacionId: string;
  fondo: Fondo;
  pendiente: boolean;
  quitar: () => void;
  subido: (f: Fondo) => Promise<boolean>;
}) {
  return fondo ? (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="t-body min-w-0 truncate">Fondo: {fondo.nombre}</span>
      <Button variant="secondary" disabled={pendiente} onClick={quitar}>
        Quitar fondo
      </Button>
    </div>
  ) : (
    <Uploader
      accept="image/png,image/webp,image/jpeg"
      tipos="Imagen de fondo: PNG, WebP o JPG"
      tamanoMaximoMb={5}
      procesar={async (archivo, progreso) => {
        const id = await subirDocumento(
          { tipo: "instalacion", id: instalacionId },
          archivo,
          {},
          progreso,
        );
        if (!(await subido({ id, nombre: archivo.name })))
          throw new Error("No pudimos asignar el fondo.");
      }}
    />
  );
}
