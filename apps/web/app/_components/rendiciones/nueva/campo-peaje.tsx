"use client";

import { Campo, InputMonto, Uploader } from "@opai/ds";

import { subirDocumento } from "@/app/_components/documentos/subir";

import type { OpcionesRendicion, PortalRendicion } from "../tipos";

/** Peaje opcional del viaje: monto y, si hay monto, la foto del peaje. */
export function CampoPeaje({
  valor,
  onCambiar,
  onFoto,
  destino,
  portal,
}: {
  valor: string;
  onCambiar: (digitos: string) => void;
  onFoto: (documentoId: string | null) => void;
  destino: OpcionesRendicion["destinoRespaldo"];
  portal: PortalRendicion;
}) {
  return (
    <>
      <Campo
        etiqueta="Peaje (opcional)"
        htmlFor="km-peaje"
        ayuda="Monto total de peajes del viaje, en pesos."
      >
        <InputMonto id="km-peaje" valor={valor} onCambiar={onCambiar} placeholder="0" />
      </Campo>
      {Number(valor) > 0 && destino ? (
        <Campo etiqueta="Foto del peaje (opcional)">
          <Uploader
            accept="image/*,application/pdf"
            tipos="JPG, PNG o PDF"
            tamanoMaximoMb={15}
            etiquetaBoton="Tomar foto del peaje"
            onQuitar={() => onFoto(null)}
            procesar={async (archivo, progreso) =>
              onFoto(await subirDocumento(destino, archivo, {}, progreso, portal))
            }
          />
        </Campo>
      ) : null}
    </>
  );
}
