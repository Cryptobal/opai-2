"use client";

import { esSeccionDeTexto } from "@opai/domain";
import { Alerta } from "@opai/ds";

import { type BloqueArmador } from "@/lib/cpq-bloques-propuesta";

import { SeccionPropuestaIa } from "./seccion-propuesta-ia";
import { useGuardarBloques } from "./use-guardar-bloques";

/** Secciones de texto activas de la propuesta: el texto se edita en el mismo lugar, con su ayuda de IA. */
export function SeccionesPropuestaIa(p: {
  negocioId: string;
  propuestaId: string;
  bloques: BloqueArmador[];
  textosPorDefecto: Record<string, string>;
  onGuardado: () => void;
}) {
  const { guardar, error } = useGuardarBloques(p.propuestaId, p.bloques, p.onGuardado);
  const secciones = p.bloques.filter((b) => b.activo && esSeccionDeTexto(b.tipo));
  if (secciones.length === 0) return null;
  return (
    <div role="group" aria-labelledby="textos-propuesta" className="space-y-2">
      <p id="textos-propuesta" className="t-label">
        Textos de la propuesta
      </p>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {secciones.map((b) => (
        <SeccionPropuestaIa
          key={b.id}
          negocioId={p.negocioId}
          bloque={b}
          textoPorDefecto={p.textosPorDefecto[b.id] ?? ""}
          onGuardar={(cambio) => guardar(b.id, cambio)}
        />
      ))}
    </div>
  );
}
