"use client";

import { useMemo, useState } from "react";

import { Alerta, avisar, Badge, Button, Empty, Segmentado, Table, Td, Th } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { descargarTexto } from "./descargar-texto";
import { MarcarRegistroMiDt } from "./marcar-registro-midt";

export type MovimientoMiDt = {
  clave: string;
  movimientoTipo: "alta" | "baja" | "anexo";
  referenciaId: string;
  personaNombre: string;
  rut: string;
  hechoTexto: string;
  plazoEtiqueta: string;
  plazoTono: "success" | "warning" | "danger" | "neutral";
  registrado: boolean;
};

const ETIQUETA_MOV = { alta: "Alta", baja: "Baja", anexo: "Anexo" } as const;

/** Contratos y anexos para Mi DT (diseño 07). */
export function ListaCumplimientoDt({
  items,
  pendientes,
  gestiona,
  tenantId,
}: {
  items: MovimientoMiDt[];
  pendientes: number;
  gestiona: boolean;
  tenantId: string;
}) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [seg, setSeg] = useState<"pen" | "reg">("pen");
  const [marcar, setMarcar] = useState<MovimientoMiDt | null>(null);
  const filas = useMemo(() => items.filter((m) => (seg === "pen" ? !m.registrado : m.registrado)), [items, seg]);

  async function exportarPendientes() {
    const r = await ejecutar<{ nombre: string; contenido: string }>("nomina.midt.exportar_pendientes", {});
    if (r) {
      descargarTexto(r.nombre, r.contenido);
      avisar.exito("Archivo de pendientes descargado");
    }
  }

  async function datos(m: MovimientoMiDt) {
    const r = await ejecutar<{ nombre: string; contenido: string }>("nomina.midt.datos", {
      movimientoTipo: m.movimientoTipo,
      referenciaId: m.referenciaId,
    });
    if (r) descargarTexto(r.nombre, r.contenido);
  }

  if (items.length === 0)
    return (
      <Empty
        titulo="No hay movimientos por registrar"
        descripcion="Cuando contrates, desvincules o firmes un anexo, aparecerá aquí con su plazo."
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <Alerta tono="info" titulo="Plazo de 15 días desde el hecho · Ley 21.327">
        El registro en Mi DT lo hace el representante laboral electrónico. OPAI prepara los datos, sigue el plazo y guarda el comprobante que subas.
      </Alerta>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado
          etiqueta="Estado del registro"
          activa={seg}
          opciones={[
            { id: "pen", etiqueta: `Por registrar · ${pendientes}`, onClick: () => setSeg("pen") },
            { id: "reg", etiqueta: "Registrados", onClick: () => setSeg("reg") },
          ]}
        />
        {gestiona && seg === "pen" ? (
          <Button variant="secondary" disabled={pendiente || pendientes === 0} onClick={() => void exportarPendientes()}>
            Descargar pendientes
          </Button>
        ) : null}
      </div>
      {filas.length === 0 ? (
        <Empty titulo={seg === "pen" ? "Sin pendientes" : "Sin registrados"} descripcion="Cambia de segmento para ver el otro estado." />
      ) : (
        <Table aria-label="Movimientos Mi DT">
          <thead>
            <tr>
              <Th>Movimiento</Th>
              <Th>Persona</Th>
              <Th>Hecho</Th>
              <Th>{seg === "pen" ? "Plazo Mi DT" : "Registro"}</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {filas.map((m) => (
              <tr key={m.clave}>
                <Td className="font-medium">{ETIQUETA_MOV[m.movimientoTipo]}</Td>
                <Td>
                  <span className="block">{m.personaNombre}</span>
                  <span className="t-mono t-caption text-fg-muted">{m.rut}</span>
                </Td>
                <Td className="text-fg-muted">{m.hechoTexto}</Td>
                <Td>
                  <Badge tono={m.plazoTono === "neutral" ? "neutro" : m.plazoTono} punto>
                    {m.plazoEtiqueta}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" disabled={pendiente} onClick={() => void datos(m)}>
                      Datos
                    </Button>
                    {gestiona && !m.registrado ? (
                      <Button variant="secondary" disabled={pendiente} onClick={() => setMarcar(m)}>
                        Marcar registrado
                      </Button>
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <MarcarRegistroMiDt movimiento={marcar} tenantId={tenantId} onCerrar={() => setMarcar(null)} />
    </div>
  );
}