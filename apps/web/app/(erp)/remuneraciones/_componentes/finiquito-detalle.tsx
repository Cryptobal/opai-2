"use client";

import { Alerta, Badge, Table, Td, Th } from "@opai/ds";

import { FiniquitoCartaComprobantes } from "./finiquito-carta-comprobantes";
import { pesos } from "./etiquetas";

export type DatosFiniquito = {
  personaId: string;
  personaNombre: string;
  rut: string;
  cargo: string;
  instalacion: string | null;
  hechoTexto: string;
  registradoMiDt: boolean;
  comprobanteMiDt: { documentoId: string; nombre: string; registradoEn: string } | null;
  cartaArt162: { documentoId: string; titulo: string; estadoFirma: string; solicitudId: string } | null;
  propuesta: {
    vinculoId: string;
    terminoEn: string;
    sueldoReferencia: number;
    aniosServicio: number;
    plazoPagoHasta: string;
    diasHabilesRestantesPago: number | null;
    lineas: { id: string; concepto: string; origen: string; monto: number }[];
    total: number;
    avisos: string[];
  };
};

function TablaPropuesta({ lineas, total }: { lineas: DatosFiniquito["propuesta"]["lineas"]; total: number }) {
  return (
    <Table aria-label="Líneas del finiquito">
      <thead>
        <tr>
          <Th>Concepto</Th>
          <Th>Origen</Th>
          <Th className="text-right">Monto</Th>
        </tr>
      </thead>
      <tbody>
        {lineas.map((l) => (
          <tr key={l.id}>
            <Td className="font-medium">{l.concepto}</Td>
            <Td className="text-fg-muted">{l.origen}</Td>
            <Td className="t-numeric text-right">{pesos(l.monto)}</Td>
          </tr>
        ))}
        {lineas.length === 0 ? (
          <tr>
            <Td colSpan={3} className="text-fg-muted">
              No hay líneas calculables sin sueldo de referencia.
            </Td>
          </tr>
        ) : null}
      </tbody>
      <tfoot>
        <tr>
          <Td colSpan={2} className="font-medium">
            Total orientativo
          </Td>
          <Td className="t-numeric text-right font-semibold">{pesos(total)}</Td>
        </tr>
      </tfoot>
    </Table>
  );
}

/** Detalle de finiquito (diseño 08). */
export function FiniquitoDetalle({ datos }: { datos: DatosFiniquito }) {
  const p = datos.propuesta;
  const plazoAlerta =
    p.diasHabilesRestantesPago != null && p.diasHabilesRestantesPago <= 2
      ? `Plazo de pago: quedan ${p.diasHabilesRestantesPago} día${p.diasHabilesRestantesPago === 1 ? "" : "s"} hábiles (hasta ${p.plazoPagoHasta})`
      : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="t-body-sm text-fg-muted">
        {datos.rut} · {datos.cargo}
        {datos.instalacion ? ` · ${datos.instalacion}` : ""} · {datos.hechoTexto}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tono={datos.registradoMiDt ? "success" : "warning"} punto>
          {datos.registradoMiDt ? "Registrado en Mi DT" : "Pendiente en Mi DT"}
        </Badge>
        <span className="t-caption text-fg-muted">{p.aniosServicio} año{p.aniosServicio === 1 ? "" : "s"} de servicio</span>
      </div>
      {plazoAlerta ? (
        <Alerta tono="warning" titulo={plazoAlerta}>
          El finiquito debe pagarse a más tardar en la fecha indicada. La firma se hace en Mi DT; OPAI no firma ni envía al portal.
        </Alerta>
      ) : null}
      {p.avisos.map((a) => (
        <Alerta key={a} tono="info" titulo="Aviso">
          {a}
        </Alerta>
      ))}
      <FiniquitoCartaComprobantes datos={datos} />
      <span className="t-label">Cálculo del finiquito</span>
      <TablaPropuesta lineas={p.lineas} total={p.total} />
    </div>
  );
}