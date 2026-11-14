"use client";

import { Lock } from "lucide-react";

import { Badge, cn, Enlace, Select, Switch, Td, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { CanalesEvento } from "./canales-evento";
import {
  type Canal,
  type EventoComunicable,
  type Regla,
  opcionesDestinatarios,
  rutaEvento,
} from "./tipos";
import { useReglasEvento } from "./use-reglas-evento";

// En el teléfono la fila se apila (CAR-366): nombre e interruptor arriba; canales y destinatarios abajo.
const CELDA_TEL = "max-md:h-auto max-md:border-0 max-md:p-0";
const INTERRUPTOR_TEL = "max-md:col-start-3 max-md:row-start-1 max-md:justify-self-end";

/** Fila de un evento (30): canales, destinatarios y activo; los transaccionales van "Siempre". */
export function FilaEvento({ e, reglas: iniciales }: { e: EventoComunicable; reglas: Regla[] }) {
  const { reglas, de, roles, fijar, pendiente } = useReglasEvento(e, iniciales);
  const canales = e.canales.map((c) => c.canal as Canal);
  const activo = e.transaccional || reglas.some((r) => r.activa);
  return (
    <Tr className="max-md:grid max-md:grid-cols-[auto_1fr_auto] max-md:items-center max-md:gap-x-3 max-md:gap-y-2 max-md:border-b max-md:border-border max-md:px-3 max-md:py-3">
      <Td className={cn("whitespace-normal max-md:col-span-2", CELDA_TEL)}>
        <span className="flex flex-col">
          <span className="font-medium">{e.nombre}</span>
          {canales.includes("correo") ? (
            <Enlace Link={LinkNext} href={rutaEvento(e.evento)} className="text-sm">
              Editar plantilla
            </Enlace>
          ) : null}
        </span>
      </Td>
      <Td className={cn("max-md:row-start-2", CELDA_TEL)}>
        <CanalesEvento
          canales={canales}
          transaccional={e.transaccional}
          activo={(c) => Boolean(de(c)?.activa)}
          pendiente={pendiente}
          onCambiar={(c, activa) => void fijar([{ canal: c, activa }])}
        />
      </Td>
      <Td className={cn("min-w-52 max-md:col-span-2 max-md:row-start-2 max-md:min-w-0", CELDA_TEL)}>
        {e.transaccional ? (
          <span className="text-fg-muted">Su destinatario</span>
        ) : (
          <Select
            aria-label={`Destinatarios de ${e.nombre}`}
            valor={roles}
            opciones={opcionesDestinatarios(roles)}
            disabled={pendiente}
            onCambiar={(v) =>
              void fijar(
                canales.map((c) => ({ canal: c, activa: Boolean(de(c)?.activa), roles: v })),
              )
            }
          />
        )}
      </Td>
      <Td className={cn(INTERRUPTOR_TEL, CELDA_TEL)}>
        {e.transaccional ? (
          <Badge punto={false}>
            <Lock className="size-3" aria-hidden /> Siempre
          </Badge>
        ) : (
          <Switch
            soloControl
            etiqueta={`Activar ${e.nombre}`}
            activo={activo}
            disabled={pendiente}
            onCambiar={(v) => void fijar(canales.map((c) => ({ canal: c, activa: v })))}
          />
        )}
      </Td>
    </Tr>
  );
}
