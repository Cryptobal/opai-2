"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fecha, haceCuanto } from "@/lib/fechas";

import type { EstadoComercial } from "./acciones-comerciales";

/** Texto del mensaje que se abre en WhatsApp o en el correo: lo escribe la persona, el sistema no envía. */
const mensajeDe = (titulo: string, url: string) =>
  `Hola, te comparto la cotización «${titulo}»: ${url}`;

/**
 * Compartir (CPQ v4, `Compartir`): enlace público con vencimiento y vistas, WhatsApp y correo, y
 * revocar. Solo para empresas sin Portal Cliente y con el ajuste encendido. El enlace completo se
 * ve únicamente al crearlo (el servidor guarda su hash); luego solo se muestra el estado.
 * WhatsApp abre `wa.me` con el texto y el enlace; no se envía nada por API.
 */
export function HojaCompartir(p: {
  abierta: boolean;
  onCerrar: () => void;
  cotizacionId: string;
  titulo: string;
  enlace: EstadoComercial["enlace"];
  onCambio: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [copiado, setCopiado] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const activo = p.enlace && !p.enlace.vencido ? p.enlace : null;
  const texto = url ? mensajeDe(p.titulo, url) : "";

  async function crear() {
    const r = await ejecutar<{ url: string }>("cpq.compartir.crear", { cotizacionId: p.cotizacionId });
    if (r) {
      setUrl(r.url);
      avisar.exito("Enlace creado");
      p.onCambio();
    }
  }
  async function revocar() {
    const r = await ejecutar("cpq.compartir.revocar", { cotizacionId: p.cotizacionId });
    if (r) {
      avisar.exito("Enlace revocado: ya no se abre");
      setUrl(null);
      p.onCambio();
    }
  }
  async function copiar() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  return (
    <Sheet abierto={p.abierta} onCerrar={p.onCerrar} titulo="Compartir" descripcion={p.titulo}>
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {!activo ? (
          <>
            <Alerta tono="info" icono={Link2} titulo={p.enlace ? "El enlace venció" : "Aún no hay enlace"}>
              El cliente abre una página con el alcance y la venta mensual, sin costos ni margen. El
              enlace vence a los 15 días y se puede revocar.
            </Alerta>
            <Button size="lg" block disabled={pendiente} onClick={() => void crear()}>
              {pendiente ? "Creando…" : "Crear enlace"}
            </Button>
          </>
        ) : (
          <>
            <Badge tono="success" punto className="self-start">
              Activo · vence {fecha(activo.venceEn)}
            </Badge>
            {!url ? (
              <Alerta tono="info" icono={Link2} titulo="El enlace ya no se puede volver a mostrar">
                Por seguridad solo se ve al crearlo. Si necesitas compartirlo de nuevo, crea uno nuevo: el
                actual deja de abrir.
              </Alerta>
            ) : null}
            {url ? (
            <>
            <div className="flex gap-2">
              <p className="t-mono flex min-h-11 min-w-0 flex-1 items-center rounded-md border border-border bg-bg px-3 text-sm break-all">
                {url}
              </p>
              <Button variant="secondary" onClick={() => void copiar()}>
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copiado ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() =>
                  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer")
                }
              >
                WhatsApp
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.href = `mailto:?subject=${encodeURIComponent(`Cotización ${p.titulo}`)}&body=${encodeURIComponent(texto)}`;
                }}
              >
                Correo
              </Button>
            </div>
            <p className="t-caption rounded-md bg-fill p-3">«{texto}»</p>
            </>
            ) : (
              <Button variant="secondary" disabled={pendiente} onClick={() => void crear()}>
                Crear enlace nuevo
              </Button>
            )}
            <dl className="flex items-center justify-between border-b border-border pb-3">
              <dt className="t-body-sm text-fg-muted">Vistas</dt>
              <dd className="t-body-sm">
                {activo.vistas
                  ? `${activo.vistas} · última ${haceCuanto(activo.ultimaVistaEn)}`
                  : "Aún no la abre"}
              </dd>
            </dl>
            <Button variant="ghost" className="self-start text-danger-fg" disabled={pendiente} onClick={() => void revocar()}>
              Revocar enlace
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
