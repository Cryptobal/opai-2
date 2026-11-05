"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AccionFijaTelefono, Alerta, BloquePlegable, DetailScreen } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { textoAprobacionMargenN6 } from "@/lib/cpq-aprobacion-presentacion";
import { avisosCpq } from "@/lib/cpq-avisos";
import { type BloqueFicha, pasosDeFicha } from "@/lib/cpq-ficha-pasos";
import { conteo, margenPctTexto } from "@/lib/cpq-presentacion";

import type { DatosFichaCotizacion } from "../../_componentes/datos";
import { AccionesFicha } from "./acciones-ficha";
import { ContenidoCliente } from "./contenido-cliente";
import { ContenidoCostos } from "./contenido-costos";
import { ContenidoDocumento } from "./contenido-documento";
import { ContenidoPuestos } from "./contenido-puestos";
import { FichaCotizacionModales, useModalesFichaCotizacion } from "./ficha-cotizacion-modales";
import type { MetaFicha } from "./meta-ficha";
import { ResumenSuperior } from "./resumen-superior";

type Calculo = Parameters<typeof ContenidoCostos>[0]["calculo"] & Parameters<typeof ResumenSuperior>[0]["calculo"];

const puestosDe = (secciones: { lineas: { id: string; nombre: string; tipo: string }[] }[]) =>
  secciones.flatMap((s) => s.lineas.filter((l) => l.tipo === "puesto").map((l) => ({ id: l.id, nombre: l.nombre })));

