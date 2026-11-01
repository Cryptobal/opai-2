"use client";

import { useState } from "react";

import { avisar, Button, Campo, Dialog, Textarea } from "@opai/ds";
import { TIPOS_ARCO_PORTAL, type TipoArcoPortal } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";

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

export function BotonesArco({
  onCreada,
}: {
  onCreada: (s: { id: string; tipo: string; estado: string; recibidaEn: string; plazoEn: string | null }) => void;
}) {
  const { ejecutar, pendiente } = useCapacidad("trabajador");
  const [tipo, setTipo] = useState<TipoArcoPortal | null>(null);
  const [detalle, setDetalle] = useState("");
  const [camposTexto, setCamposTexto] = useState("");

  async function enviar() {
    if (!tipo) return;
    const campos = camposTexto
      .split(/[\n,;]/)
      .map((c) => c.trim())
      .filter(Boolean);
    const r = await ejecutar<SolicitudArco>("portal_trabajador.arco.solicitar", {
      tipo,
      detalle,
      ...(campos.length ? { campos } : {}),
    });
    if (!r) {
      avisar.error("No pudimos registrar tu solicitud. Revisa el detalle e inténtalo de nuevo.");
      return;
    }
    onCreada({ id: r.id, tipo: r.tipo, estado: r.estado, recibidaEn: r.recibidaEn, plazoEn: r.plazoEn });
    setTipo(null);
    setDetalle("");
    setCamposTexto("");
    avisar.exito(r.mensaje ?? "Solicitud registrada.");
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {TIPOS_ARCO_PORTAL.map((t) => (
          <Button key={t} type="button" variant="secondary" disabled={pendiente} onClick={() => setTipo(t)}>
            Solicitar {ETIQUETA_TIPO[t].toLowerCase()}
          </Button>
        ))}
      </div>
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
            <Button type="button" disabled={pendiente || detalle.trim().length < 10} onClick={() => void enviar()}>
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

export { ETIQUETA_TIPO };
