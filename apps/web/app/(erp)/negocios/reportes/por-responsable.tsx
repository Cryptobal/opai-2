import { Avatar, Chip, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { pesos } from "@/lib/fechas";

import { rutaReportes, type Periodo, type Tablero } from "./datos";

/** Tabla por responsable. El nombre filtra el tablero; en teléfono la tabla se desplaza hacia el lado. */
export function PorResponsable(p: { t: Tablero; periodo: Periodo; responsableId: string | null }) {
  const filtrado = p.responsableId ? p.t.responsables.find((r) => r.responsableId === p.responsableId) : null;
  return (
    <SeccionTarjeta
      titulo="Por responsable"
      className="lg:col-span-2"
      sinRelleno
      accion={
        p.responsableId ? (
          <>
            <Chip etiqueta="Responsable" valor={filtrado?.nombre ?? "Sin negocios"} />
            <EnlaceBoton href={rutaReportes(p.periodo)} variante="ghost">Ver todo el equipo</EnlaceBoton>
          </>
        ) : null
      }
    >
      {p.t.responsables.length === 0 ? (
        <p className="t-body-sm p-4 text-fg-muted">Sin negocios abiertos ni cierres en este período.</p>
      ) : (
        <Table className="border-0" aria-label="Reporte por responsable">
          <thead>
            <tr>
              <Th>Responsable</Th>
              <Th className="text-right">Abiertos</Th>
              <Th className="text-right">En curso</Th>
              <Th className="text-right">Ponderado</Th>
              <Th className="text-right">Ganados</Th>
              <Th className="text-right">Perdidos</Th>
              <Th className="text-right">Conversión</Th>
            </tr>
          </thead>
          <tbody>
            {p.t.responsables.map((r) => (
              <Tr key={r.responsableId ?? "sin"}>
                <Td>
                  <span className="flex items-center gap-2">
                    <Avatar nombre={r.nombre} size="sm" />
                    {r.responsableId && !p.responsableId ? (
                      <LinkNext href={rutaReportes(p.periodo, r.responsableId)} className="flex min-h-11 items-center font-medium hover:underline">
                        {r.nombre}
                      </LinkNext>
                    ) : (
                      <span className="font-medium">{r.nombre}</span>
                    )}
                  </span>
                </Td>
                <Td className="t-numeric text-right">{r.abiertos}</Td>
                <Td className="t-numeric text-right">{pesos(r.enCursoMensualClp)}</Td>
                <Td className="t-numeric text-right">{pesos(r.ponderadoClp)}</Td>
                <Td className="t-numeric text-right">{r.ganados}</Td>
                <Td className="t-numeric text-right">{r.perdidos}</Td>
                <Td className="t-numeric text-right">{r.conversionPct === null ? "—" : `${r.conversionPct} %`}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </SeccionTarjeta>
  );
}
