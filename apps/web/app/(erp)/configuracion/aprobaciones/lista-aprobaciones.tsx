"use client";

import { Check, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Badge, BarraSeleccion, Button, Checkbox, cn } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { haceCuanto } from "@/lib/fechas";

import { type Aprobacion, ESTADO, quien, RIESGO, venceEn } from "./tipos";
import { DialogoRechazar } from "./rechazar";
import { useResolver } from "./use-resolver";

type Props = { items: Aprobacion[]; ver: string | undefined; ahora: number };

/** Bandeja (44): selección múltiple, riesgo, vencimiento y aprobar/rechazar en la fila o en bloque. */
export function ListaAprobaciones({ items, ver, ahora }: Props) {
  const sp = useSearchParams();
  const [sel, setSel] = useState<Set<string>>(() => new Set());
  const [rechazando, setRechazando] = useState<string[] | null>(null);
  const r = useResolver();
  const href = (id: string) => {
    const q = new URLSearchParams(sp.toString());
    q.set("ver", id);
    return `?${q.toString()}`;
  };
  const marcar = (id: string, m: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      if (m) n.add(id);
      else n.delete(id);
      return n;
    });
  const pendientes = items.filter((a) => a.estado === "pendiente");
  const todas = pendientes.length > 0 && pendientes.every((a) => sel.has(a.id));
  return (
    <>
      {pendientes.length ? (
        <div className="flex min-h-12 items-center border-b border-border px-4">
          <Checkbox
            etiqueta="Todas"
            marcado={todas}
            onCambiar={(m) => setSel(m ? new Set(pendientes.map((a) => a.id)) : new Set())}
          />
        </div>
      ) : null}
      <ul className="flex flex-col">
        {items.map((a) => {
          const activa = a.id === ver;
          const pend = a.estado === "pendiente";
          return (
            <li
              key={a.id}
              className={cn(
                "relative flex gap-3 border-b border-border px-4 py-3",
                (activa || sel.has(a.id)) && "bg-accent-muted",
                activa &&
                  "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-[3px] before:bg-accent before:content-['']",
              )}
            >
              {pend ? (
                <Checkbox
                  soloControl
                  etiqueta={`Seleccionar ${a.resumen}`}
                  marcado={sel.has(a.id)}
                  onCambiar={(m) => marcar(a.id, m)}
                />
              ) : null}
              <LinkNext
                href={href(a.id)}
                className="flex min-w-0 flex-1 flex-col gap-1 outline-none focus-visible:outline-2 focus-visible:outline-focus"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tono={RIESGO[a.riesgo].tono}>{RIESGO[a.riesgo].etiqueta}</Badge>
                  <span className="t-caption">
                    {pend ? venceEn(a.venceEn, ahora) : ESTADO[a.estado].etiqueta}
                  </span>
                </span>
                <span className="text-base font-semibold text-fg">{a.resumen}</span>
                <span className="t-caption">
                  {quien(a)} · {haceCuanto(a.creadaEn)}
                </span>
              </LinkNext>
              {pend ? (
                <span className="flex flex-none items-start gap-1.5">
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Rechazar"
                    onClick={() => setRechazando([a.id])}
                  >
                    <X className="size-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Aprobar"
                    disabled={r.pendiente}
                    onClick={() => void r.aprobar([a.id])}
                  >
                    <Check className="size-4" />
                  </Button>
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {sel.size ? (
        <BarraSeleccion texto={`${sel.size} ${sel.size === 1 ? "seleccionada" : "seleccionadas"}`}>
          <Button
            variant="ghost"
            className="text-inverse-fg"
            onClick={() => setRechazando([...sel])}
          >
            Rechazar
          </Button>
          <Button
            disabled={r.pendiente}
            onClick={async () => {
              if (await r.aprobar([...sel])) setSel(new Set());
            }}
          >
            Aprobar {sel.size}
          </Button>
        </BarraSeleccion>
      ) : null}
      <DialogoRechazar
        abierto={rechazando !== null}
        cantidad={rechazando?.length ?? 0}
        pendiente={r.pendiente}
        error={r.error}
        onCerrar={() => setRechazando(null)}
        onRechazar={async (motivo) => {
          if (rechazando && (await r.rechazar(rechazando, motivo))) {
            setRechazando(null);
            setSel(new Set());
          }
        }}
      />
    </>
  );
}
