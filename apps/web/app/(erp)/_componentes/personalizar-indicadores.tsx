"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { avisar, Button } from "@opai/ds";
import { INDICADORES_INICIO, type IndicadorInicio } from "@opai/domain";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

const NOMBRES: Record<IndicadorInicio, string> = {
  cobertura: "Cobertura hoy",
  negocios: "Negocios abiertos",
  facturado: "Facturado del mes",
  tickets: "Tickets",
};

/**
 * «Personalizar» del Inicio nuevo (ADR-109, CAR-335 D3; prototipo `export-diseno-nuevo`): fichas para
 * agregar o quitar indicadores. La elección es de la empresa (`core.inicio_indicadores`) y vale para
 * todo el equipo; solo se ofrece a quien puede cambiar la configuración.
 */
export function PersonalizarIndicadores({ elegidos }: { elegidos: readonly string[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<readonly string[]>(elegidos);
  const [pendiente, iniciar] = useTransition();
  const panel = useId();
  const alternar = (id: string) => {
    const nueva = lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
    if (nueva.length === 0) return avisar.error("Deja al menos un indicador.");
    const anterior = lista;
    setLista(nueva);
    iniciar(async () => {
      const r = await ejecutarCapacidad("erp", "core.config.set", {
        modulo: "core",
        clave: "inicio_indicadores",
        valor: nueva,
      }).catch(() => ({ ok: false }) as const);
      if (!r.ok) {
        setLista(anterior);
        avisar.error("No pudimos guardar los indicadores. Reintenta.");
        return;
      }
      router.refresh();
    });
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="t-caption text-fg-muted">Indicadores de tu empresa</span>
        <Button
          variant="secondary"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls={panel}
        >
          {abierto ? "Listo" : "Personalizar"}
        </Button>
      </div>
      {abierto ? (
        <div
          id={panel}
          className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3"
        >
          <p className="t-caption text-fg-muted">
            Lo que elijas aquí lo ve todo tu equipo. Toca para agregar o quitar.
          </p>
          <div className="flex flex-wrap gap-2" aria-busy={pendiente}>
            {INDICADORES_INICIO.map((id) => {
              const activo = lista.includes(id);
              return (
                <Button
                  key={id}
                  variant={activo ? "secondary" : "ghost"}
                  aria-pressed={activo}
                  disabled={pendiente}
                  onClick={() => alternar(id)}
                >
                  <span aria-hidden>{activo ? "✓" : "+"}</span>
                  {NOMBRES[id]}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
