"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar } from "@opai/ds";

import type { useCapacidad } from "@/app/_components/use-capacidad";

import type { Venta } from "../_componentes/tipos";
import type { ItemPreflight } from "./emitir-util";

type Ejecutar = ReturnType<typeof useCapacidad>["ejecutar"];

/** Emisión del borrador guardado: revisión previa (preflight + vista previa) y emisión real. */
export function useEmision(p: {
  ejecutar: Ejecutar;
  codigo: string | null;
  documentoId: string | null;
  setDialogo: (d: "borrador" | "emitir" | null) => void;
}) {
  const router = useRouter();
  const { ejecutar, codigo, documentoId, setDialogo } = p;
  const [previewEmitir, setPreviewEmitir] = useState<Venta | null>(null);
  const [preflightBloqueante, setPreflightBloqueante] = useState<string | null>(null);

  async function revisarEmision() {
    if (!documentoId) return;
    setPreflightBloqueante(null);
    const pf = await ejecutar<{ listo: boolean; items: ItemPreflight[] }>(
      "finanzas.ventas.preflight_emision",
      { documentoId },
      false,
    );
    if (pf && !pf.listo) {
      const bloqueo = pf.items.find((i) => i.bloqueante && !i.ok);
      if (bloqueo) {
        setPreflightBloqueante(bloqueo.mensaje);
        return;
      }
    }
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
      if (codigo === "APPROVAL_REQUIRED")
        avisar.info("La emisión quedó en la cola de aprobaciones de agentes.");
      return;
    }
    avisar.exito("Documento emitido");
    router.push(`/finanzas/ventas/${r.id}`);
  }

  return { previewEmitir, preflightBloqueante, revisarEmision, emitir };
}
