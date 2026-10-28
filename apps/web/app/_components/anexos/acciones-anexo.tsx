"use client";

import { useRouter } from "next/navigation";

import { avisar, PanelAprobacion, type EstadoResuelto } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Anexo } from "./tipos";

/** Aprobar/rechazar el anexo (R13-R14, D14): aprobar lleva a Documentos (R15), rechazar a la lista. */
export function AccionesAnexo({ anexo, personaId }: { anexo: Anexo; personaId: string }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const router = useRouter();
  const resuelto: EstadoResuelto | null =
    anexo.estado === "borrador"
      ? null
      : {
          estado: anexo.estado,
          por: anexo.estado === "aprobado" ? anexo.aprobadoPorId : anexo.rechazadoPorId,
          en: anexo.estado === "aprobado" ? anexo.aprobadoEn : anexo.rechazadoEn,
          motivoRechazo: anexo.motivoRechazo,
        };
  return (
    <PanelAprobacion
      resuelto={resuelto}
      pendiente={pendiente}
      error={error}
      onAprobar={async () => {
        const r = await ejecutar("core.anexos.aprobar", { id: anexo.id });
        if (r) {
          avisar.exito("Anexo aprobado: el documento final quedó en Documentos");
          router.push(`/personas/${personaId}/documentos`);
        }
      }}
      onRechazar={async (motivo) => {
        const r = await ejecutar("core.anexos.rechazar", { id: anexo.id, motivo });
        if (r) {
          avisar.exito("Anexo rechazado");
          router.push(`/personas/${personaId}/anexos`);
        }
      }}
    />
  );
}
