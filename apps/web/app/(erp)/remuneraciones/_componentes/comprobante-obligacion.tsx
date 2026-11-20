"use client";

import { useRouter } from "next/navigation";

import { avisar, Uploader } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";
import { subirDocumento } from "@/app/_components/documentos/subir";

export type ObligacionArchivo = { id: string; estado: string; comprobanteDocumentoId: string | null };

/**
 * Comprobante de carga (LRE en Mi DT) o de pago (Previred) del mes (diseño 06): sube el archivo a los
 * documentos de la empresa y lo deja en la obligación del calendario, que pasa a cargada o pagada.
 */
export function ComprobanteObligacion({
  obligacion,
  tenantId,
  tipo,
}: {
  obligacion: ObligacionArchivo;
  tenantId: string;
  tipo: "lre" | "previred" | "f30_1";
}) {
  const router = useRouter();
  const estadoFinal = tipo === "previred" ? "pagado" : "cargado";
  if (obligacion.comprobanteDocumentoId)
    return <p className="t-caption text-fg-muted">Comprobante guardado en los documentos de la empresa.</p>;
  return (
    <Uploader
      compacto
      tipos="PDF, JPG o PNG"
      accept="application/pdf,image/jpeg,image/png"
      etiquetaBoton={tipo === "previred" ? "Subir comprobante de pago" : "Subir comprobante de carga"}
      procesar={async (archivo, progreso) => {
        const cambio = obligacion.estado === estadoFinal || obligacion.estado === "pagado" ? {} : { estado: estadoFinal };
        // Vista previa primero: si la obligación ya no admite el cambio, no se sube un documento huérfano.
        const previa = await ejecutarCapacidad("erp", "nomina.obligaciones.actualizar", { id: obligacion.id, ...cambio }, true);
        if (!previa.ok) throw new Error(previa.error.message);
        const documentoId = await subirDocumento({ tipo: "tenant", id: tenantId }, archivo, {}, progreso);
        const r = await ejecutarCapacidad("erp", "nomina.obligaciones.actualizar", {
          id: obligacion.id,
          comprobanteDocumentoId: documentoId,
          ...cambio,
        });
        if (!r.ok) throw new Error(r.error.message);
        avisar.exito(tipo === "previred" ? "Comprobante de pago guardado" : "Comprobante de carga guardado");
        router.refresh();
      }}
    />
  );
}
