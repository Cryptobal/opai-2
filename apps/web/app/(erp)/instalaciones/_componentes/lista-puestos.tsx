import { Badge, cn, FilaSeleccionable, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { BadgePuesto } from "@/app/_components/maestros/badge-puesto";
import { COBERTURA_PUESTO, ESTADO_PUESTO, estadoDe } from "@/app/_components/maestros/estados";
import type { Puesto } from "@/lib/tipos-maestros";

/**
 * Trozos de una línea que bajan de renglón en vez de cortarse (CAR-8: a 375 px el horario y el
 * patrón se truncaban). Cada trozo es corto y se mantiene entero.
 */
function Trozos({ partes, className }: { partes: (string | null)[]; className: string }) {
  return (
    <span className={`flex flex-wrap gap-x-1 whitespace-normal ${className}`} data-linea-puesto>
      {partes.filter(Boolean).map((t, i, arr) => (
        <span key={i} className="whitespace-nowrap">
          {t}
          {i < arr.length - 1 ? " ·" : ""}
        </span>
      ))}
    </span>
  );
}

const secundario = (p: Puesto) => (
  <Trozos partes={[p.patron ?? "Sin patrón", p.funcion ?? "Sin función"]} className="text-fg-muted" />
);

const terciario = (p: Puesto) => (
  <Trozos
    partes={[p.horario, p.horarioNoche, p.horasSemanales != null ? `${p.horasSemanales} h/sem` : null]}
    className="t-caption"
  />
);

/** Horario de un tramo con el badge «+1 día» cuando cruza medianoche (el dominio lo marca con «(+1)»). */
function Horario({ valor }: { valor: string }) {
  const cruza = valor.endsWith(" (+1)");
  const base = cruza ? valor.slice(0, -5) : valor;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="t-numeric">{base}</span>
      {cruza ? <Badge tono="neutro">+1 día</Badge> : null}
    </span>
  );
}

/** Lista de puestos en teléfono: una fila por posición (CAR-8), con buscador y chips arriba. */
export function FilasPuesto({ puestos }: { puestos: readonly Puesto[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface [&>*:last-child]:border-b-0 md:hidden">
      {puestos.map((p) => (
        <FilaSeleccionable
          key={p.id}
          href={`?puesto=${p.id}`}
          Link={LinkNext}
          titulo={p.nombre}
          secundario={secundario(p)}
          terciario={terciario(p)}
          fin={<BadgePuesto estado={p.estado} cobertura={p.cobertura} />}
        />
      ))}
    </div>
  );
}

/** Tabla de puestos desde tablet (Brief 11, diseño t436u): función, horario, patrón, cobertura y estado. */
export function TablaPuestos({ puestos }: { puestos: readonly Puesto[] }) {
  return (
    <div className="hidden md:block">
      <Table>
        <thead>
          <tr>
            <Th>Puesto</Th>
            <Th>Función</Th>
            <Th>Horario</Th>
            <Th>Patrón</Th>
            <Th>Cobertura</Th>
            <Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {puestos.map((p) => {
            const inactivo = p.estado !== "activo";
            const e = estadoDe(ESTADO_PUESTO, p.estado);
            const c = estadoDe(COBERTURA_PUESTO, p.cobertura);
            return (
              <Tr key={p.id} className={cn(inactivo && "text-fg-muted")}>
                <Td className="font-medium">
                  <LinkNext
                    href={`?puesto=${p.id}`}
                    className={cn(
                      "rounded-sm outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                      inactivo ? "text-fg-muted" : "text-fg",
                    )}
                  >
                    {p.nombre}
                  </LinkNext>
                </Td>
                <Td>{p.funcion ?? "—"}</Td>
                <Td className="h-auto whitespace-normal py-2.5">
                  <span className="flex flex-col gap-0.5">
                    <Horario valor={p.horario} />
                    {p.horarioNoche ? <Horario valor={p.horarioNoche} /> : null}
                  </span>
                </Td>
                <Td className="t-numeric">{p.patron ?? "—"}</Td>
                <Td>{inactivo ? "—" : <Badge tono={c.tono}>{c.etiqueta}</Badge>}</Td>
                <Td>
                  <Badge tono={e.tono}>{e.etiqueta}</Badge>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