/** Ficha de cotización con pasos plegables (alternativa B, CAR-192): resumen fijo y cuatro bloques. */
export function FichaCotizacion({ datos }: { datos: DatosFichaCotizacion }) {
  const router = useRouter();
  const modales = useModalesFichaCotizacion();
  const { ejecutar, pendiente, limpiarError } = useCapacidad("erp");
  const d = datos.ficha;
  const meta = d?.meta as MetaFicha | undefined;
  const c = (d?.calculo ?? {}) as Calculo;
  const editable = Boolean(datos.gestionar && d?.version.editable);
  const puestosHabilitados = d ? puestosDe(d.secciones) : [];
  const pasos = pasosDeFicha({
    estado: meta?.estadoFicha?.estado ?? "incompleta",
    tieneCuenta: Boolean(d?.cuentaId),
    puestos: puestosHabilitados.length,
    avisosBloqueantes: avisosCpq(c).filter((a) => a.bloquea && a.accion).length,
    bloqueos: meta?.estadoFicha?.bloqueos.map((b) => b.codigo) ?? [],
    mutualPendiente: Boolean(meta?.requiereConfirmarMutual),
  });
  const [abiertos, setAbiertos] = useState<Record<BloqueFicha, boolean>>({
    cliente: false, puestos: false, costos: false, documento: false, [pasos.primeroAbierto]: true,
  });
  // Al resolver un paso se abre el siguiente con pendientes, sin cerrar lo que la persona abrió.
  const [anterior, setAnterior] = useState(pasos.primeroAbierto);
  if (anterior !== pasos.primeroAbierto) {
    setAnterior(pasos.primeroAbierto);
    setAbiertos((a) => ({ ...a, [pasos.primeroAbierto]: true }));
  }

  if (!d) {
    return (
      <DetailScreen state={datos.state} titulo="Cotización" textos={{ error: { accion: <BotonReintentar /> } }}>
        {null}
      </DetailScreen>
    );
  }
  const recargar = () => router.refresh();
  const de = (b: BloqueFicha) => pasos.pasos.find((p) => p.bloque === b)!;
  const abrir = (b: BloqueFicha) => (v: boolean) => setAbiertos((a) => ({ ...a, [b]: v }));
  const aprobacionTxt =
    d.version.estado === "en_aprobacion"
      ? textoAprobacionMargenN6({
          autoaprobacionMargen: meta?.autoaprobacionMargen,
          puedeAprobarMargen: Boolean(meta?.puedeAprobarMargen),
          motivoNoAprobarMargen: meta?.motivoNoAprobarMargen,
        })
      : null;
  const costos = editable && datos.costos ? { versionId: d.version.id, onGuardado: recargar, puestos: puestosHabilitados } : undefined;
  const propsAcciones = {
    cotizacionId: d.cotizacion.id,
    meta,
    calculo: c,
    gestionar: datos.gestionar,
    aprobar: datos.aprobar,
    onHecho: recargar,
    onEnviar: () => modales.setEnviarAbierto(true),
    onVistaPrevia: () => modales.setPreviewAbierto(true),
    onCompletar: () => abrir(pasos.primeroAbierto)(true),
  };
  const resumenCostos =
    c.ventaMensual && !c.noEnviable && c.margenEfectivoPct != null ? `Margen ${margenPctTexto(c.margenEfectivoPct)}` : undefined;
  const bloque = (b: BloqueFicha, paso: number, titulo: string, resumen: string | undefined, contenido: React.ReactNode) => (
    <BloquePlegable
      paso={paso}
      titulo={titulo}
      {...(resumen ? { resumen } : {})}
      pendientes={de(b).pendientes}
      {...(de(b).bloqueado ? { bloqueado: "En espera" } : {})}
      abierto={abiertos[b]}
      onCambiar={abrir(b)}
    >
      {contenido}
    </BloquePlegable>
  );
  return (
    <>
      <DetailScreen
        state={datos.state}
        titulo={d.cotizacion.codigo}
        subtitulo={<>{d.cotizacion.titulo}{d.cotizacion.vigente ? null : " · Alternativa"}</>}
      >
        <div className="space-y-3">
          <ResumenSuperior
            calculo={c}
            meta={meta}
            parametros={d.parametros}
            puestos={puestosHabilitados.length}
            acciones={
              <AccionesFicha {...propsAcciones} />
            }
          />
          {aprobacionTxt ? (
            <Alerta tono="info" titulo={aprobacionTxt.titulo}>
              <span className="flex flex-col gap-2">
                <span>{aprobacionTxt.detalle}</span>
                {meta?.aprobacion?.bandejaId ? (
                  <EnlaceBoton href={`/configuracion/aprobaciones?ver=${encodeURIComponent(meta.aprobacion.bandejaId)}`} variante="ghost" className="self-start px-0">
                    Ver en la bandeja de aprobaciones
                  </EnlaceBoton>
                ) : null}
              </span>
            </Alerta>
          ) : null}
          {bloque("cliente", 1, "Cliente e instalación", d.negocioTitulo ?? undefined, <ContenidoCliente d={d} />)}
          {bloque("puestos", 2, "Puestos", conteo(puestosHabilitados.length, "puesto"),
            <ContenidoPuestos d={d} verCostos={datos.costos} editable={editable} pendiente={pendiente} ejecutar={ejecutar} limpiarError={limpiarError} recargar={recargar} modales={modales} />)}
          {bloque("costos", 3, "Costos y margen", resumenCostos,
            <ContenidoCostos d={d} calculo={c} meta={meta} editable={editable} modales={modales} {...(costos ? { costos } : {})} />)}
          {bloque("documento", 4, "Documento y envío", meta?.estadoFicha?.etiqueta,
            <ContenidoDocumento d={d} datos={datos} meta={meta} calculo={c} onVistaPrevia={() => modales.setPreviewAbierto(true)} />)}
        </div>
        {datos.gestionar && meta?.estadoFicha && !["esperar", "ninguna"].includes(meta.estadoFicha.siguiente.accion) ? (
          <AccionFijaTelefono compacto={false}>
            <AccionesFicha {...propsAcciones} modo="fija" />
          </AccionFijaTelefono>
        ) : null}
      </DetailScreen>
      <FichaCotizacionModales modales={modales} d={d} calculo={c} meta={meta} verCostos={datos.costos} recargar={recargar} />
    </>
  );
}
