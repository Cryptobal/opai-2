"use client";

import { useMemo, useState } from "react";

import { Empty } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { descargarDatosMiDt, exportarPendientesMiDt } from "./lista-cumplimiento-dt-descargas";
import { ListaCumplimientoDtCuerpo } from "./lista-cumplimiento-dt-cuerpo";
import { MarcarRegistroMiDt } from "./marcar-registro-midt";

export type MovimientoMiDt = {
  clave: string;
  movimientoTipo: "alta" | "baja" | "anexo" | "finiquito";
  referenciaId: string;
  personaNombre: string;
  rut: string;
  hechoTexto: string;
  plazoEtiqueta: string;
  plazoTono: "success" | "warning" | "danger" | "neutral";
  registrado: boolean;
};

/** Contratos y anexos para Mi DT (diseño 07). */
export function ListaCumplimientoDt({
  items,
  pendientes,
  gestiona,
  tenantId,
  variante = "contratos",
}: {
  items: MovimientoMiDt[];
  pendientes: number;
  gestiona: boolean;
  tenantId: string;
  variante?: "contratos" | "finiquitos";
}) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [seg, setSeg] = useState<"pen" | "reg">("pen");
  const [marcar, setMarcar] = useState<MovimientoMiDt | null>(null);
  const filas = useMemo(() => items.filter((m) => (seg === "pen" ? !m.registrado : m.registrado)), [items, seg]);

  if (items.length === 0)
    return (
      <Empty
        titulo={variante === "finiquitos" ? "No hay finiquitos en curso" : "No hay movimientos por registrar"}
        descripcion={
          variante === "finiquitos"
            ? "Cuando registres el término de un vínculo, el finiquito a subir a Mi DT aparecerá aquí con su plazo."
            : "Cuando contrates, desvincules o firmes un anexo, aparecerá aquí con su plazo."
        }
      />
    );

  return (
    <>
      <ListaCumplimientoDtCuerpo
        items={items}
        pendientes={pendientes}
        gestiona={gestiona}
        pendienteCap={pendiente}
        seg={seg}
        setSeg={setSeg}
        filas={filas}
        variante={variante}
        onExportar={() => void exportarPendientesMiDt(ejecutar)}
        onDatos={(m) => void descargarDatosMiDt(ejecutar, m)}
        onMarcar={setMarcar}
      />
      <MarcarRegistroMiDt movimiento={marcar} tenantId={tenantId} onCerrar={() => setMarcar(null)} />
    </>
  );
}