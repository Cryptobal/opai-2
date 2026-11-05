"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import type { CuentaFila } from "@/lib/tipos-maestros";

import type { Venta } from "../_componentes/tipos";
import { AccionesEmitir, AlertasEmitir } from "./acciones-emitir";
import { construirInputBorrador, type LineaForm, parseMonto } from "./emitir-util";
import { BloqueEmisionGuardada, EmitirDialogos } from "./emitir-secciones";
import { EmitirClienteTipo } from "./emitir-cliente";
import { EmitirLineasDetalle } from "./emitir-lineas";
import { useEmision } from "./use-emision";

/** Emisión DTE 33/34: borrador con vista previa (dryRun) y emisión con aprobación para agentes. */
export function FormularioEmitir({ cuentas }: { cuentas: CuentaFila[] }) {
  const router = useRouter();
  const { ejecutar, pendiente, error, codigo } = useCapacidad("erp");
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [tipoDte, setTipoDte] = useState<"33" | "34">("33");
  const [plazoPagoDias, setPlazoPagoDias] = useState("30");
  const [glosa, setGlosa] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([{ glosa: "", montoTexto: "" }]);
  const [previewBorrador, setPreviewBorrador] = useState<Venta | null>(null);
  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<"borrador" | "emitir" | null>(null);
  const { previewEmitir, preflightBloqueante, revisarEmision, emitir } = useEmision({ ejecutar, codigo, documentoId, setDialogo });

  const cuenta = cuentas.find((c) => c.id === cuentaId);
  const lineasValidas = lineas.every((l) => l.glosa.trim().length > 0 && parseMonto(l.montoTexto) != null);
  const plazo = Number(plazoPagoDias);
  const plazoOk = Number.isInteger(plazo) && plazo >= 0 && plazo <= 365;
  const formOk = Boolean(cuentaId && cuenta?.rut && lineasValidas && plazoOk);

  const inputBorrador = (dryRun: boolean) =>
    construirInputBorrador({ cuentaId: cuentaId!, tipoDte, plazo, lineas, glosa, dryRun });

  async function revisarBorrador() {
    if (!formOk) return;
    const r = await ejecutar<Venta>("finanzas.ventas.crear_borrador", inputBorrador(true), true);
    if (r) {
      setPreviewBorrador(r);
      setDialogo("borrador");
    }
  }

  async function guardarBorrador() {
    if (!formOk) return;
    const r = await ejecutar<Venta>("finanzas.ventas.crear_borrador", inputBorrador(false), false);
    if (!r) return;
    setDocumentoId(r.id);
    setPreviewBorrador(null);
    setDialogo(null);
    avisar.exito("Borrador guardado");
  }

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

  return (
    <div className="flex flex-col gap-4 pb-36 md:pb-0">
      <div className="hidden items-center justify-end gap-3 md:flex">{accionesForm}</div>
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
        />
        <EmitirLineasDetalle documentoId={documentoId} lineas={lineas} setLineas={setLineas} />
      </div>
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
