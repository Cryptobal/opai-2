"use client";

import { Lock } from "lucide-react";

import { Badge, Checkbox, cn, Table, Td, Th, Tooltip, Tr } from "@opai/ds";

import {
  MODULOS_BLOQUEADOS,
  type ModuloCatalogo,
  nombreModulo,
  nombrePermiso,
  nombreRecurso,
} from "./etiquetas";

type Props = {
  m: ModuloCatalogo;
  valor: ReadonlySet<string>;
  /** Permisos que el usuario actual puede conceder; null = solo lectura. */
  concedibles: ReadonlySet<string> | null;
  onAlternar: (id: string, on: boolean) => void;
};

const NO_CONCEDE = "No puedes conceder un permiso que tú no tienes";

/** Un módulo de la matriz (A2): recursos × Ver/Gestionar y, debajo, sus permisos especiales. */
export function MatrizModulo({ m, valor, concedibles, onAlternar }: Props) {
  const bloqueado = MODULOS_BLOQUEADOS.has(m.modulo);
  const casilla = (id: string, conEtiqueta: boolean) => {
    const ajeno = concedibles !== null && !concedibles.has(id);
    const control = (
      <Checkbox
        soloControl={!conEtiqueta}
        etiqueta={nombrePermiso(id)}
        marcado={valor.has(id)}
        disabled={concedibles === null || ajeno}
        onCambiar={(on) => onAlternar(id, on)}
      />
    );
    if (!ajeno) return control;
    return (
      <Tooltip texto={NO_CONCEDE}>
        <span className="inline-flex">{control}</span>
      </Tooltip>
    );
  };
  return (
    <section
      aria-label={nombreModulo(m.modulo)}
      className={cn("border-t border-border py-2", !m.activo && "opacity-60")}
    >
      <header className="flex flex-wrap items-center gap-2 px-4 py-2">
        <h3 className="t-label text-fg">{nombreModulo(m.modulo)}</h3>
        {bloqueado ? <Lock className="size-4 text-fg-muted" aria-hidden /> : null}
        {!m.activo ? <Badge tono="neutro">Módulo no activo</Badge> : null}
      </header>
      {!m.activo ? (
        <p className="t-caption px-4">Módulo no activo: sus permisos no aplican.</p>
      ) : null}
      {bloqueado ? (
        <p className="t-caption px-4">
          Bloqueado por defecto. Solo owner o admin pueden concederlo.
        </p>
      ) : null}
      {m.recursos.length ? (
        <Table className="text-sm">
          <thead>
            <tr>
              <Th>Permiso</Th>
              <Th className="w-20 text-center">Ver</Th>
              <Th className="w-24 text-center">Gestionar</Th>
            </tr>
          </thead>
          <tbody>
            {[...m.recursos]
              .sort((a, b) =>
                nombreRecurso(a.recurso).localeCompare(nombreRecurso(b.recurso), "es"),
              )
              .map((r) => (
                <Tr key={r.recurso}>
                  <Td className="whitespace-normal">{nombreRecurso(r.recurso)}</Td>
                  {[r.ver, r.gestionar].map((id, i) => (
                    <Td key={i} className="text-center">
                      {id ? (
                        <span className="inline-flex justify-center">{casilla(id, false)}</span>
                      ) : (
                        <span className="text-fg-subtle" aria-label="No aplica">
                          —
                        </span>
                      )}
                    </Td>
                  ))}
                </Tr>
              ))}
          </tbody>
        </Table>
      ) : null}
      {m.especiales.length ? (
        <div className="flex flex-col px-4 pt-1">
          {m.especiales.map((e) => (
            <div key={e.id}>{casilla(e.id, true)}</div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
