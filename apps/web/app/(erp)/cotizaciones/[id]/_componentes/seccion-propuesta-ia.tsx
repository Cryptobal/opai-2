"use client";

import { useState } from "react";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import {
  type BloqueArmador,
  conTextoAceptado,
  etiquetaBloquePropuesta,
} from "@/lib/cpq-bloques-propuesta";

import { AvisosIa, BorradorIa, CabeceraIa, type Sugerencia } from "./seccion-propuesta-ia-partes";

type Props = {
  negocioId: string;
  propuestaId: string;
  bloques: BloqueArmador[];
  bloque: BloqueArmador;
  onGuardado: () => void;
};

const ACORTAR = "Acorta el texto actual a lo esencial, sin agregar datos nuevos.";

/**
 * Una sección de texto de la propuesta con IA: «Redactar» o «Acortar» piden un borrador a
 * `comercial.contexto.sugerir_seccion`; el texto guardado solo cambia si la persona acepta el borrador.
 */
export function SeccionPropuestaIa(p: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null);
  const nombre = etiquetaBloquePropuesta(p.bloque.tipo, p.bloque.titulo);
  const texto = p.bloque.contenidoOverride?.trim() ?? "";

  async function pedir(acortar: boolean) {
    setSugerencia(null);
    const entrada = {
      negocioId: p.negocioId,
      seccion: nombre,
      ...(acortar ? { instruccion: ACORTAR } : {}),
      ...(texto ? { textoActual: texto } : {}),
    };
    setSugerencia(
      await ejecutar<Sugerencia>("comercial.contexto.sugerir_seccion", entrada, false, "ninguna"),
    );
  }
  async function aceptar(borrador: string) {
    const bloques = conTextoAceptado(p.bloques, p.bloque.id, borrador);
    const guardado = await ejecutar(
      "cpq.propuestas_tecnica.update",
      { id: p.propuestaId, bloques },
      false,
      "ninguna",
    );
    if (!guardado) return;
    avisar.exito(`«${nombre}» actualizada con el borrador`);
    setSugerencia(null);
    p.onGuardado();
  }
  return (
    <div aria-label={nombre} role="group" className="space-y-2 rounded-md border border-border p-3">
      <CabeceraIa
        nombre={nombre}
        pendiente={pendiente}
        conTexto={!!texto}
        onPedir={(acortar) => void pedir(acortar)}
      />
      <p className="t-body-sm whitespace-pre-wrap text-fg-muted">
        {texto ||
          (p.bloque.bibliotecaClave ? "Usa el texto de la biblioteca." : "Sin texto todavía.")}
      </p>
      <AvisosIa error={error} sugerencia={sugerencia} />
      {sugerencia?.borrador ? (
        <BorradorIa
          sugerencia={sugerencia}
          borrador={sugerencia.borrador}
          pendiente={pendiente}
          onAceptar={(t) => void aceptar(t)}
          onDescartar={() => setSugerencia(null)}
        />
      ) : null}
    </div>
  );
}
