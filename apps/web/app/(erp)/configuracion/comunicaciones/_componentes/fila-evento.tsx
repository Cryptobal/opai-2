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
    <Tr>
      <Td className="whitespace-normal">
        <span className="flex flex-col">
          <span className="font-medium">{e.nombre}</span>
          {canales.includes("correo") ? (
            <Enlace Link={LinkNext} href={rutaEvento(e.evento)} className="text-sm">
              Editar plantilla
            </Enlace>
          ) : null}
        </span>
      </Td>
      <Td>
        <span className="flex gap-1.5">
          {canales.map((c) => {
            const I = ICONO[c];
            const on = e.transaccional || Boolean(de(c)?.activa);
            return (
              <Button
                key={c}
                variant="ghost"
                size="icon"
                aria-label={`${NOMBRE_CANAL[c]}: ${on ? "activo" : "apagado"}`}
                aria-pressed={on}
                disabled={e.transaccional || pendiente}
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
      <Td className="min-w-52">
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
      <Td>
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
