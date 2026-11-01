"use client";

import { useMemo, useState } from "react";

import { avisar, Button, Campo, Dialog, Textarea } from "@opai/ds";
import { TIPOS_ARCO_PORTAL, type TipoArcoPortal } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { fechaCorta } from "@/lib/formato";

import type { Privacidad } from "./tipos";

const ETIQUETA_TIPO: Record<TipoArcoPortal, string> = {
  rectificacion: "Corregir mis datos",
  cancelacion: "Eliminar mis datos",
  oposicion: "Oponerme a un uso",
  bloqueo: "Bloquear el uso",
};

type SolicitudArco = {
  id: string;
  tipo: string;
  estado: string;
  recibidaEn: string;
  plazoEn: string | null;
  mensaje?: string;
};

type Exportacion = {
  nombreArchivo: string;
  contenido: unknown;
};

const ESTADO: Record<string, string> = {
  recibida: "Recibida",
  en_proceso: "En proceso",
  resuelta: "Resuelta",
  rechazada: "Rechazada",
};

/** Pantalla 11 · acciones ARCO: solicitar derechos y descargar portabilidad (Ley 21.719). */
export function AccionesPrivacidad({ solicitudesIniciales }: { solicitudesIniciales: Privacidad["solicitudes"] }) {
  const { ejecutar, pendiente } = useCapacidad("trabajador");
  const [solicitudes, setSolicitudes] = useState(solicitudesIniciales);
  const [tipo, setTipo] = useState<TipoArcoPortal | null>(null);
  const [detalle, setDetalle] = useState("");
  const [camposTexto, setCamposTexto] = useState("");

  const campos = useMemo(
    () =>
      camposTexto
        .split(/[\n,;]/)
        .map((c) => c.trim())
        .filter(Boolean),
    [camposTexto],
  );

  async function enviarSolicitud() {
    if (!tipo) return;
    const r = await ejecutar<SolicitudArco>("portal_trabajador.arco.solicitar", {
      tipo,
      detalle,
      ...(campos.length ? { campos } : {}),
    });
    if (!r) {
      avisar.error("No pudimos registrar tu solicitud. Revisa el detalle e inténtalo de nuevo.");
      return;
    }
    setSolicitudes((prev) => [
      {
        id: r.id,
        tipo: r.tipo,
        estado: r.estado,
        recibidaEn: r.recibidaEn,
        plazoEn: r.plazoEn,
      },
      ...prev,
    ]);
    setTipo(null);
    setDetalle("");
    setCamposTexto("");
    avisar.exito(r.mensaje ?? "Solicitud registrada.");
  }

  async function descargar() {
    const r = await ejecutar<Exportacion>("portal_trabajador.mis_datos.exportar");
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
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {TIPOS_ARCO_PORTAL.map((t) => (
          <Button key={t} type="button" variant="secondary" disabled={pendiente} onClick={() => setTipo(t)}>
            Solicitar {ETIQUETA_TIPO[t].toLowerCase()}
          </Button>
        ))}
        <Button type="button" variant="secondary" disabled={pendiente} onClick={() => void descargar()}>
          Descargar mis datos
        </Button>
      </div>
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
      <Dialog
        abierto={tipo !== null}
        onCerrar={() => setTipo(null)}
        titulo={tipo ? ETIQUETA_TIPO[tipo] : "Solicitud"}
        descripcion="Cuéntanos qué necesitas. Tu empresa debe responderte dentro del plazo legal."
        acciones={
          <>
            <Button type="button" variant="ghost" onClick={() => setTipo(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={pendiente || detalle.trim().length < 10} onClick={() => void enviarSolicitud()}>
              Enviar solicitud
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Campo etiqueta="Detalle" htmlFor="detalle-arco">
            <Textarea
              id="detalle-arco"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              rows={4}
              placeholder="Describe con claridad qué dato quieres corregir, eliminar, oponer o bloquear."
            />
          </Campo>
          <Campo etiqueta="Campos (opcional)" htmlFor="campos-arco">
            <Textarea
              id="campos-arco"
              value={camposTexto}
              onChange={(e) => setCamposTexto(e.target.value)}
              rows={2}
              placeholder="Teléfono, dirección, correo… (separados por coma o salto de línea)"
            />
          </Campo>
        </div>
      </Dialog>
    </>
  );
}
