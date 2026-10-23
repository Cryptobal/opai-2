"use client";

import { avisar, Sheet, Uploader } from "@opai/ds";

import { subirDocumento } from "@/app/_components/documentos/subir";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { SLOTS } from "./tipos";

type Props = { tenantId: string; tipos: Record<string, string> };

/** Subir o reemplazar un logo (`?logo=<ranura>`): documento de la empresa del tipo de marca y `core.marca.update`. */
export function HojaLogo({ tenantId, tipos }: Props) {
  const hoja = useHojaUrl("logo");
  const { ejecutar } = useCapacidad("erp");
  const slot = SLOTS.find((s) => s.param === hoja.valor);
  return (
    <Sheet
      abierto={hoja.abierta && Boolean(slot)}
      onCerrar={hoja.cerrar}
      titulo={`Logo · ${slot?.etiqueta ?? ""}`}
      descripcion="Se publica en documentos, correos y portales. Usa SVG o PNG con fondo transparente."
    >
      {slot ? (
        <Uploader
          accept="image/svg+xml,image/png,image/webp,image/jpeg"
          tipos="SVG, PNG, WebP o JPG"
          tamanoMaximoMb={2}
          procesar={async (archivo, progreso) => {
            const tipoId = tipos[slot.tipo];
            if (!tipoId) throw new Error("Falta el tipo de documento de marca en esta empresa.");
            const id = await subirDocumento(
              { tipo: "tenant", id: tenantId },
              archivo,
              { tipoId },
              progreso,
            );
            if (!(await ejecutar("core.marca.update", { [slot.id]: id })))
              throw new Error("No pudimos asignar el logo a la marca.");
            avisar.exito("Logo actualizado");
            hoja.cerrar();
          }}
        />
      ) : null}
    </Sheet>
  );
}
