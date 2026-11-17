"use client";

import Link from "next/link";

import { Alerta, Badge, Card, Table, Td, Th } from "@opai/ds";

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
      <span className="t-label">Carta y comprobantes</span>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex flex-col gap-2 p-4">
          <span className="t-subheading">Carta art. 162</span>
          <span className="t-body-sm text-fg-muted">Carta al trabajador enviada a firma desde Documentos.</span>
          {datos.cartaArt162 ? (
            <p className="t-body-sm">
              {datos.cartaArt162.titulo} · estado {datos.cartaArt162.estadoFirma.replaceAll("_", " ")}
              <br />
              <Link
                href={`/documentos/firmas/${datos.cartaArt162.solicitudId}`}
                className="text-accent hover:underline"
              >
                Ver solicitud de firma
              </Link>
            </p>
          ) : (
            <p className="t-body-sm text-fg-muted">Sin carta de término vinculada a esta persona.</p>
          )}
        </Card>
        <Card className="flex flex-col gap-2 p-4">
          <span className="t-subheading">Comprobante Mi DT</span>
          <span className="t-body-sm text-fg-muted">Archivo que subes al marcar el finiquito registrado.</span>
          {datos.comprobanteMiDt ? (
            <p className="t-body-sm">
              {datos.comprobanteMiDt.nombre} · registrado {datos.comprobanteMiDt.registradoEn}
              <br />
              <Link href={`/personas/${datos.personaId}/documentos`} className="text-accent hover:underline">
                Ver documentos de la persona
              </Link>
            </p>
          ) : (
            <p className="t-body-sm text-fg-muted">
              {datos.registradoMiDt
                ? "Registrado en Mi DT sin comprobante guardado."
                : "Sube el comprobante al marcar registrado en la lista de finiquitos."}
            </p>
          )}
        </Card>
      </div>
      <span className="t-label">Cálculo del finiquito</span>
      <TablaPropuesta lineas={p.lineas} total={p.total} />
    </div>
  );
}