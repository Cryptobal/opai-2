"use client";

import { useState } from "react";

import { avisar, Badge, Button, Dialog, Table, Td, Th, Tr } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Lote } from "./tipos";

type Reversion = { revertido: boolean; aBorrar: number; aRestaurar: number; bloqueadas: { registro: string; motivo: string }[] };

const ESTADO: Record<Lote["estado"], { texto: string; tono: "success" | "neutro" | "warning" | "danger" }> = {
  completada: { texto: "Importado", tono: "success" },
  revertida: { texto: "Revertido", tono: "neutro" },
  en_curso: { texto: "En curso", tono: "warning" },
  fallida: { texto: "Falló", tono: "danger" },
};
const fecha = (iso: string) => new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" });

/** Cargas anteriores, con la opción de revertir un lote completo (primero muestra qué pasaría). */
export function LotesImportacion({ lotes, nombres }: { lotes: Lote[]; nombres: Record<string, string> }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [lote, setLote] = useState<Lote | null>(null);
  const [vista, setVista] = useState<Reversion | null>(null);
  async function abrir(l: Lote) {
    setLote(l);
    setVista(await ejecutar<Reversion>("core.importar.revertir", { importacionId: l.id }, true));
  }
  function cerrar() {
    setLote(null);
    setVista(null);
    limpiarError();
  }
  async function revertir() {
    if (!lote) return;
    const r = await ejecutar<Reversion>("core.importar.revertir", { importacionId: lote.id });
    if (r?.revertido) {
      avisar.exito("Lote revertido");
      cerrar();
    } else if (r) setVista(r);
  }
  const puede = vista !== null && vista.bloqueadas.length === 0;
  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Carga</Th>
            <Th>Resultado</Th>
            <Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((l) => (
            <Tr key={l.id}>
              {/* Tres columnas para que la tabla quepa en iPad sin cortarse a la derecha. */}
              <Td className="whitespace-normal">
                <span className="font-medium">{nombres[l.importador] ?? l.importador}</span>
                <span className="t-caption block">
                  {[fecha(l.iniciadaEn), l.archivo ?? (l.origen === "opai1_json" ? "Export de OPAI 1" : "Filas enviadas por un agente"), l.lanzadaPor].filter(Boolean).join(" · ")}
                </span>
              </Td>
              <Td className="whitespace-normal tabular-nums">
                {l.conteos.crear} creados · {l.conteos.actualizar} completados · {l.conteos.error} con error
              </Td>
              <Td>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tono={ESTADO[l.estado].tono}>{ESTADO[l.estado].texto}</Badge>
                  {l.estado === "completada" ? (
                    <Button variant="ghost" disabled={pendiente} onClick={() => void abrir(l)}>
                      Revertir
                    </Button>
                  ) : null}
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Dialog
        abierto={lote !== null}
        onCerrar={cerrar}
        titulo="Revertir esta carga"
        descripcion="Borra los registros que creó este lote y devuelve a su valor anterior los que completó."
        acciones={
          <>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={pendiente || !puede} onClick={() => void revertir()}>
              Revertir lote
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {vista ? (
            <p className="t-body-sm">
              Se borrarían {vista.aBorrar} registros y se restaurarían {vista.aRestaurar}.
            </p>
          ) : null}
          {vista && vista.bloqueadas.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-danger-fg">No se puede revertir: estos registros ya cambiaron o tienen datos asociados.</p>
              <ul className="t-body-sm list-disc pl-5">
                {vista.bloqueadas.slice(0, 10).map((b) => (
                  <li key={`${b.registro}-${b.motivo}`}>
                    {b.registro}: {b.motivo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {error ? <p role="alert" className="text-sm font-medium text-danger-fg">{error}</p> : null}
        </div>
      </Dialog>
    </>
  );
}
