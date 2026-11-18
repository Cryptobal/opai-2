import type { CeldaPauta, MotivoPpc, VarianteCelda } from "@opai/domain";

type TramoBase = { desde: string; hasta: string; dias: number };

/** Tramos seguidos de PPC en un mes, por motivo. */
export function tramosPpc(celdas: CeldaPauta[]): (TramoBase & { motivo: MotivoPpc })[] {
  const salida: (TramoBase & { motivo: MotivoPpc })[] = [];
  let actual: (TramoBase & { motivo: MotivoPpc }) | null = null;
  for (const c of celdas) {
    if (c.estado === "libre") continue;
    if (c.estado !== "ppc" || !c.motivo) {
      actual = null;
      continue;
    }
    if (actual && actual.motivo === c.motivo) {
      actual.hasta = c.fecha;
      actual.dias += 1;
    } else {
      actual = { motivo: c.motivo, desde: c.fecha, hasta: c.fecha, dias: 1 };
      salida.push(actual);
    }
  }
  return salida;
}

/** Tramos seguidos donde la misma persona cubre con una variante (reemplazo o refuerzo). */
export function tramosVariante(
  celdas: CeldaPauta[],
  variante: Exclude<VarianteCelda, null | "refuerzo_extra">,
): (TramoBase & { personaId: string })[] {
  const salida: (TramoBase & { personaId: string })[] = [];
  let actual: (TramoBase & { personaId: string }) | null = null;
  for (const c of celdas) {
    const quien = c.cubiertoPorId;
    if (c.estado !== "cubierto" || c.variante !== variante || !quien) {
      actual = null;
      continue;
    }
    if (actual && actual.personaId === quien) {
      actual.hasta = c.fecha;
      actual.dias += 1;
    } else {
      actual = { personaId: quien, desde: c.fecha, hasta: c.fecha, dias: 1 };
      salida.push(actual);
    }
  }
  return salida;
}