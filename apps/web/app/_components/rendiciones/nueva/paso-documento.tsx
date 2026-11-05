"use client";

import { Campo, RadioGroup, Uploader } from "@opai/ds";

import { subirDocumento } from "@/app/_components/documentos/subir";

import type { OpcionesRendicion, PortalRendicion } from "../tipos";
import type { ErroresGasto, Gasto } from "./gasto";

/** Paso 1: foto de la boleta o factura (cámara o galería), vista previa, quitar y tipo de documento. */
export function PasoDocumento({
  gasto,
  onCambiar,
  destino,
  portal,
  errores,
}: {
  gasto: Gasto;
  onCambiar: (g: Gasto) => void;
  destino: OpcionesRendicion["destinoRespaldo"];
  portal: PortalRendicion;
  errores: ErroresGasto;
}) {
  if (!destino)
    return (
      <p role="alert" className="rounded-md bg-warning-muted px-3 py-2 text-base text-warning-fg">
        Aún no puedes subir boletas: no tienes una instalación a cargo donde guardarlas. Pídele a un
        administrador de tu empresa que te asigne una.
      </p>
    );
  const quitar = () => {
    if (gasto.vistaPrevia) URL.revokeObjectURL(gasto.vistaPrevia);
    onCambiar({ ...gasto, documentoId: null, vistaPrevia: null, nombreArchivo: null });
  };
  return (
    <div className="flex flex-col gap-5">
      <Campo
        etiqueta="Foto de la boleta o factura"
        error={errores.documento}
        ayuda="Foto nítida y completa, o PDF. Debe verse el folio y el total."
      >
        <Uploader
          accept="image/*,application/pdf"
          tipos="JPG, PNG o PDF"
          tamanoMaximoMb={15}
          etiquetaBoton={gasto.documentoId ? "Cambiar foto" : "Tomar foto o elegir archivo"}
          onQuitar={quitar}
          procesar={async (archivo, progreso) => {
            const documentoId = await subirDocumento(destino, archivo, {}, progreso, portal);
            if (gasto.vistaPrevia) URL.revokeObjectURL(gasto.vistaPrevia);
            onCambiar({
              ...gasto,
              documentoId,
              nombreArchivo: archivo.name,
              vistaPrevia: archivo.type.startsWith("image/") ? URL.createObjectURL(archivo) : null,
            });
          }}
        />
      </Campo>
      {gasto.vistaPrevia ? (
        // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no hay nada que optimizar
        <img
          src={gasto.vistaPrevia}
          alt="Vista previa del respaldo"
          className="max-h-72 w-full rounded-md border border-border object-contain"
        />
      ) : gasto.documentoId ? (
        <p className="t-caption">
          {gasto.nombreArchivo
            ? `${gasto.nombreArchivo} subido.`
            : "Esta boleta ya tiene un respaldo adjunto. Sube otro archivo solo si quieres reemplazarlo."}
        </p>
      ) : null}
      <RadioGroup
        etiqueta="Tipo de documento"
        orientacion="fila"
        valor={gasto.tipoDocumento}
        onCambiar={(v) =>
          onCambiar({ ...gasto, tipoDocumento: v === "factura" ? "factura" : "boleta" })
        }
        opciones={[
          { valor: "boleta", etiqueta: "Boleta" },
          { valor: "factura", etiqueta: "Factura" },
        ]}
      />
    </div>
  );
}
