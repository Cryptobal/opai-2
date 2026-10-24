"use client";

import { CeldaVigencia, Checkbox, cn, Table, Td, Th, Tr } from "@opai/ds";

import { corto, type FilaMatriz, type Matriz, pendientes } from "./tipos-matriz";

type Props = {
  tipos: Matriz["tipos"];
  filas: FilaMatriz[];
  seleccion: Set<string>;
  onMarcar: (ids: string[], marcado: boolean) => void;
};

export const chip = (estado: string) =>
  cn(
    "inline-flex h-6 items-center rounded-sm px-1.5 text-xs font-medium",
    estado === "vencido" && "border border-danger-fg bg-danger-muted text-danger-fg",
    estado === "por_vencer" && "bg-warning-muted text-warning-fg",
    estado === "falta" && "border border-dashed border-border-strong text-fg-muted",
  );

/** Semáforo (58/59): tabla persona × tipo en md+; en teléfono, filas con los pendientes como chips. */
export function TablaMatriz({ tipos, filas, seleccion, onMarcar }: Props) {
  const todas = filas.length > 0 && filas.every((f) => seleccion.has(f.personaId));
  const nombre = (id: string) => tipos.find((t) => t.id === id)?.nombre ?? "Documento";
  return (
    <>
      <ul className="-mx-4 border-y border-border bg-surface md:hidden">
        {filas.map((f) => (
          <li
            key={f.personaId}
            className={cn(
              "flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0",
              seleccion.has(f.personaId) && "bg-accent-muted",
            )}
          >
            <Checkbox
              soloControl
              etiqueta={`Seleccionar a ${f.nombre}`}
              marcado={seleccion.has(f.personaId)}
              onCambiar={(m) => onMarcar([f.personaId], m)}
            />
            <span className="flex min-w-0 flex-col gap-1.5">
              <span className="text-base font-medium text-fg">{f.nombre}</span>
              <span className="flex flex-wrap gap-1">
                {pendientes(f).map((c) => (
                  <span key={c.tipoId} className={chip(c.estado)}>
                    {corto(nombre(c.tipoId))}
                    {c.estado === "por_vencer" && c.dias !== null ? ` · ${c.dias} d` : ""}
                  </span>
                ))}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th className="w-12">
                <Checkbox
                  soloControl
                  etiqueta="Seleccionar todas"
                  marcado={todas}
                  onCambiar={(m) =>
                    onMarcar(
                      filas.map((f) => f.personaId),
                      m,
                    )
                  }
                />
              </Th>
              <Th>Persona</Th>
              <Th>Cargo</Th>
              {tipos.map((t) => (
                <Th key={t.id} className="text-center">
                  {corto(t.nombre)}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <Tr key={f.personaId} className={cn(seleccion.has(f.personaId) && "bg-accent-muted")}>
                <Td>
                  <Checkbox
                    soloControl
                    etiqueta={`Seleccionar a ${f.nombre}`}
                    marcado={seleccion.has(f.personaId)}
                    onCambiar={(m) => onMarcar([f.personaId], m)}
                  />
                </Td>
                <Td className="font-medium">{f.nombre}</Td>
                <Td className="text-fg-muted">{f.cargo ?? "—"}</Td>
                {tipos.map((t) => {
                  const c = f.celdas.find((x) => x.tipoId === t.id);
                  return (
                    <Td key={t.id} className="text-center">
                      {c ? (
                        <CeldaVigencia estado={c.estado} dias={c.dias} />
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </Td>
                  );
                })}
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
