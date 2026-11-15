"use client";

import { useState } from "react";

import { Alerta, avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { type BloqueArmador, conTextoAceptado, etiquetaBloquePropuesta } from "@/lib/cpq-bloques-propuesta";

type Sugerencia = { disponible: boolean; borrador: string | null; fuentes: { id: string }[]; faltantes: string[]; aviso: string | null };

const ACORTAR = "Acorta el texto actual a lo esencial, sin agregar datos nuevos.";

/**
 * Una sección de texto de la propuesta con IA: «Redactar» o «Acortar» piden un borrador a
 * `comercial.contexto.sugerir_seccion`; el texto guardado solo cambia si la persona acepta el borrador.
 */
export function SeccionPropuestaIa(p: {
  negocioId: string;
  propuestaId: string;
  bloques: BloqueArmador[];
  bloque: BloqueArmador;
  onGuardado: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null);
  const nombre = etiquetaBloquePropuesta(p.bloque.tipo, p.bloque.titulo);
  const texto = p.bloque.contenidoOverride?.trim() ?? "";

  async function pedir(acortar: boolean) {
    setSugerencia(null);
    const entrada = { negocioId: p.negocioId, seccion: nombre, ...(acortar ? { instruccion: ACORTAR } : {}), ...(texto ? { textoActual: texto } : {}) };
    setSugerencia(await ejecutar<Sugerencia>("comercial.contexto.sugerir_seccion", entrada, false, "ninguna"));
  }
  async function aceptar(borrador: string) {
    const bloques = conTextoAceptado(p.bloques, p.bloque.id, borrador);
    if (!(await ejecutar("cpq.propuestas_tecnica.update", { id: p.propuestaId, bloques }, false, "ninguna"))) return;
    avisar.exito(`«${nombre}» actualizada con el borrador`);
    setSugerencia(null);
    p.onGuardado();
  }
  return (
    <div aria-label={nombre} role="group" className="space-y-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-body font-medium">{nombre}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => void pedir(false)} disabled={pendiente}>
            Redactar con IA
          </Button>
          <Button variant="ghost" onClick={() => void pedir(true)} disabled={pendiente || !texto}>
            Acortar con IA
          </Button>
        </div>
      </div>
      <p className="t-body-sm whitespace-pre-wrap text-fg-muted">
        {texto || (p.bloque.bibliotecaClave ? "Usa el texto de la biblioteca." : "Sin texto todavía.")}
      </p>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {sugerencia?.aviso ? <Alerta tono="info" titulo={sugerencia.aviso} /> : null}
      {sugerencia && !sugerencia.borrador && sugerencia.faltantes.length > 0 ? (
        <Alerta tono="info" titulo="La IA no pudo redactar">
          {sugerencia.faltantes.join(" ")}
        </Alerta>
      ) : null}
      {sugerencia?.borrador ? (
        <div aria-label="Borrador de IA" role="region" className="space-y-2 rounded-md bg-fill p-3">
          <p className="t-caption text-fg-muted">
            Borrador de IA basado en {sugerencia.fuentes.length} {sugerencia.fuentes.length === 1 ? "nota" : "notas"} del
            negocio. Revísalo: no se guarda hasta que lo aceptes.
          </p>
          <p className="t-body-sm whitespace-pre-wrap">{sugerencia.borrador}</p>
          {sugerencia.faltantes.length > 0 ? <p className="t-caption text-fg-muted">Faltó: {sugerencia.faltantes.join(" ")}</p> : null}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void aceptar(sugerencia.borrador ?? "")} disabled={pendiente}>
              Aceptar borrador
            </Button>
            <Button variant="ghost" onClick={() => setSugerencia(null)} disabled={pendiente}>
              Descartar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
