"use client";

import { Download, FileJson, Play } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Button } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { DialogoAnonimizar } from "./dialogo-anonimizar";
import { DialogoResolver } from "./dialogo-resolver";
import { abierta, exporta, type Solicitud } from "./tipos";

/** Abre la descarga por URL firmada de corta vida (ADR-039); exige `cumplimiento.read`. */
async function descargar(id: string) {
  const r = await ejecutarCapacidad("erp", "core.documentos.url_descarga", { id });
  if (r.ok) window.location.assign((r.data as { url: string }).url);
  else avisar.error(r.error.message);
}

/**
 * Acciones de una solicitud (todas `soloPersonas`, ADR-034): tomarla, generar la exportación del
 * titular (acceso/portabilidad), anonimizarlo (cancelación) y resolverla o rechazarla con evidencia.
 */
export function AccionesSolicitud({
  s,
  yo,
  gestionar,
}: {
  s: Solicitud;
  yo: string | null;
  gestionar: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [exportado, setExportado] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<"resuelta" | "rechazada" | "anonimizar" | null>(null);
  const evidencia = exportado ?? s.documentoEvidenciaId;
  const viva = abierta(s.estado);
  async function tomar() {
    if (
      await ejecutar("core.cumplimiento.solicitud_avanzar", {
        id: s.id,
        ...(yo ? { responsableId: yo } : {}),
      })
    )
      avisar.exito("Solicitud en proceso");
  }
  async function exportar() {
    const r = await ejecutar<{ documentoId: string }>("core.cumplimiento.solicitud_exportar", {
      solicitudId: s.id,
    });
    if (!r) return;
    setExportado(r.documentoId);
    avisar.exito("Exportación generada: queda como evidencia de la solicitud");
  }
  return (
    <div className="flex flex-col gap-3">
      {error && !dialogo ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="flex flex-wrap gap-2 [&>*]:min-h-11">
        {evidencia ? (
          <Button variant="secondary" onClick={() => void descargar(evidencia)}>
            <Download className="size-4" aria-hidden />
            Descargar evidencia
          </Button>
        ) : null}
        {gestionar && viva && s.estado === "recibida" ? (
          <Button variant="secondary" disabled={pendiente} onClick={() => void tomar()}>
            <Play className="size-4" aria-hidden />
            Tomar en proceso
          </Button>
        ) : null}
        {gestionar && viva && exporta(s.tipo) && s.titular.id ? (
          <Button variant="secondary" disabled={pendiente} onClick={() => void exportar()}>
            <FileJson className="size-4" aria-hidden />
            Generar exportación
          </Button>
        ) : null}
        {gestionar && viva && s.tipo === "cancelacion" && s.titular.id ? (
          <Button variant="secondary" onClick={() => setDialogo("anonimizar")}>
            Anonimizar titular
          </Button>
        ) : null}
      </div>
      {gestionar && viva ? (
        <div className="grid grid-cols-2 gap-3 [&>*]:h-12">
          <Button variant="secondary" onClick={() => setDialogo("rechazada")}>
            Rechazar
          </Button>
          <Button onClick={() => setDialogo("resuelta")}>Resolver</Button>
        </div>
      ) : null}
      {dialogo === "resuelta" || dialogo === "rechazada" ? (
        <DialogoResolver
          id={s.id}
          estado={dialogo}
          evidencia={evidencia}
          onCerrar={() => setDialogo(null)}
        />
      ) : null}
      {dialogo === "anonimizar" && s.titular.id && s.titular.tipo ? (
        <DialogoAnonimizar
          titular={{ tipo: s.titular.tipo, id: s.titular.id }}
          solicitudId={s.id}
          onCerrar={() => setDialogo(null)}
        />
      ) : null}
    </div>
  );
}
