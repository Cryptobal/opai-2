"use client";

import { useState } from "react";

import { Button, Table, Td, Th, Tr } from "@opai/ds";

import { DialogoMutual } from "./dialogo-mutual";
import { PanelDetalleIndicador } from "./panel-detalle-indicador";
import { AvisoCapturaSii, TarjetaMutual } from "./tarjetas-remuneraciones";

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
      <AvisoCapturaSii fecha={data.fecha} captura={data.capturaSii} />
      <TarjetaMutual mutual={mutual} puede={puede} onEditar={() => setMutualAbierto(true)} />

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
      <p className="t-caption text-fg-muted">
        Se actualizan solos: UF y UTM cada día desde el SII; ingreso mínimo, topes, AFP, SIS y
        cesantía cada mes desde Previred. El impuesto único, la reforma, la mutual básica y la
        jornada cambian por ley y los publica OPAI.
      </p>

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
