"use client";

import { esSeccionDeTexto } from "@opai/domain";

import { type BloqueArmador } from "@/lib/cpq-bloques-propuesta";

import { SeccionPropuestaIa } from "./seccion-propuesta-ia";

/** Secciones de texto activas de la propuesta: el texto se edita en el mismo lugar, con su ayuda de IA. */
export function SeccionesPropuestaIa(p: {
  negocioId: string;
  propuestaId: string;
  bloques: BloqueArmador[];
  textosPorDefecto: Record<string, string>;
  onGuardado: () => void;
}) {
  const secciones = p.bloques.filter((b) => b.activo && esSeccionDeTexto(b.tipo));
  if (secciones.length === 0) return null;
  return (
    <div role="group" aria-labelledby="textos-propuesta" className="space-y-2">
      <p id="textos-propuesta" className="t-label">
        Textos de la propuesta
      </p>
      {secciones.map((b) => (
        <SeccionPropuestaIa
          key={b.id}
          negocioId={p.negocioId}
          propuestaId={p.propuestaId}
          bloques={p.bloques}
          bloque={b}
          textoPorDefecto={p.textosPorDefecto[b.id] ?? ""}
          onGuardado={p.onGuardado}
        />
      ))}
    </div>
  );
}
