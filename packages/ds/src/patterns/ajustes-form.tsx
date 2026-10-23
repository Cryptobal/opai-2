"use client";

import { useMemo, useState } from "react";

import { Alerta } from "../acceso/alerta";
import { cn } from "../cn";
import { Button } from "../components/button";
import { CampoAjusteControl, type CampoAjusteVista } from "./ajustes-campo";

export type { CampoAjusteVista } from "./ajustes-campo";

type Props = {
  campos: readonly CampoAjusteVista[];
  /** Valor efectivo y origen por clave (`modulo.clave`). */
  valores: Readonly<Record<string, { valor: unknown; origen: string }>>;
  onGuardar: (cambios: { modulo: string; clave: string; valor: unknown }[]) => Promise<boolean>;
  /** Vuelve al valor por defecto (borra el valor de la empresa o del usuario). */
  onRestablecer?: (campo: CampoAjusteVista) => Promise<void>;
  pendiente?: boolean;
  error?: string | null;
};

const claveDe = (c: CampoAjusteVista) => `${c.modulo}.${c.clave}`;

/**
 * Ajustes renderizados desde el esquema (`core.config.schema`, ADR-018/038): secciones por grupo,
 * etiqueta, control y ayuda; "Restablecer" por campo; "Fijado por OPAI" en los de plataforma;
 * "Guardar" fijo al pie en teléfono.
 */
export function AjustesForm({
  campos,
  valores,
  onGuardar,
  onRestablecer,
  pendiente,
  error,
}: Props) {
  const [borrador, setBorrador] = useState<Record<string, unknown>>({});
  const grupos = useMemo(() => {
    const m = new Map<string, CampoAjusteVista[]>();
    for (const c of campos)
      m.set(c.grupo ?? "General", [...(m.get(c.grupo ?? "General") ?? []), c]);
    return [...m.entries()];
  }, [campos]);
  const cambios = Object.keys(borrador).length;
  return (
    <form
      className="flex flex-col gap-4 pb-24 md:pb-0"
      onSubmit={async (e) => {
        e.preventDefault();
        const lista = campos
          .filter((c) => claveDe(c) in borrador)
          .map((c) => ({ modulo: c.modulo, clave: c.clave, valor: borrador[claveDe(c)] }));
        if (await onGuardar(lista)) setBorrador({});
      }}
    >
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {grupos.map(([grupo, lista]) => (
        <section key={grupo} className="rounded-lg border border-border bg-surface">
          <h3 className="t-subheading border-b border-border px-4 py-3 text-fg">{grupo}</h3>
          <div className="flex flex-col divide-y divide-border px-4">
            {lista.map((c) => {
              const k = claveDe(c);
              const efectivo = valores[k];
              return (
                <CampoAjusteControl
                  key={k}
                  campo={c}
                  valor={k in borrador ? borrador[k] : efectivo?.valor}
                  origen={efectivo?.origen ?? "defecto"}
                  modificado={k in borrador}
                  onCambiar={(v) => setBorrador((b) => ({ ...b, [k]: v }))}
                  {...(onRestablecer
                    ? {
                        onRestablecer: async () => {
                          setBorrador(({ [k]: _, ...resto }) => resto);
                          await onRestablecer(c);
                        },
                      }
                    : {})}
                />
              );
            })}
          </div>
        </section>
      ))}
      {campos.some((c) => c.editable) ? (
        <div
          className={cn(
            cambios ? "flex" : "hidden md:flex",
            "fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-10 gap-2 border-t border-border bg-surface-raised px-4 py-3 md:static md:justify-end md:border-0 md:bg-transparent md:p-0",
          )}
        >
          {cambios ? (
            <Button
              variant="secondary"
              className="h-12 flex-1 md:h-10 md:flex-none"
              onClick={() => setBorrador({})}
            >
              Descartar
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={!cambios || pendiente}
            className="h-12 flex-1 md:h-10 md:flex-none"
          >
            {pendiente
              ? "Guardando…"
              : cambios
                ? `Guardar ${cambios === 1 ? "cambio" : `${cambios} cambios`}`
                : "Guardar"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
