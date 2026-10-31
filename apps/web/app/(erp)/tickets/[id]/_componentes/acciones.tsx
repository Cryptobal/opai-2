"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Campo, Textarea } from "@opai/ds";

import { DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Ticket } from "../../_componentes/datos";

type Props = { id: string; ticket: Ticket; usuarioId: string | null };

const VIVOS = new Set(["abierto", "en_curso", "resuelto"]);

/** Comentar, cambiar estado y la aprobación de solicitudes desde la propia ficha (decisión 4). */
export function AccionesTicket({ id, ticket, usuarioId }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [comentario, setComentario] = useState("");
  const [dialogo, setDialogo] = useState<"aprobar" | "rechazar" | null>(null);
  const esResponsable = usuarioId != null && usuarioId === ticket.responsableId;
  const vivo = VIVOS.has(ticket.estado);
  const puedeAprobar = ticket.tipoRequiereAprobacion && ["abierto", "en_curso"].includes(ticket.estado);

  async function cambiarEstado(estado: "en_curso" | "resuelto" | "cerrado") {
    if (await ejecutar("tickets.tickets.cambiar_estado", { id, estado })) {
      avisar.exito("Estado actualizado");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {vivo ? (
        <div className="flex flex-wrap gap-2">
          {esResponsable && ticket.estado === "abierto" ? (
            <Button variant="secondary" disabled={pendiente} onClick={() => cambiarEstado("en_curso")}>
              Marcar en curso
            </Button>
          ) : null}
          {esResponsable && ticket.estado !== "resuelto" ? (
            <Button variant="secondary" disabled={pendiente} onClick={() => cambiarEstado("resuelto")}>
              Marcar resuelto
            </Button>
          ) : null}
          {esResponsable && ticket.estado === "resuelto" ? (
            <Button variant="primary" disabled={pendiente} onClick={() => cambiarEstado("cerrado")}>
              Cerrar
            </Button>
          ) : null}
          {puedeAprobar ? (
            <>
              <Button variant="primary" disabled={pendiente} onClick={() => setDialogo("aprobar")}>
                Aprobar
              </Button>
              <Button variant="destructive" disabled={pendiente} onClick={() => setDialogo("rechazar")}>
                Rechazar
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {vivo ? (
        <div className="flex flex-col gap-2">
          <Campo etiqueta="Agregar un comentario">
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={4000}
              rows={3}
            />
          </Campo>
          <Button
            variant="secondary"
            disabled={pendiente || comentario.trim().length < 1}
            onClick={async () => {
              if (await ejecutar("tickets.tickets.comentar", { id, comentario: comentario.trim() })) {
                setComentario("");
                avisar.exito("Comentario agregado");
                router.refresh();
              }
            }}
          >
            Comentar
          </Button>
        </div>
      ) : null}

      {dialogo ? (
        <DialogoConfirmar
          confirmacion={
            dialogo === "aprobar"
              ? { titulo: "Aprobar solicitud", descripcion: "El ticket queda resuelto.", boton: "Aprobar" }
              : {
                  titulo: "Rechazar solicitud",
                  descripcion: "Se registra el motivo en la línea de tiempo.",
                  boton: "Rechazar",
                  peligro: true,
                  motivo: true,
                }
          }
          pendiente={pendiente}
          error={error}
          onCerrar={() => {
            limpiarError();
            setDialogo(null);
          }}
          onConfirmar={async (motivo) => {
            const ok =
              dialogo === "aprobar"
                ? await ejecutar("tickets.tickets.aprobar", { id })
                : await ejecutar("tickets.tickets.rechazar", { id, motivo });
            if (ok) {
              avisar.exito(dialogo === "aprobar" ? "Solicitud aprobada" : "Solicitud rechazada");
              setDialogo(null);
              router.refresh();
            }
          }}
        />
      ) : null}
    </div>
  );
}
