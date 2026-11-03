"use client";

import { useState } from "react";

import { Alerta, Button, Card, Table, Td, Th, Tr } from "@opai/ds";

import { fecha } from "@/lib/fechas";

import { DialogoMutual } from "./dialogo-mutual";
import { PanelDetalleIndicador } from "./panel-detalle-indicador";

type Props = {
  data: DatosRemuneraciones;
  puede: boolean;
  /** Abre la confirmación de la mutual al llegar (enlace «Confirmar mutual» de CPQ). */
  abrirMutual?: boolean;
  onActualizado: () => void;
};

export type DatosRemuneraciones = {
  fecha: string;
  filas: {
    clave: string;
    nombre: string;
    valorResumen: string;
    desglose: string[];
    vigenteDesde: string;
    fuente: string;
    verificacion: string;
    estado: string;
    pendienteConfirmar: boolean;
    detalleDisponible: boolean;
  }[];
  mutualAdicional: {
    escalada: number | null;
    estado: string;
    resumen: string;
    confirmadoPor: string | null;
    confirmadoEn: string | null;
  };
  capturaSii: {
    ultimaCaptura: string | null;
    ufVigenteDesde: string | null;
    ufDesactualizada: boolean;
  };
};

export function TablaRemuneraciones({ data, puede, abrirMutual = false, onActualizado }: Props) {
  const [mutualAbierto, setMutualAbierto] = useState(abrirMutual);
  const [detalle, setDetalle] = useState<DatosRemuneraciones["filas"][number] | null>(null);
  const mutual = data.mutualAdicional;

  return (
    <div className="flex flex-col gap-4">
      {data.capturaSii.ufDesactualizada ? (
        <Alerta tono="warning" titulo="UF desactualizada">
          {data.capturaSii.ufVigenteDesde
            ? `La UF vigente es del ${data.capturaSii.ufVigenteDesde}; hoy es ${fecha(data.fecha)}.`
            : "No hay UF publicada para la fecha de hoy."}
          {data.capturaSii.ultimaCaptura
            ? ` Última captura SII: ${data.capturaSii.ultimaCaptura}.`
            : " Aún no hay capturas automáticas registradas."}
        </Alerta>
      ) : data.capturaSii.ultimaCaptura ? (
        <p className="t-caption text-fg-muted">
          Última captura SII (UF): {data.capturaSii.ultimaCaptura}
          {data.capturaSii.ufVigenteDesde ? ` · UF vigente desde ${data.capturaSii.ufVigenteDesde}` : null}
        </p>
      ) : null}

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <p className="t-label-sm text-fg-muted">Cotización adicional de la mutual</p>
          <p className="t-body">
            {mutual.estado === "vigente" ? mutual.resumen : "Pendiente de confirmar."}
          </p>
          {mutual.estado === "vigente" && mutual.confirmadoPor ? (
            <p className="t-caption text-fg-muted">
              Confirmada por {mutual.confirmadoPor}
              {mutual.confirmadoEn ? ` el ${mutual.confirmadoEn}` : null}
            </p>
          ) : null}
        </div>
        {puede ? (
          <Button className="self-start" onClick={() => setMutualAbierto(true)}>
            {mutual.estado === "vigente" ? "Editar tasa" : "Confirmar tasa"}
          </Button>
        ) : null}
      </Card>

      <Table>
        <thead>
          <Tr>
            <Th>Indicador</Th>
            <Th>Valor</Th>
            <Th>Vigencia</Th>
            <Th>Fuente</Th>
            <Th className="w-0" />
          </Tr>
        </thead>
        <tbody>
          {data.filas.map((f) => (
            <Tr key={f.clave}>
              <Td>{f.nombre}</Td>
              <Td>{f.valorResumen}</Td>
              <Td>{f.vigenteDesde}</Td>
              <Td className="max-w-[12rem] truncate" title={f.fuente}>
                {f.fuente}
              </Td>
              <Td>
                {f.detalleDisponible ? (
                  <Button variant="ghost" onClick={() => setDetalle(f)}>
                    Ver detalle
                  </Button>
                ) : null}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      <DialogoMutual
        abierto={mutualAbierto}
        onCerrar={() => setMutualAbierto(false)}
        tasaActual={mutual.escalada}
        onGuardada={onActualizado}
      />
      <PanelDetalleIndicador fila={detalle} onCerrar={() => setDetalle(null)} />
    </div>
  );
}
