"use client";

import { useState } from "react";

import { avisar, Button } from "@opai/ds";
import type { TipoArcoPortal } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaCorta } from "@/lib/formato";

import { BotonesArco, ETIQUETA_TIPO } from "./formulario-arco-dialog";
import type { Privacidad } from "./tipos";

const ESTADO: Record<string, string> = {
  recibida: "Recibida",
  en_proceso: "En proceso",
  resuelta: "Resuelta",
  rechazada: "Rechazada",
};

type Exportacion = { nombreArchivo: string; contenido: unknown };

/** Pantalla 11 · acciones ARCO: solicitar derechos y descargar portabilidad (Ley 21.719). */
export function AccionesPrivacidad({ solicitudesIniciales }: { solicitudesIniciales: Privacidad["solicitudes"] }) {
  const { ejecutar, pendiente } = useCapacidad("trabajador");
  const [solicitudes, setSolicitudes] = useState(solicitudesIniciales);

  async function descargar() {
    const r = await ejecutar<Exportacion>("portal_trabajador.mis_datos.exportar", {});
    if (!r) {
      avisar.error("No pudimos generar tu archivo. Inténtalo de nuevo.");
      return;
    }
    const blob = new Blob([JSON.stringify(r.contenido, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
    avisar.exito("Descarga iniciada.");
  }

  return (
    <>
      <BotonesArco onCreada={(s) => setSolicitudes((prev) => [s, ...prev])} />
      <Button type="button" variant="secondary" disabled={pendiente} onClick={() => void descargar()}>
        Descargar mis datos
      </Button>
      {solicitudes.length ? (
        <ul className="flex flex-col gap-2 border-t border-border pt-3">
          {solicitudes.map((s) => (
            <li key={s.id} className="flex items-baseline justify-between gap-3 text-base text-fg">
              <span>{ETIQUETA_TIPO[s.tipo as TipoArcoPortal] ?? s.tipo}</span>
              <span className="t-caption">
                {ESTADO[s.estado] ?? s.estado} · {fechaCorta(s.recibidaEn)}
                {s.plazoEn ? ` · plazo ${fechaCorta(s.plazoEn)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-fg-muted">No tienes solicitudes abiertas.</p>
      )}
    </>
  );
}
