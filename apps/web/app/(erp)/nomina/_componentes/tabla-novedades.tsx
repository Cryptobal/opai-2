"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Empty, Table, Td, Th, Tr } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaCorta } from "@/lib/formato";

import { DialogoMotivo } from "./dialogo-motivo";
import { pesos, TIPO_NOVEDAD, UNIDAD } from "./etiquetas";
import type { Novedad } from "./tipos";

const ORIGEN: Record<string, string> = {
  manual: "Manual",
  carga_masiva: "Carga masiva",
  anticipo_quincenal: "Anticipo quincenal",
  prestamo_cuota: "Plan de préstamo",
};

/** Novedades del período: se anulan con motivo; las cuotas de préstamo se gestionan desde el préstamo. */
export function TablaNovedades({ novedades, puedeAnular }: { novedades: Novedad[]; puedeAnular: boolean }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [aAnular, setAAnular] = useState<Novedad | null>(null);
  async function anular(motivo: string) {
    if (aAnular && (await ejecutar("nomina.novedades.anular", { id: aAnular.id, motivo }))) {
      avisar.exito("Novedad anulada");
      setAAnular(null);
    }
  }
  if (novedades.length === 0)
    return <Empty titulo="Sin novedades" descripcion="Registra la primera novedad del período o genera los anticipos y las cuotas." />;
  return (
    <div className="flex flex-col gap-3">
      {error && !aAnular ? <Alerta tono="danger" titulo={error} /> : null}
      <DialogoMotivo
        key={aAnular?.id ?? "ninguna"}
        abierto={aAnular !== null}
        titulo="Anular novedad"
        descripcion="Queda en el historial como anulada y no se vuelve a generar."
        confirmar="Anular"
        pendiente={pendiente}
        error={error}
        onCerrar={() => setAAnular(null)}
        onConfirmar={(m) => void anular(m)}
      />
      <Table aria-label="Novedades del período">
        <thead>
          <tr><Th>Persona</Th><Th>Tipo</Th><Th>Fechas</Th><Th>Cantidad / monto</Th><Th>Origen</Th><Th><span className="sr-only">Acciones</span></Th></tr>
        </thead>
        <tbody>
          {novedades.map((n) => (
            <Tr key={n.id}>
              <Td>{n.personaNombre}</Td>
              <Td>{TIPO_NOVEDAD[n.tipo]}</Td>
              <Td>{fechaCorta(n.fechaDesde)}{n.fechaHasta ? ` – ${fechaCorta(n.fechaHasta)}` : ""}</Td>
              <Td className="t-mono">{n.montoClp != null ? pesos(n.montoClp) : `${n.cantidad} ${UNIDAD[n.tipo]}`}</Td>
              <Td>{n.estado === "anulada" ? <Badge tono="danger">Anulada</Badge> : (ORIGEN[n.origen] ?? n.origen)}</Td>
              <Td>
                {puedeAnular && n.estado === "vigente" && n.origen !== "prestamo_cuota" ? (
                  <Button variant="ghost" disabled={pendiente} onClick={() => (limpiarError(), setAAnular(n))}>Anular</Button>
                ) : null}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
