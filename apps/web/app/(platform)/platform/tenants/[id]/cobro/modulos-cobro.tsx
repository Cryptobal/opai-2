"use client";

import { Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Badge, Button, Empty } from "@opai/ds";

import {
  clp,
  ESTADOS_MODULO,
  type ModuloCobro,
  textoCantidad,
  textoCondicion,
} from "../../../facturacion/_componentes/cobro";
// La hoja (Radix, formulario y vista previa) se descarga al abrirla: no pesa en la ruta (ADR-037).
const HojaCondicion = dynamic(() => import("./hoja-condicion").then((m) => m.HojaCondicion));

/** Cada módulo con su estado, su condición comercial y si se factura este mes (o por qué no). */
export function ModulosCobro({ tenantId, modulos }: { tenantId: string; modulos: ModuloCobro[] }) {
  const [editando, setEditando] = useState<ModuloCobro | null>(null);
  if (modulos.length === 0) return <Empty titulo="Aún no hay módulos registrados" />;
  return (
    <>
      <ul className="flex flex-col rounded-lg border border-border bg-surface">
        {modulos.map((m) => (
          <li
            key={m.moduloId}
            className="grid gap-2 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-4"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate text-base font-medium text-fg">{m.nombre}</span>
                <Badge
                  tono={
                    m.estado === "activo" ? "success" : m.estado === "trial" ? "info" : "neutro"
                  }
                >
                  {m.estado ? (ESTADOS_MODULO[m.estado] ?? m.estado) : "No contratado"}
                </Badge>
              </span>
              <span className="t-caption">
                {m.condicion ? textoCondicion(m.condicion) : "Sin condición comercial"}
              </span>
            </span>
            <span className="flex flex-col md:items-end">
              {m.calculo.facturable ? (
                <>
                  <span className="t-numeric text-base font-semibold text-fg">
                    {clp(m.calculo.montoClp)}
                  </span>
                  {m.calculo.cantidad !== null ? (
                    <span className="t-caption">
                      {textoCantidad(m.calculo.cantidad, m.condicion?.unidad ?? null)}
                    </span>
                  ) : null}
                  <span className="t-caption">
                    {m.calculo.diasCobrados < m.calculo.diasMes
                      ? `${m.calculo.diasCobrados} de ${m.calculo.diasMes} días`
                      : "Mes completo"}
                  </span>
                </>
              ) : (
                <span className="t-caption">{m.calculo.motivoTexto}</span>
              )}
            </span>
            <Button variant="secondary" onClick={() => setEditando(m)} className="md:w-auto">
              <Pencil className="size-4" aria-hidden />
              {m.condicion ? "Editar" : "Fijar precio"}
            </Button>
          </li>
        ))}
      </ul>
      {editando ? (
        <HojaCondicion
          key={editando.moduloId}
          tenantId={tenantId}
          modulo={editando}
          onCerrar={() => setEditando(null)}
        />
      ) : null}
    </>
  );
}
