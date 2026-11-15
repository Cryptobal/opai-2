"use client";

import { type BloqueArmador, esSeccionDeTexto } from "@/lib/cpq-bloques-propuesta";

import { SeccionPropuestaIa } from "./seccion-propuesta-ia";

/** Secciones de texto activas de la propuesta, cada una con su ayuda de IA (CAR-534). */
export function SeccionesPropuestaIa(p: { negocioId: string; propuestaId: string; bloques: BloqueArmador[]; onGuardado: () => void }) {
  const secciones = p.bloques.filter((b) => b.activo && esSeccionDeTexto(b.tipo));
  if (secciones.length === 0) return null;
  return (
    <div role="group" aria-labelledby="textos-propuesta" className="space-y-2">
      <p id="textos-propuesta" className="t-label">
        Textos de la propuesta
      </p>
      {secciones.map((b) => (
        <SeccionPropuestaIa key={b.id} negocioId={p.negocioId} propuestaId={p.propuestaId} bloques={p.bloques} bloque={b} onGuardado={p.onGuardado} />
      ))}
    </div>
  );
}
