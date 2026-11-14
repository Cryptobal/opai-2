"use client";

import { RotateCw } from "lucide-react";

import { avisar, Badge, Button, Estado } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaHora } from "@/lib/formato";

import type { Entrega } from "../datos";

const ESTADO: Record<Entrega["estado"], { tono: "success" | "warning" | "danger"; texto: string }> =
  {
    ok: { tono: "success", texto: "Entregado" },
    pendiente: { tono: "warning", texto: "Reintentando" },
    error: { tono: "danger", texto: "Falló" },
  };

function detalle(e: Entrega): string {
  const respuesta = e.ultimoCodigo ? `respondió ${e.ultimoCodigo}` : (e.ultimoError ?? "");
  const intentos = e.intentos === 1 ? "1 intento" : `${e.intentos} intentos`;
  const proximo = e.proximoIntentoEn ? ` · próximo ${fechaHora(e.proximoIntentoEn)}` : "";
  return (
    [respuesta, e.intentos ? intentos : "sin intentos todavía"].filter(Boolean).join(" · ") +
    proximo
  );
}

/** Registro de entregas de un destino, con reenviar (CAR-352). Solo códigos, nunca el cuerpo. */
export function ListaEntregas({ entregas, hayMas }: { entregas: Entrega[]; hayMas: boolean }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  async function reenviar(id: string) {
    if (await ejecutar("core.webhooks.entrega_reenviar", { id })) {
      avisar.exito("Se reenvía en la próxima vuelta (unos minutos)");
    }
  }
  return (
    <Estado
      state={entregas.length === 0 ? "empty" : "ready"}
      variante="lista"
      textos={{
        vacio: {
          titulo: "Aún no hay entregas",
          descripcion: "Aparecen aquí cuando pasa alguno de los eventos elegidos.",
        },
      }}
    >
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {entregas.map((e) => (
          <li
            key={e.id}
            className="flex flex-col gap-2 border-b border-border p-4 last:border-b-0 md:flex-row md:items-center"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <Badge tono={ESTADO[e.estado].tono}>{ESTADO[e.estado].texto}</Badge>
                <span className="t-mono truncate text-sm text-fg">{e.tipo}</span>
              </span>
              <span className="t-caption">
                {fechaHora(e.createdAt)} · {detalle(e)}
              </span>
            </div>
            {e.estado !== "pendiente" ? (
              <Button variant="secondary" disabled={pendiente} onClick={() => void reenviar(e.id)}>
                <RotateCw className="size-4" />
                Reenviar
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {hayMas ? <p className="t-caption mt-2">Se muestran las 50 más recientes.</p> : null}
    </Estado>
  );
}
