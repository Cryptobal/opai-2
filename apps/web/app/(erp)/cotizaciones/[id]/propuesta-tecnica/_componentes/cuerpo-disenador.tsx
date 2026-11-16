"use client";

import { ArrowLeft } from "lucide-react";

import { Alerta, Button } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import type { useCapacidad } from "@/app/_components/use-capacidad";
import { type BloqueArmador } from "@/lib/cpq-bloques-propuesta";

import { SeccionesPropuestaIa } from "../../_componentes/secciones-propuesta-ia";
import { BloquesDeCotizacion, ListaBloquesPropuesta } from "./bloques-de-cotizacion";
import { VistaDocumentoPropuesta } from "./vista-documento-propuesta";

export type Propuesta = {
  id: string;
  estado: string;
  servicioDesactualizado: boolean;
  bloques: BloqueArmador[];
  textosPorDefecto: Record<string, string>;
};

type Ejecutar = ReturnType<typeof useCapacidad>["ejecutar"];

/** Bloques, textos con IA y el documento, cuando la propuesta ya está cargada. */
export function CuerpoDisenador(p: {
  cotizacionId: string;
  negocioId: string;
  codigo: string;
  gestionar: boolean;
  propuesta: Propuesta;
  pendiente: boolean;
  error: string | null;
  ejecutar: Ejecutar;
  onPropuesta: (propuesta: Propuesta) => void;
}) {
  const editable = p.gestionar && p.propuesta.estado !== "congelada";
  const firma = p.propuesta.bloques
    .map((b) => `${b.id}:${b.activo}:${b.titulo ?? ""}:${b.contenidoOverride ?? ""}`)
    .join("|");
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="t-heading">Propuesta técnica · {p.codigo}</h1>
        <EnlaceBoton href={`/cotizaciones/${p.cotizacionId}`} variante="ghost" icono={ArrowLeft}>
          Volver a la cotización
        </EnlaceBoton>
      </div>
      <ServicioDesactualizado
        visible={p.propuesta.servicioDesactualizado && editable}
        pendiente={p.pendiente}
        onActualizar={() => void sincronizar(p.ejecutar, p.propuesta, p.cotizacionId, p.onPropuesta)}
      />
      {editable ? (
        <BloquesDeCotizacion
          propuestaId={p.propuesta.id}
          bloques={p.propuesta.bloques}
          onGuardado={() => void recargar(p.ejecutar, p.cotizacionId, p.onPropuesta)}
        />
      ) : (
        <ListaBloquesPropuesta bloques={p.propuesta.bloques} />
      )}
      {editable ? (
        <SeccionesPropuestaIa
          negocioId={p.negocioId}
          propuestaId={p.propuesta.id}
          bloques={p.propuesta.bloques}
          textosPorDefecto={p.propuesta.textosPorDefecto}
          onGuardado={() => void recargar(p.ejecutar, p.cotizacionId, p.onPropuesta)}
        />
      ) : null}
      <VistaDocumentoPropuesta key={firma} id={p.propuesta.id} cotizacionId={p.cotizacionId} />
      {p.error ? <Alerta tono="danger" titulo={p.error} /> : null}
    </div>
  );
}

function ServicioDesactualizado(p: {
  visible: boolean;
  pendiente: boolean;
  onActualizar: () => void;
}) {
  if (!p.visible) return null;
  return (
    <Alerta
      tono="warning"
      titulo="La cotización cambió"
      accion={
        <Button type="button" variant="secondary" cargando={p.pendiente} onClick={p.onActualizar}>
          Actualizar desde la cotización
        </Button>
      }
    >
      La sección del servicio no refleja la última versión de la cotización.
    </Alerta>
  );
}

function sincronizar(ejecutar: Ejecutar, propuesta: Propuesta, cotizacionId: string, onPropuesta: (v: Propuesta) => void) {
  return ejecutar("cpq.propuestas_tecnica.sync_servicio", { id: propuesta.id, cotizacionId }).then((r) => {
    if (r) onPropuesta({ ...propuesta, servicioDesactualizado: false });
  });
}

function recargar(ejecutar: Ejecutar, cotizacionId: string, setPropuesta: (p: Propuesta) => void) {
  return ejecutar<Propuesta>("cpq.propuestas_tecnica.get", { cotizacionId }, false, "ninguna").then(
    (r) => {
      if (r) setPropuesta(r);
    },
  );
}
