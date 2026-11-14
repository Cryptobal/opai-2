"use client";

import { Inbox, Lock, Mail } from "lucide-react";
import { useState } from "react";

import { avisar, Badge, Button, cn, Enlace, Select, Switch, Td, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { useCapacidad } from "@/app/_components/use-capacidad";

import {
  type Canal,
  DESTINATARIOS,
  type EventoComunicable,
  NOMBRE_CANAL,
  type Regla,
  rutaEvento,
} from "./tipos";

const ICONO = { correo: Mail, inapp: Inbox } as const;
// En el teléfono la fila se apila (CAR-366): nombre e interruptor arriba; canales y destinatarios abajo.
const CELDA_TEL = "max-md:h-auto max-md:border-0 max-md:p-0";

/** Fila de un evento (30): canales, destinatarios y activo; los transaccionales van "Siempre". */
export function FilaEvento({ e, reglas: iniciales }: { e: EventoComunicable; reglas: Regla[] }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  // Estado optimista: se actualiza con cada regla guardada (el refresco del servidor llega después).
  const [reglas, setReglas] = useState(iniciales);
  const canales = e.canales.map((c) => c.canal as Canal);
  const de = (c: Canal) => reglas.find((r) => r.canal === c);
  const roles = (reglas[0]?.roles.length ? reglas[0].roles : ["owner", "admin"]).join(",");
  const activo = e.transaccional || reglas.some((r) => r.activa);
  async function fijar(cambios: { canal: Canal; activa: boolean; roles?: string }[]) {
    for (const c of cambios) {
      const r = await ejecutar<Regla>("core.notificacion_reglas.set", {
        evento: e.evento,
        canal: c.canal,
        roles: (c.roles ?? roles).split(","),
        usuarios: de(c.canal)?.usuarios ?? [],
        activa: c.activa,
      });
      if (!r) return avisar.error("No se pudo guardar el aviso");
      setReglas((x) => [...x.filter((y) => y.canal !== c.canal), r]);
    }
    avisar.exito("Aviso actualizado");
  }
  const opciones = DESTINATARIOS.some((d) => d.valor === roles)
    ? DESTINATARIOS
    : [...DESTINATARIOS, { valor: roles, etiqueta: "Personalizado" }];
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
        <span className="flex gap-1.5">
          {canales.map((c) => {
            const I = ICONO[c];
            const on = e.transaccional || Boolean(de(c)?.activa);
            // Los transaccionales no se pueden apagar: el canal se muestra, no es un botón.
            if (e.transaccional)
              return (
                <span
                  key={c}
                  title={NOMBRE_CANAL[c]}
                  className="grid size-9 place-items-center rounded-md border border-border-strong text-fg"
                >
                  <I className="size-4" aria-label={NOMBRE_CANAL[c]} role="img" />
                </span>
              );
            return (
              <Button
                key={c}
                variant="ghost"
                size="icon"
                aria-label={`${NOMBRE_CANAL[c]}: ${on ? "activo" : "apagado"}`}
                aria-pressed={on}
                disabled={pendiente}
                onClick={() => void fijar([{ canal: c, activa: !on }])}
                className={cn(
                  "rounded-md border",
                  on
                    ? "border-border-strong text-fg"
                    : "border-dashed border-border text-fg-subtle",
                )}
              >
                <I className="size-4" />
              </Button>
            );
          })}
        </span>
      </Td>
      <Td className={cn("min-w-52 max-md:col-span-2 max-md:row-start-2 max-md:min-w-0", CELDA_TEL)}>
        {e.transaccional ? (
          <span className="text-fg-muted">Su destinatario</span>
        ) : (
          <Select
            aria-label={`Destinatarios de ${e.nombre}`}
            valor={roles}
            opciones={opciones}
            disabled={pendiente}
            onCambiar={(v) =>
              void fijar(
                canales.map((c) => ({ canal: c, activa: Boolean(de(c)?.activa), roles: v })),
              )
            }
          />
        )}
      </Td>
      <Td
        className={cn("max-md:col-start-3 max-md:row-start-1 max-md:justify-self-end", CELDA_TEL)}
      >
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
