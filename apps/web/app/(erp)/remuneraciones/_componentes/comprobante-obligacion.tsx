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
  tipo: "lre" | "previred";
}) {
  const router = useRouter();
  const estadoFinal = tipo === "lre" ? "cargado" : "pagado";
  if (obligacion.comprobanteDocumentoId)
    return <p className="t-caption text-fg-muted">Comprobante guardado en los documentos de la empresa.</p>;
  return (
    <Uploader
      compacto
      tipos="PDF, JPG o PNG"
      accept="application/pdf,image/jpeg,image/png"
      etiquetaBoton={tipo === "lre" ? "Subir comprobante de carga" : "Subir comprobante de pago"}
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
        avisar.exito(tipo === "lre" ? "Comprobante de carga guardado" : "Comprobante de pago guardado");
        router.refresh();
      }}
    />
  );
}
