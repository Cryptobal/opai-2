"use client";

import { useRouter } from "next/navigation";

import { Button, Card, Table, Td, Th, Tr } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = {
  data: {
    fecha: string;
    filas: {
      clave: string;
      nombre: string;
      valorResumen: string;
      vigenteDesde: string;
      fuente: string;
      verificacion: string;
      estado: string;
      pendienteConfirmar: boolean;
    }[];
    mutualAdicional: { escalada: number | null; estado: string; resumen: string };
  };
  puede: boolean;
};

export function TablaRemuneraciones({ data, puede }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente } = useCapacidad("erp");
  const confirmarMutual = async () => {
    const raw = window.prompt("Tasa adicional mutual (% con coma, ej. 0,27):");
    if (!raw) return;
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return;
    const tasaEscalada = Math.round(n * 10_000);
        const r = await ejecutar("core.remuneraciones.confirmar_mutual", { tasaEscalada });
    if (r.ok) router.refresh();
  };
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="t-label-sm text-muted-foreground">Mutual adicional del tenant</p>
          <p className="t-body">{data.mutualAdicional.resumen}</p>
        </div>
        {puede ? (
          <Button disabled={pendiente} onClick={() => void confirmarMutual()}>
            Confirmar mutual
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
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
