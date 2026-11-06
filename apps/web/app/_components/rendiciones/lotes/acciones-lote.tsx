"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Campo, Dialog, Input, Textarea } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import type { LoteDetalle, PermisosLote } from "./tipos";

type Modal = "pagar" | "anular" | null;

/** Acciones del lote según su estado y los permisos de la persona; cada una vuelve a autorizarse en servidor. */
export function AccionesLote({ lote, permisos }: { lote: LoteDetalle; permisos: PermisosLote }) {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [referencia, setReferencia] = useState("");
  const [motivo, setMotivo] = useState("");
  async function correr(llamar: () => ReturnType<typeof ejecutarCapacidad>, ok: string) {
    setOcupado(true);
    setError(null);
    const r = await llamar();
    setOcupado(false);
    if (!r.ok) return setError(r.error.message);
    avisar.exito(ok);
    setModal(null);
    router.refresh();
  }
  const { estado } = lote;
  const base = { id: lote.id };
  return (
    <div className="flex flex-col gap-3">
      {error ? <p role="alert" className="text-base font-medium text-danger-fg">{error}</p> : null}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
        {estado === "borrador" && permisos.aprobar ? (
          <Button disabled={ocupado} onClick={() => void correr(() => ejecutarCapacidad("erp", "rendiciones.lotes.aprobar", base), `${lote.codigoVisible} aprobado`)}>Aprobar lote</Button>
        ) : null}
        {estado === "aprobado" && permisos.pagar ? (
          <Button variant="secondary" disabled={ocupado} onClick={() => void correr(() => ejecutarCapacidad("erp", "rendiciones.lotes.generar_nomina", base), "Nómina generada")}>Generar nómina Santander</Button>
        ) : null}
        {(estado === "generado" || estado === "pagado") && permisos.pagar ? (
          <EnlaceBoton href={`/api/rendiciones/lotes/${lote.id}/nomina`} variante="secondary">Descargar nómina Santander</EnlaceBoton>
        ) : null}
        {(estado === "aprobado" || estado === "generado") && permisos.pagar ? (
          <Button disabled={ocupado} onClick={() => { setError(null); setModal("pagar"); }}>Marcar como pagado</Button>
        ) : null}
        {(estado === "borrador" || estado === "aprobado" || estado === "generado") && permisos.pagar ? (
          <Button variant="secondary" disabled={ocupado} onClick={() => { setError(null); setModal("anular"); }}>Anular lote</Button>
        ) : null}
      </div>
      <Dialog
        abierto={modal === "pagar"}
        onCerrar={() => setModal(null)}
        titulo={`Marcar ${lote.codigoVisible} como pagado`}
        descripcion="Registra el pago que hiciste en el banco. OPAI no transmite nada al banco. Las rendiciones pasan a Pagada y no se deshace."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={ocupado}>Volver</Button>
            <Button disabled={ocupado || referencia.trim().length < 3} onClick={() => void correr(() => ejecutarCapacidad("erp", "rendiciones.lotes.marcar_pagado", { ...base, fechaPago: fecha, referencia: referencia.trim() }), `${lote.codigoVisible} pagado`)}>{ocupado ? "Guardando…" : "Marcar como pagado"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Campo etiqueta="Fecha de pago" htmlFor="fecha-pago"><Input id="fecha-pago" type="date" value={fecha} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setFecha(e.target.value)} /></Campo>
          <Campo etiqueta="Referencia (número de nómina o comprobante)" htmlFor="ref-pago"><Input id="ref-pago" value={referencia} maxLength={80} onChange={(e) => setReferencia(e.target.value)} /></Campo>
          {error ? <p role="alert" className="text-base font-medium text-danger-fg">{error}</p> : null}
        </div>
      </Dialog>
      <Dialog
        abierto={modal === "anular"}
        onCerrar={() => setModal(null)}
        titulo={`¿Anular ${lote.codigoVisible}?`}
        descripcion="Sus rendiciones quedan libres para otro lote."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={ocupado}>Volver</Button>
            <Button disabled={ocupado || motivo.trim().length < 3} onClick={() => void correr(() => ejecutarCapacidad("erp", "rendiciones.lotes.anular", { ...base, motivo: motivo.trim() }), `${lote.codigoVisible} anulado`)}>{ocupado ? "Anulando…" : "Anular lote"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Campo etiqueta="Motivo" htmlFor="motivo-anular"><Textarea id="motivo-anular" value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} /></Campo>
          {error ? <p role="alert" className="text-base font-medium text-danger-fg">{error}</p> : null}
        </div>
      </Dialog>
    </div>
  );
}
