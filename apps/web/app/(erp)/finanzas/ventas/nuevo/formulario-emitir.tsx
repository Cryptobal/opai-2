"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";
import type { CuentaFila } from "@/lib/tipos-maestros";

import type { Venta } from "../_componentes/tipos";
import { AccionesEmitir, AlertasEmitir } from "./acciones-emitir";
import { EmitirDestinatarios } from "./emitir-destinatarios";
import { FormularioNota } from "./formulario-nota";
import { EmitirReferencias } from "./emitir-referencias";
import { EmitirSinClientes } from "./emitir-sin-clientes";
import {
  type LineaForm,
  mensajeReferencias,
  parseMonto,
  problemaReferencias,
  type RefForm,
  type TipoEmision,
} from "./emitir-util";
import { BloqueEmisionGuardada, EmitirDialogos } from "./emitir-secciones";
import { EmitirClienteTipo } from "./emitir-cliente";
import { EmitirLineasDetalle } from "./emitir-lineas";
import { useBorrador } from "./use-borrador";
import { useEmision } from "./use-emision";

/** Emisión DTE 33/34: borrador con vista previa (dryRun) y emisión con aprobación para agentes. */
export function FormularioEmitir({ cuentas, sinRut }: { cuentas: CuentaFila[]; sinRut: number }) {
  const router = useRouter();
  const { ejecutar, pendiente, error, codigo } = useCapacidad("erp");
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [tipoDte, setTipoDte] = useState<TipoEmision>("33");
  const [plazoPagoDias, setPlazoPagoDias] = useState("30");
  const [glosa, setGlosa] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([{ glosa: "", montoTexto: "" }]);
  const [refs, setRefs] = useState<RefForm[]>([]);
  const [previewBorrador, setPreviewBorrador] = useState<Venta | null>(null);
  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<"borrador" | "emitir" | null>(null);
  const { previewEmitir, preflightBloqueante, revisarEmision, emitir } = useEmision({
    ejecutar,
    codigo,
    documentoId,
    setDialogo,
  });

  const cuenta = cuentas.find((c) => c.id === cuentaId);
  const tipoFactura = tipoDte === "34" ? "34" : "33";
  const nota = tipoDte === "61" || tipoDte === "56" ? tipoDte : null;
  const lineasValidas = lineas.every(
    (l) => l.glosa.trim().length > 0 && parseMonto(l.montoTexto) != null,
  );
  const plazo = Number(plazoPagoDias);
  const plazoOk = Number.isInteger(plazo) && plazo >= 0 && plazo <= 365;
  const hoyIso = new Date().toISOString().slice(0, 10);
  const problemaRefs = problemaReferencias(refs, hoyIso);
  const mensajeRefs = mensajeReferencias(refs, hoyIso);
  const formOk = Boolean(cuentaId && cuenta?.rut && lineasValidas && plazoOk && !problemaRefs);

  const { revisarBorrador, guardarBorrador } = useBorrador({
    ejecutar,
    formOk,
    datos: { cuentaId, tipoDte: tipoFactura, plazo, lineas, glosa, referencias: refs },
    setPreviewBorrador,
    setDocumentoId,
    setDialogo,
  });

  const accionesForm = (
    <AccionesEmitir
      pendiente={pendiente}
      formOk={formOk}
      hayDocumento={Boolean(documentoId)}
      onCancelar={() => router.push("/finanzas/ventas")}
      onRevisar={() => void revisarBorrador()}
      onGuardar={() => void guardarBorrador()}
    />
  );

  if (nota) {
    return (
      <FormularioNota
        cuentas={cuentas}
        sinRut={sinRut}
        tipoDte={nota}
        setTipoDte={setTipoDte}
        cuentaId={cuentaId}
        setCuentaId={setCuentaId}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-36 md:pb-0">
      <div className="hidden items-center justify-end gap-3 md:flex">{accionesForm}</div>
      <EmitirSinClientes hayClientes={cuentas.length > 0} sinRut={sinRut} />
      <AlertasEmitir
        error={error}
        preflightBloqueante={preflightBloqueante}
        cuentaSinRut={Boolean(cuentaId && !cuenta?.rut)}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <EmitirClienteTipo
          cuentas={cuentas}
          documentoId={documentoId}
          cuentaId={cuentaId}
          setCuentaId={setCuentaId}
          tipoDte={tipoDte}
          setTipoDte={setTipoDte}
          plazoPagoDias={plazoPagoDias}
          setPlazoPagoDias={setPlazoPagoDias}
          glosa={glosa}
          setGlosa={setGlosa}
          hoyIso={hoyIso}
        />
        <EmitirLineasDetalle documentoId={documentoId} lineas={lineas} setLineas={setLineas} />
      </div>
      <EmitirReferencias
        refs={refs}
        setRefs={setRefs}
        bloqueado={Boolean(documentoId)}
        mensaje={mensajeRefs}
      />
      {documentoId ? <EmitirDestinatarios documentoId={documentoId} cuentaId={cuentaId} /> : null}
      {documentoId ? (
        <BloqueEmisionGuardada
          pendiente={pendiente}
          revisarEmision={() => void revisarEmision()}
          emitir={() => void emitir()}
        />
      ) : null}
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-border bg-bg px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
        {accionesForm}
      </div>
      <EmitirDialogos
        dialogo={dialogo}
        setDialogo={setDialogo}
        previewBorrador={previewBorrador}
        previewEmitir={previewEmitir}
        guardarBorrador={() => void guardarBorrador()}
        emitir={() => void emitir()}
      />
    </div>
  );
}
