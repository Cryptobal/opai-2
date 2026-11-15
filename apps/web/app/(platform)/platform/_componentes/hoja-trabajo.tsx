"use client";

import { RefreshCw } from "lucide-react";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Dialog, Sheet } from "@opai/ds";

import { etiquetaCapacidad } from "@/app/(erp)/configuracion/auditoria/_componentes/capacidad";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaHora } from "@/lib/formato";

import type { Trabajo } from "../tenants/[id]/tipos";

/**
 * Detalle de un trabajo (51): error e intentos; reintentar un fallido o descartar un pendiente. El
 * payload no se muestra: la capacidad no lo entrega (CAR-40). Descartar es irreversible y confirma.
 */
export function HojaTrabajo({ trabajos }: { trabajos: Trabajo[] }) {
  const hoja = useHojaUrl("ver");
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const [confirmar, setConfirmar] = useState(false);
  const t = trabajos.find((x) => `${x.tenantId}:${x.id}` === hoja.valor);
  async function correr(
    id: "platform.trabajos.reintentar" | "platform.trabajos.cancelar",
    exito: string,
  ) {
    if (!t) return;
    if (await ejecutar(id, { tenantId: t.tenantId, trabajoId: t.id })) {
      avisar.exito(exito);
      setConfirmar(false);
      hoja.cerrar();
    }
  }
  const reintentable = t?.estado === "fallido" || t?.estado === "cancelado";
  return (
    <Sheet
      abierto={hoja.abierta && Boolean(t)}
      onCerrar={hoja.cerrar}
      titulo={t ? etiquetaCapacidad(t.tipo) : "Trabajo"}
      descripcion={t ? `${t.empresa} · ${t.estado}` : ""}
      acciones={
        t ? (
          <>
            {t.estado === "pendiente" ? (
              <Button variant="secondary" disabled={pendiente} onClick={() => setConfirmar(true)}>
                Descartar
              </Button>
            ) : (
              <Button variant="secondary" onClick={hoja.cerrar}>
                Cerrar
              </Button>
            )}
            {reintentable ? (
              <Button
                disabled={pendiente}
                onClick={() =>
                  void correr("platform.trabajos.reintentar", "Trabajo en cola de nuevo")
                }
              >
                <RefreshCw className="size-4" aria-hidden /> Reintentar ahora
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {t ? (
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          {t.ultimoError ? <Alerta tono="danger" titulo={t.ultimoError} /> : null}
          <div className="flex flex-wrap items-center gap-2 text-base text-fg">
            <Badge tono={t.estado === "fallido" ? "danger" : t.intentos ? "warning" : "neutro"}>
              Intento {t.intentos} de {t.maxIntentos}
            </Badge>
            <span className="t-caption">
              Programado {fechaHora(t.programadoPara)} · actualizado {fechaHora(t.actualizadoEn)}
            </span>
          </div>
        </div>
      ) : null}
      <Dialog
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo="¿Descartar el trabajo?"
        descripcion="No se va a ejecutar y no se puede deshacer."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendiente}
              onClick={() => void correr("platform.trabajos.cancelar", "Trabajo descartado")}
            >
              Descartar
            </Button>
          </>
        }
      />
    </Sheet>
  );
}
