import Link from "next/link";

import { Badge, Table, Td, Th, Tr } from "@opai/ds";

import { claveMes, MOTIVO, pct } from "./etiquetas";
import type { FilaInstalacion, ResumenTodas } from "./tipos";

const tonoCobertura = (x: number | null) =>
  x === null ? "neutro" : x >= 98 ? "success" : x >= 90 ? "warning" : "danger";

function Motivos({ r }: { r: FilaInstalacion["resumen"] }) {
  const partes = Object.entries(r.ppcPorMotivo).map(([m, n]) => `${n} ${MOTIVO[m as keyof typeof MOTIVO] ?? m}`);
  return <span className="text-xs text-fg-muted">{partes.join(" · ")}</span>;
}

/** P05: cobertura y PPC del mes por instalación. Tabla en 1024/1280, lista en 375. */
export function TodasInstalaciones({ datos }: { datos: ResumenTodas }) {
  const href = (f: FilaInstalacion) => `?inst=${f.instalacionId}&mes=${claveMes(datos.anio, datos.mes)}`;
  return (
    <>
      <div className="hidden md:block">
        <Table aria-label="Cobertura por instalación">
          <thead>
            <tr>
              <Th>Instalación</Th>
              <Th>Cuenta</Th>
              <Th className="text-right">Puestos</Th>
              <Th className="text-right">Cobertura</Th>
              <Th className="text-right">Turnos sin cubrir</Th>
              <Th>Motivos</Th>
            </tr>
          </thead>
          <tbody>
            {datos.instalaciones.map((f) => (
              <Tr key={f.instalacionId}>
                <Td className="font-medium">
                  <Link href={href(f)} className="rounded-sm outline-none hover:underline focus-visible:outline-2 focus-visible:outline-focus">
                    {f.instalacion}
                  </Link>
                </Td>
                <Td className="text-fg-muted">{f.cuenta}</Td>
                <Td className="t-numeric text-right">{f.puestos}</Td>
                <Td className="t-numeric text-right">
                  <Badge tono={tonoCobertura(f.resumen.cobertura)}>{pct(f.resumen.cobertura)}</Badge>
                </Td>
                <Td className="t-numeric text-right">{f.resumen.ppc}</Td>
                <Td><Motivos r={f.resumen} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {datos.instalaciones.map((f) => (
          <li key={f.instalacionId}>
            <Link href={href(f)} className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 outline-none focus-visible:outline-2 focus-visible:outline-focus">
              <span className="min-w-0">
                <span className="block truncate text-base font-medium">{f.instalacion}</span>
                <span className="block text-xs text-fg-muted">
                  {f.puestos} puestos · {f.resumen.ppc} turnos sin cubrir
                </span>
              </span>
              <Badge tono={tonoCobertura(f.resumen.cobertura)}>{pct(f.resumen.cobertura)}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
