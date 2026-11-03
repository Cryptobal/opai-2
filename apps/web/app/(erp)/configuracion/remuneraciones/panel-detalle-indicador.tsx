"use client";

import { useEffect, useState } from "react";

import { Alerta, Button, Sheet, Table, Td, Th, Tr } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { DatosRemuneraciones } from "./tabla-remuneraciones";

type Fila = DatosRemuneraciones["filas"][number];

type Historial = {
  tipo: "publicado" | "captura" | "tenant";
  fecha: string;
  resumen: string;
  fuente: string;
  estado: string;
};

const etiquetaTipo: Record<Historial["tipo"], string> = {
  publicado: "Plataforma",
  captura: "Captura SII",
  tenant: "Empresa",
};

function TablaHistorial({ clave }: { clave: string }) {
  const { ejecutar, error, pendiente } = useCapacidad("erp");
  const [historial, setHistorial] = useState<Historial[] | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const r = await ejecutar<Historial[]>("core.remuneraciones.historial", { clave });
      if (vivo) setHistorial(r ?? []);
    })();
    return () => {
      vivo = false;
    };
  }, [clave, ejecutar]);

  if (error) return <Alerta tono="danger" titulo={error} />;
  if (historial == null || pendiente) {
    return <p className="t-body-sm text-muted-foreground">Cargando historial…</p>;
  }
  if (historial.length === 0) {
    return <p className="t-body-sm text-muted-foreground">Sin registros anteriores.</p>;
  }
  return (
    <Table>
      <thead>
        <Tr>
          <Th>Fecha</Th>
          <Th>Tipo</Th>
          <Th>Resumen</Th>
        </Tr>
      </thead>
      <tbody>
        {historial.map((h, i) => (
          <Tr key={`${h.tipo}-${h.fecha}-${i}`}>
            <Td>{h.fecha}</Td>
            <Td>{etiquetaTipo[h.tipo]}</Td>
            <Td className="max-w-[14rem] break-words">{h.resumen}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

type Props = {
  fila: Fila | null;
  onCerrar: () => void;
};

export function PanelDetalleIndicador({ fila, onCerrar }: Props) {
  return (
    <Sheet
      abierto={fila != null}
      onCerrar={onCerrar}
      titulo={fila?.nombre ?? "Indicador"}
      acciones={
        <Button variant="secondary" onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      {fila ? (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h3 className="t-label-sm text-muted-foreground">Desglose vigente</h3>
            <ul className="t-body list-inside list-disc space-y-1">
              {fila.desglose.map((linea) => (
                <li key={linea}>{linea}</li>
              ))}
            </ul>
            <p className="t-caption text-muted-foreground">
              Vigente desde {fila.vigenteDesde} · Fuente: {fila.fuente}
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="t-label-sm text-muted-foreground">Historial</h3>
            <TablaHistorial key={fila.clave} clave={fila.clave} />
          </section>
        </div>
      ) : null}
    </Sheet>
  );
}
