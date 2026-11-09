// Cierre de mes de facturación (BRIEF-33 · CAR-167): etapa de cada borrador del período y transiciones
// del seguimiento proforma → OK del cliente. Puro: sin base de datos ni reloj.

export const ETAPAS_CIERRE = ["falta_oc_hes", "observado", "por_enviar", "esperando_ok", "listo", "emitido"] as const;
export type EtapaCierre = (typeof ETAPAS_CIERRE)[number];

export const ESTADOS_SEGUIMIENTO_CIERRE = ["pendiente", "enviada", "observada", "ok"] as const;
export type EstadoSeguimientoCierre = (typeof ESTADOS_SEGUIMIENTO_CIERRE)[number];

export type SeguimientoCierre = {
  estado: EstadoSeguimientoCierre;
  /** true: el OK del cliente es condición para emitir. false: el OK solo se informa y se deja en la traza. */
  requiereOk: boolean;
  requiereOcHes: boolean;
  ordenCompra: string | null;
  hes: string | null;
  observacion: string | null;
};

/** Sin fila de seguimiento se exige el OK, como antes de que la programación pudiera dispensarlo. */
export const SEGUIMIENTO_CIERRE_INICIAL: SeguimientoCierre = {
  estado: "pendiente",
  requiereOk: true,
  requiereOcHes: false,
  ordenCompra: null,
  hes: null,
  observacion: null,
};

export const NOMBRE_ETAPA: Record<EtapaCierre, string> = {
  falta_oc_hes: "Falta OC/HES",
  observado: "Observado",
  por_enviar: "Por enviar",
  esperando_ok: "Esperando OK",
  listo: "Listo para emitir",
  emitido: "Emitido",
};

/** Etapa del documento. Un documento que ya no es borrador está emitido, sin importar el seguimiento. */
export function etapaCierre(estadoDte: string, seg: SeguimientoCierre | null): EtapaCierre {
  if (estadoDte !== "borrador") return "emitido";
  const s = seg ?? SEGUIMIENTO_CIERRE_INICIAL;
  if (s.estado === "observada") return "observado";
  if (s.requiereOcHes && !s.ordenCompra && !s.hes) return "falta_oc_hes";
  if (s.estado === "ok") return "listo";
  if (s.estado === "enviada") return "esperando_ok";
  return "por_enviar";
}

export type AccionCierre =
  | { accion: "registrar_oc_hes"; ordenCompra?: string | null; hes?: string | null; requiereOcHes?: boolean }
  | { accion: "marcar_enviada" }
  | { accion: "marcar_ok" }
  | { accion: "observar"; observacion: string }
  | { accion: "reabrir" };

const limpio = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);

/** Aplica una acción al seguimiento. Devuelve el nuevo seguimiento o el motivo por el que no procede. */
export function aplicarAccionCierre(
  actual: SeguimientoCierre | null,
  a: AccionCierre,
): { ok: true; seguimiento: SeguimientoCierre } | { ok: false; motivo: string } {
  const s = actual ?? SEGUIMIENTO_CIERRE_INICIAL;
  switch (a.accion) {
    case "registrar_oc_hes": {
      const ordenCompra = a.ordenCompra === undefined ? s.ordenCompra : limpio(a.ordenCompra);
      const hes = a.hes === undefined ? s.hes : limpio(a.hes);
      const requiereOcHes = a.requiereOcHes ?? s.requiereOcHes;
      return { ok: true, seguimiento: { ...s, ordenCompra, hes, requiereOcHes } };
    }
    case "marcar_enviada":
      if (s.estado === "ok") return { ok: false, motivo: "El cliente ya dio su OK: no hace falta reenviar la proforma." };
      return { ok: true, seguimiento: { ...s, estado: "enviada", observacion: null } };
    case "marcar_ok":
      return { ok: true, seguimiento: { ...s, estado: "ok", observacion: null } };
    case "observar": {
      const observacion = limpio(a.observacion);
      if (!observacion) return { ok: false, motivo: "Cuenta qué observó el cliente." };
      return { ok: true, seguimiento: { ...s, estado: "observada", observacion } };
    }
    case "reabrir":
      return { ok: true, seguimiento: { ...s, estado: "pendiente", observacion: null } };
  }
}

/**
 * Por qué un borrador no se puede emitir todavía, o null si se puede. Falta OC/HES y una observación del cliente
 * bloquean siempre; el OK solo bloquea si la programación lo pidió (`requiereOk`).
 */
export function motivoNoEmitible(estadoDte: string, seg: SeguimientoCierre | null): string | null {
  const etapa = etapaCierre(estadoDte, seg);
  if (etapa === "emitido") return "El documento ya no es un borrador.";
  if (etapa === "falta_oc_hes") return "Falta la orden de compra o la HES que exige la programación.";
  if (etapa === "observado") return "El cliente observó el documento: resuélvelo antes de emitir.";
  if ((seg ?? SEGUIMIENTO_CIERRE_INICIAL).requiereOk && etapa !== "listo") return "Esperando el OK del cliente.";
  return null;
}

/** Un borrador se emite en lote si nada lo bloquea (ver `motivoNoEmitible`). */
export const emitibleEnLote = (estadoDte: string, seg: SeguimientoCierre | null) => motivoNoEmitible(estadoDte, seg) === null;

export type ResumenEtapa = { etapa: EtapaCierre; cantidad: number; total: number };

export function resumirEtapas(items: { etapa: EtapaCierre; montoTotal: number }[]): ResumenEtapa[] {
  return ETAPAS_CIERRE.map((etapa) => {
    const f = items.filter((i) => i.etapa === etapa);
    return { etapa, cantidad: f.length, total: f.reduce((s, i) => s + i.montoTotal, 0) };
  });
}
