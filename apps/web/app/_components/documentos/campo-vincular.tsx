"use client";

import { useCallback, useRef } from "react";

import { Campo, Combobox, Select } from "@opai/ds";

import { buscarCandidatosDocumento } from "@/app/_acciones/candidatos-documento";

import { FILA_INFO, opcionesDeCandidatos } from "./opciones-candidatos";
import type { EntidadVinculable } from "./tipos";

/** A qué se vincula el documento que se está subiendo; `id` es null mientras no se elige. */
export type Vinculo = { tipo: EntidadVinculable; id: string | null; nombre: string | null };

export type OpcionesVincular = {
  /** Id de la empresa actual (la entidad por defecto). */
  tenantId: string;
  /** Etiqueta de cada entidad, con el vocabulario de la vertical. */
  etiquetas: Record<string, string>;
  /** Entidades que la persona puede elegir (según los permisos de lectura de cada lista). */
  disponibles: EntidadVinculable[];
  /**
   * Subida acotada (`documentos.subir_alcance`): solo a instalaciones a cargo y sin visibilidad en
   * portales, así que la hoja no muestra ese campo ni lo envía (la capacidad lo fija vacío).
   */
  acotada?: boolean;
};

const MENSAJE_FALLO = "No se pudo buscar. Reintenta en unos segundos.";

/** Descripción de la hoja según el destino elegido. */
export function textoDestino(v: Vinculo, etiquetas: Record<string, string>): string {
  if (v.tipo === "tenant") return "Se guarda en los documentos de la empresa.";
  if (!v.id) return "Elige a qué se vincula antes de agregar el archivo.";
  return `Se guarda en los documentos de ${(etiquetas[v.tipo] ?? "").toLowerCase()} ${v.nombre ?? ""}.`;
}

/** Selector «Vincular a»: la entidad (empresa, cuenta, instalación, persona) y, salvo la empresa, cuál. */
export function CampoVincular({
  vinculo,
  onCambiar,
  opciones,
  bloqueado,
}: {
  vinculo: Vinculo;
  onCambiar: (v: Vinculo) => void;
  opciones: OpcionesVincular;
  /** Con archivos ya subidos o en curso el destino no cambia (cada archivo ya tiene el suyo). */
  bloqueado: boolean;
}) {
  const etiqueta = opciones.etiquetas[vinculo.tipo] ?? "";
  // Nombres de los candidatos vistos: el Combobox solo devuelve el id al elegir.
  const nombres = useRef(new Map<string, string>());
  const tipoBuscado = vinculo.tipo;
  // Estable entre renders: el Combobox vuelve a buscar cada vez que cambia esta función.
  const buscar = useCallback(
    async (q: string) => {
      if (tipoBuscado === "tenant") return [];
      const r = await buscarCandidatosDocumento({ tipo: tipoBuscado, q }).catch(() => ({
        ok: false as const,
        mensaje: MENSAJE_FALLO,
      }));
      if (r.ok) for (const c of r.items) nombres.current.set(c.id, c.etiqueta);
      return opcionesDeCandidatos(r);
    },
    [tipoBuscado],
  );
  return (
    <div className="flex flex-col gap-3">
      <Campo etiqueta="Vincular a" htmlFor="d-vincular">
        <Select
          id="d-vincular"
          valor={vinculo.tipo}
          disabled={bloqueado}
          opciones={opciones.disponibles.map((t) => ({
            valor: t,
            etiqueta: opciones.etiquetas[t] ?? t,
          }))}
          onCambiar={(t) => {
            const tipo = t as EntidadVinculable;
            if (tipo !== vinculo.tipo)
              onCambiar({ tipo, id: tipo === "tenant" ? opciones.tenantId : null, nombre: null });
          }}
        />
      </Campo>
      {vinculo.tipo === "tenant" ? null : (
        <Campo etiqueta={etiqueta} htmlFor="d-vincular-entidad">
          <Combobox
            id="d-vincular-entidad"
            key={vinculo.tipo}
            disabled={bloqueado}
            placeholder={`Buscar ${etiqueta.toLowerCase()}`}
            buscarPlaceholder="Escribe un nombre"
            textoInicial="Sin resultados"
            opciones={vinculo.id ? [{ valor: vinculo.id, etiqueta: vinculo.nombre ?? "" }] : []}
            valor={vinculo.id}
            onBuscar={buscar}
            onCambiar={([id]) => {
              if (!id || FILA_INFO.has(id)) return;
              onCambiar({ ...vinculo, id, nombre: nombres.current.get(id) ?? null });
            }}
          />
        </Campo>
      )}
    </div>
  );
}
