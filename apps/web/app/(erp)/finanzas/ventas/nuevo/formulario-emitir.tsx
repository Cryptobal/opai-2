"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Alerta,
  avisar,
  Button,
} from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import type { CuentaFila } from "@/lib/tipos-maestros";

import type { Venta } from "../_componentes/tipos";
import { BloqueEmisionGuardada, EmitirDialogos } from "./emitir-secciones";
import { EmitirClienteTipo } from "./emitir-cliente";
import { EmitirLineasDetalle } from "./emitir-lineas";

type LineaForm = { glosa: string; montoTexto: string };

function parseMonto(texto: string): number | null {
  const n = Number(texto.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

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
  const [previewEmitir, setPreviewEmitir] = useState<Venta | null>(null);
  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<"borrador" | "emitir" | null>(null);

  const cuenta = cuentas.find((c) => c.id === cuentaId);
  const lineasValidas = lineas.every((l) => l.glosa.trim().length > 0 && parseMonto(l.montoTexto) != null);
  const plazo = Number(plazoPagoDias);
  const plazoOk = Number.isInteger(plazo) && plazo >= 0 && plazo <= 365;
  const formOk = Boolean(cuentaId && cuenta?.rut && lineasValidas && plazoOk);

  function inputBorrador(dryRun: boolean) {
    return {
      cuentaId: cuentaId!,
      tipoDte: Number(tipoDte) as 33 | 34,
      plazoPagoDias: plazo,
      lineas: lineas.map((l) => ({ glosa: l.glosa.trim(), monto: parseMonto(l.montoTexto)! })),
      ...(glosa.trim() ? { glosa: glosa.trim() } : {}),
      dryRun,
    };
  }

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

  async function revisarEmision() {
    if (!documentoId) return;
    const r = await ejecutar<Venta>("finanzas.ventas.emitir", { documentoId }, true);
    if (r) {
      setPreviewEmitir(r);
      setDialogo("emitir");
    }
  }

  async function emitir() {
    if (!documentoId) return;
    const r = await ejecutar<Venta>("finanzas.ventas.emitir", { documentoId }, false);
    if (!r) {
      if (codigo === "APPROVAL_REQUIRED") {
        avisar.info("La emisión quedó en la cola de aprobaciones de agentes.");
      }
      return;
    }
    avisar.exito("Documento emitido");
    router.push(`/finanzas/ventas/${r.id}`);
  }

  const accionesForm = (
    <>
      <Button variant="secondary" disabled={pendiente} onClick={() => router.push("/finanzas/ventas")}>
        Cancelar
      </Button>
      <Button variant="secondary" disabled={pendiente || !formOk || Boolean(documentoId)} onClick={() => void revisarBorrador()}>
        Revisar borrador
      </Button>
      <Button disabled={pendiente || !formOk || Boolean(documentoId)} onClick={() => void guardarBorrador()}>
        Guardar borrador
      </Button>
    </>
  );

  return (
    <div className="flex flex-col gap-4 pb-36 md:pb-0">
      <div className="hidden items-center justify-end gap-3 md:flex">{accionesForm}</div>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {cuentaId && !cuenta?.rut ? (
        <Alerta tono="warning" titulo="La cuenta seleccionada no tiene RUT">
          Complete el RUT del cliente antes de emitir un DTE.
        </Alerta>
      ) : null}
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
