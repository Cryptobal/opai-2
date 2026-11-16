"use client";

import { useState } from "react";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import {
  type BloqueArmador,
  cambiarBloque,
  etiquetaBloquePropuesta,
} from "@/lib/cpq-bloques-propuesta";

import { AvisosIa, BorradorIa, CabeceraIa, type Sugerencia } from "./seccion-propuesta-ia-partes";
import { TextoSeccionPropuesta } from "./texto-seccion-propuesta";

type Props = {
  negocioId: string;
  propuestaId: string;
  bloques: BloqueArmador[];
  bloque: BloqueArmador;
  textoPorDefecto: string;
  onGuardado: () => void;
};

const ACORTAR = "Acorta el texto actual a lo esencial, sin agregar datos nuevos.";

/**
 * Una sección de texto de la propuesta: el texto se edita en el mismo lugar y «Redactar» o «Acortar» piden un borrador
 * a `comercial.contexto.sugerir_seccion`, que solo se guarda si la persona lo acepta.
 */
export function SeccionPropuestaIa(p: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null);
  const nombre = etiquetaBloquePropuesta(p.bloque.tipo, p.bloque.titulo);
  const texto = (p.bloque.contenidoOverride ?? p.textoPorDefecto).trim();

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
  async function guardar(cambio: Parameters<typeof cambiarBloque>[2], aviso: string) {
    const bloques = cambiarBloque(p.bloques, p.bloque.id, cambio);
    const guardado = await ejecutar("cpq.propuestas_tecnica.update", { id: p.propuestaId, bloques }, false, "ninguna");
    if (!guardado) return;
    avisar.exito(aviso);
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
      <TextoSeccionPropuesta
        bloque={p.bloque}
        nombre={nombre}
        textoPorDefecto={p.textoPorDefecto}
        onGuardar={(cambio) => void guardar(cambio, `«${nombre}» guardada`)}
      />
      <AvisosIa error={error} sugerencia={sugerencia} />
      {sugerencia?.borrador ? (
        <BorradorIa
          sugerencia={sugerencia}
          borrador={sugerencia.borrador}
          pendiente={pendiente}
          onAceptar={(t) => void guardar({ contenidoOverride: t }, `«${nombre}» actualizada con el borrador`)}
          onDescartar={() => setSugerencia(null)}
        />
      ) : null}
    </div>
  );
}
