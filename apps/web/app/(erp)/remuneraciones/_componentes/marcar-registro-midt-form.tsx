"use client";

import { useRouter } from "next/navigation";

import { Alerta, avisar, Campo, InputFecha, Uploader } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";
import { subirDocumento } from "@/app/_components/documentos/subir";

import type { MovimientoMiDt } from "./lista-cumplimiento-dt";

export function FormMarcarRegistroMiDt({
  movimiento,
  tenantId,
  fecha,
  onFecha,
  pendiente,
  error,
  onCerrar,
}: {
  movimiento: MovimientoMiDt;
  tenantId: string;
  fecha: string;
  onFecha: (v: string) => void;
  pendiente: boolean;
  error: string | null;
  onCerrar: () => void;
}) {
  const router = useRouter();

  return (
    <form
      id="form-midt-reg"
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <Campo etiqueta="Fecha de registro en Mi DT" htmlFor="midt-fecha">
        <InputFecha id="midt-fecha" valor={fecha} onCambiar={onFecha} disabled={pendiente} />
      </Campo>
      <Campo etiqueta="Comprobante de Mi DT" ayuda="PDF o imagen del comprobante que entrega Mi DT.">
        <Uploader
          tipos="PDF, JPG o PNG"
          accept="application/pdf,image/jpeg,image/png"
          etiquetaBoton="Subir comprobante"
          procesar={async (archivo, progreso) => {
            if (!fecha) throw new Error("Indica la fecha de registro.");
            const documentoId = await subirDocumento({ tipo: "tenant", id: tenantId }, archivo, {}, progreso);
            const cuerpo = {
              movimientoTipo: movimiento.movimientoTipo,
              referenciaId: movimiento.referenciaId,
              registradoEn: fecha,
              documentoId,
            };
            const previa = await ejecutarCapacidad("erp", "nomina.midt.registrar", cuerpo, true);
            if (!previa.ok) throw new Error(previa.error.message);
            const r = await ejecutarCapacidad("erp", "nomina.midt.registrar", cuerpo);
            if (!r.ok) throw new Error(r.error.message);
            avisar.exito("Registro en Mi DT guardado");
            onCerrar();
            router.refresh();
          }}
        />
      </Campo>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
    </form>
  );
}