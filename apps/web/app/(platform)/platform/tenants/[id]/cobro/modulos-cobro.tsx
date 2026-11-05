"use client";

import { FlaskConical, Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { esParteFinanzas } from "@opai/domain";
import { Badge, Button, Empty } from "@opai/ds";

import {
  clp,
  ESTADOS_MODULO,
  type ModuloCobro,
  type PrecioListaVista,
  TEXTO_INCLUIDO_EN_BASE,
  textoCantidad,
  textoCondicion,
} from "../../../facturacion/_componentes/cobro";
// La hoja (Radix, formulario y vista previa) se descarga al abrirla: no pesa en la ruta (ADR-037).
const HojaPrueba = dynamic(() => import("./hoja-prueba").then((m) => m.HojaPrueba));
const HojaCondicion = dynamic(() => import("./hoja-condicion").then((m) => m.HojaCondicion));

/** Cada módulo con su estado, su condición comercial y si se factura este mes (o por qué no). */
export function ModulosCobro(props: {
  tenantId: string;
  modulos: ModuloCobro[];
  /** Precio de lista por id del catálogo, con su texto. */
  listas: Record<string, { precio: PrecioListaVista; texto: string }>;
}) {
  const { tenantId, modulos, listas } = props;
  const [editando, setEditando] = useState<ModuloCobro | null>(null);
  const [probando, setProbando] = useState<ModuloCobro | null>(null);
  if (modulos.length === 0) return <Empty titulo="Aún no hay módulos registrados" />;
  return (
    <>
      <ul className="flex flex-col rounded-lg border border-border bg-surface">
        {modulos.map((m) => (
          <li
            key={m.moduloId}
            className={`grid gap-2 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-4 ${esParteFinanzas(m.moduloId) ? "md:pl-8" : ""}`}
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate text-base font-medium text-fg">{m.nombre}</span>
                {m.incluidoEnBase ? (
                  <Badge tono="info">{TEXTO_INCLUIDO_EN_BASE}</Badge>
                ) : esParteFinanzas(m.moduloId) && !m.condicion ? null : (
                  <Badge
                    tono={
                      m.estado === "activo" ? "success" : m.estado === "trial" ? "info" : "neutro"
                    }
                  >
                    {m.estado ? (ESTADOS_MODULO[m.estado] ?? m.estado) : "No contratado"}
                  </Badge>
                )}
              </span>
              {m.incluidoEnBase ? null : (
                <span className="t-caption">
                  {m.condicion
                    ? textoCondicion(m.condicion)
                    : `Sin condición comercial${listas[m.moduloId] ? ` · lista: ${listas[m.moduloId]?.texto}` : ""}`}
                </span>
              )}
            </span>
            <span className="flex flex-col md:items-end">
              {m.incluidoEnBase ? null : m.calculo.facturable ? (
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
            <span className="flex flex-wrap gap-2">
              {m.incluidoEnBase ? null : m.condicion &&
                m.moduloId !== "base" &&
                (esParteFinanzas(m.moduloId) || m.estado !== "activo") ? (
                <Button variant="secondary" onClick={() => setProbando(m)} className="md:w-auto">
                  <FlaskConical className="size-4" aria-hidden />
                  {m.estado === "trial" ? "Cambiar prueba" : "Abrir prueba"}
                </Button>
              ) : null}
              {m.incluidoEnBase ? null : (
                <Button variant="secondary" onClick={() => setEditando(m)} className="md:w-auto">
                  <Pencil className="size-4" aria-hidden />
                  {m.condicion ? "Editar" : "Fijar precio"}
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {probando ? (
        <HojaPrueba
          key={probando.moduloId}
          tenantId={tenantId}
          modulo={probando}
          onCerrar={() => setProbando(null)}
        />
      ) : null}
      {editando ? (
        <HojaCondicion
          key={editando.moduloId}
          tenantId={tenantId}
          modulo={editando}
          lista={listas[editando.moduloId]?.precio ?? null}
          onCerrar={() => setEditando(null)}
        />
      ) : null}
    </>
  );
}
