"use client";

import { useRouter } from "next/navigation";

import {
  AccionFijaTelefono,
  Alerta,
  Badge,
  DetailScreen,
} from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { textoAprobacionMargenN6 } from "@/lib/cpq-aprobacion-presentacion";
import { estadoCpqBadge } from "@/lib/cpq-presentacion";

import type { DatosFichaCotizacion } from "../../_componentes/datos";
import { AccionesCotizacion } from "./acciones-cotizacion";
import { FichaCotizacionCuerpo } from "./ficha-cotizacion-cuerpo";
import { FichaCotizacionModales, useModalesFichaCotizacion } from "./ficha-cotizacion-modales";
import { ResumenCotizacion } from "./resumen-cotizacion";

type MetaFicha = {
  fechaCalculo?: string;
  validaHastaContrato?: string | null;
  avisoRecalculo?: { mensaje: string } | null;
  puedeEnviar?: boolean;
  puedeAprobarMargen?: boolean;
  motivoNoAprobarMargen?: string | null;
  autoaprobacionMargen?: boolean | null;
};

export function FichaCotizacion({ datos }: { datos: DatosFichaCotizacion }) {
  const router = useRouter();
  const modales = useModalesFichaCotizacion();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const d = datos.ficha;
  if (!d) {
    return (
      <DetailScreen state={datos.state} titulo="Cotización" textos={{ error: { accion: <BotonReintentar /> } }}>
        {null}
      </DetailScreen>
    );
  }
  const editable = datos.gestionar && d.version.editable;
  const c = d.calculo as Parameters<typeof ResumenCotizacion>[0]["calculo"];
  const meta = d.meta as MetaFicha | undefined;
  const badge = estadoCpqBadge(d.version.estado);
  const recargar = () => router.refresh();
  const aprobacionTxt =
    d.version.estado === "en_aprobacion"
      ? textoAprobacionMargenN6({
          autoaprobacionMargen: meta?.autoaprobacionMargen,
          puedeAprobarMargen: Boolean(meta?.puedeAprobarMargen),
          motivoNoAprobarMargen: meta?.motivoNoAprobarMargen,
        })
      : null;

  const resumen = (
    <ResumenCotizacion
      version={d.version}
      calculo={c}
      {...(meta !== undefined ? { meta } : {})}
      verCostos={datos.costos}
    />
  );

  const propsAcciones = {
    cotizacionId: d.cotizacion.id,
    version: d.version,
    calculo: c,
    ...(meta !== undefined ? { meta } : {}),
    gestionar: datos.gestionar,
    aprobar: datos.aprobar,
    onHecho: recargar,
    onEnviar: () => modales.setEnviarAbierto(true),
    onVistaPrevia: () => modales.setPreviewAbierto(true),
  };

  return (
    <>
      <DetailScreen
        state={datos.state}
        titulo={d.cotizacion.codigo}
        subtitulo={
          <>
            {d.cotizacion.titulo} · v{d.version.numero}
            {d.negocioTitulo ? <> · {d.negocioTitulo}</> : null}
          </>
        }
        estado={
          <>
            <Badge tono={badge.tono}>{badge.etiqueta}</Badge>
            {!d.cotizacion.vigente ? <Badge tono="neutro">Alternativa</Badge> : null}
          </>
        }
        acciones={<AccionesCotizacion {...propsAcciones} />}
      >
        {error ? <Alerta tono="danger" titulo={error} className="mb-4" /> : null}
        {aprobacionTxt ? (
          <Alerta tono="info" titulo={aprobacionTxt.titulo} className="mb-4">
            {aprobacionTxt.detalle}
          </Alerta>
        ) : null}
        <FichaCotizacionCuerpo
          d={d}
          datos={datos}
          resumen={resumen}
          editable={Boolean(editable)}
          pendiente={pendiente}
          ejecutar={ejecutar}
          limpiarError={limpiarError}
          recargar={recargar}
          modales={modales}
          {...(meta !== undefined ? { meta } : {})}
        />
        {editable ? (
          <AccionFijaTelefono>
            <AccionesCotizacion {...propsAcciones} soloPrimaria />
          </AccionFijaTelefono>
        ) : null}
      </DetailScreen>
      <FichaCotizacionModales
        modales={modales}
        cotizacionId={d.cotizacion.id}
        codigo={d.cotizacion.codigo}
        versionNumero={d.version.numero}
        cuentaId={d.cuentaId}
        requiereAprobacion={Boolean(c.requiereAprobacion)}
        estadoVersion={d.version.estado}
        enviada={d.version.estado === "enviada" || d.version.estado === "aceptada"}
        recargar={recargar}
      />
    </>
  );
}
